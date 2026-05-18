/**
 * GET /api/integrations/google-drive/callback
 * Handles the OAuth callback from Google, exchanges code for tokens,
 * then redirects to the Drive file picker UI
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL(
        `/settings?tab=integrations&error=${encodeURIComponent(error || "No code returned")}`,
        request.url
      )
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google-drive/callback`;

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokenRes.ok || tokens.error) {
      throw new Error(tokens.error_description || "Token exchange failed");
    }

    // Store tokens in a cookie for the file picker
    const accessToken = tokens.access_token as string;

    // Redirect to Drive picker page with token in session
    const response = NextResponse.redirect(
      new URL(`/integrations/google-drive/picker`, request.url)
    );

    // Set short-lived cookie with access token
    response.cookies.set("gdrive_access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600, // 1 hour
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[GoogleDrive] OAuth callback error:", err);
    return NextResponse.redirect(
      new URL(`/settings?tab=integrations&error=oauth_failed`, request.url)
    );
  }
}
