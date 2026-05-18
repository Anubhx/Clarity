/**
 * GET /api/integrations/google-drive/auth
 * Generates the Google OAuth2 URL for Drive access
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
].join(" ");

export async function GET(): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google-drive/callback`;

  if (!clientId) {
    return NextResponse.json(
      {
        error: "Google Drive integration is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local.",
      },
      { status: 501 }
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: userId, // Pass userId through OAuth flow
  });

  const url = `${GOOGLE_AUTH_URL}?${params.toString()}`;

  return NextResponse.json({ url });
}
