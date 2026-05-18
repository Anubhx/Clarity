/**
 * DELETE /api/documents/[id]
 * Deletes a specific document and its chunks
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getServerSupabase } from "@/lib/supabase";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  const docId = resolvedParams.id;
  if (!docId) {
    return NextResponse.json({ error: "Missing document ID" }, { status: 400 });
  }

  const supabase = getServerSupabase();

  try {
    // 1. Verify document belongs to user
    const { data: doc, error: fetchError } = await supabase
      .from("documents")
      .select("id")
      .eq("id", docId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // 2. Delete chunks first (foreign key constraint)
    const { error: chunksError } = await supabase
      .from("document_chunks")
      .delete()
      .eq("doc_id", docId);

    if (chunksError) throw chunksError;

    // 3. Delete the document record
    const { error: docsError } = await supabase
      .from("documents")
      .delete()
      .eq("id", docId);

    if (docsError) throw docsError;

    console.log(`[DeleteDoc] Deleted document ${docId} for user ${userId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[DeleteDoc] Error:", msg);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
