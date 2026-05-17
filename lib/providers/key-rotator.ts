/**
 * KeyRotator — Generic key rotation with cooldown & audit logging
 *
 * Features:
 *   - Round-robin load balancing
 *   - Per-key cooldown tracking (rate limits → 60s, auth errors → permanent)
 *   - Automatic retry after cooldown expires
 *   - Detailed audit logging per call
 */

import type { KeyStatus } from "./types";

interface KeyState {
  key: string;
  index: number;
  state: "available" | "cooldown" | "exhausted";
  lastError: string;
  lastStatus: number;
  cooldownUntil: number;
  totalCalls: number;
  totalFailures: number;
}

/** Cooldown durations by HTTP status */
const COOLDOWN_MS: Record<number, number> = {
  429: 60_000,   // Rate limit → 60s cooldown
  401: Infinity, // Auth error → permanent until restart
  402: Infinity, // Payment required → permanent until restart
  403: Infinity, // Forbidden → permanent until restart
  500: 30_000,   // Server error → 30s cooldown
  503: 30_000,   // Service unavailable → 30s cooldown
};

export class KeyRotator {
  private keys: KeyState[];
  private currentIndex: number = 0;
  private providerId: string;

  constructor(providerId: string, keys: string[]) {
    this.providerId = providerId;
    this.keys = keys.map((key, index) => ({
      key,
      index,
      state: "available",
      lastError: "",
      lastStatus: 0,
      cooldownUntil: 0,
      totalCalls: 0,
      totalFailures: 0,
    }));

    if (this.keys.length > 0) {
      console.log(`[${providerId}] Loaded ${this.keys.length} API keys`);
    }
  }

  /** Get the next available key, checking cooldowns */
  getNextKey(): { key: string; index: number } | null {
    if (this.keys.length === 0) return null;

    const now = Date.now();

    // First pass: check if any cooled-down keys can be restored
    for (const ks of this.keys) {
      if (ks.state === "cooldown" && now >= ks.cooldownUntil) {
        ks.state = "available";
        console.log(
          `[${this.providerId}] Key index ${ks.index} cooldown expired, restored to available`
        );
      }
    }

    // Find next available key using round-robin
    for (let i = 0; i < this.keys.length; i++) {
      const idx = (this.currentIndex + i) % this.keys.length;
      const ks = this.keys[idx];
      if (ks.state === "available") {
        this.currentIndex = (idx + 1) % this.keys.length;
        ks.totalCalls++;
        return { key: ks.key, index: ks.index };
      }
    }

    return null; // All keys exhausted or in cooldown
  }

  /** Mark a key as failed with appropriate cooldown */
  markFailed(index: number, httpStatus: number, errorMessage: string): void {
    const ks = this.keys[index];
    if (!ks) return;

    ks.totalFailures++;
    ks.lastError = errorMessage.slice(0, 150);
    ks.lastStatus = httpStatus;

    const cooldown = COOLDOWN_MS[httpStatus] || 10_000;

    if (cooldown === Infinity) {
      ks.state = "exhausted";
      ks.cooldownUntil = Infinity;
      console.log(
        `[${this.providerId}] Key index ${index} EXHAUSTED (HTTP ${httpStatus}). ` +
          `${this.availableCount}/${this.keys.length} remaining.`
      );
    } else {
      ks.state = "cooldown";
      ks.cooldownUntil = Date.now() + cooldown;
      console.log(
        `[${this.providerId}] Key index ${index} → cooldown ${cooldown / 1000}s (HTTP ${httpStatus}). ` +
          `${this.availableCount}/${this.keys.length} remaining.`
      );
    }
  }

  /** Mark a key as successful (resets failure state) */
  markSuccess(index: number): void {
    const ks = this.keys[index];
    if (!ks) return;
    // Keep the key available — don't reset counters (for audit)
    ks.state = "available";
  }

  get keyCount(): number {
    return this.keys.length;
  }

  get availableCount(): number {
    const now = Date.now();
    return this.keys.filter(
      (ks) =>
        ks.state === "available" ||
        (ks.state === "cooldown" && now >= ks.cooldownUntil)
    ).length;
  }

  getStatus(): KeyStatus[] {
    const now = Date.now();
    return this.keys.map((ks) => ({
      index: ks.index,
      state:
        ks.state === "cooldown" && now >= ks.cooldownUntil
          ? "available"
          : ks.state,
      lastError: ks.lastError || undefined,
      lastStatus: ks.lastStatus || undefined,
      cooldownUntil:
        ks.state === "cooldown" && ks.cooldownUntil !== Infinity
          ? ks.cooldownUntil
          : undefined,
      totalCalls: ks.totalCalls,
      totalFailures: ks.totalFailures,
    }));
  }
}
