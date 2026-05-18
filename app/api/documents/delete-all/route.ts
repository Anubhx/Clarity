/**
 * DELETE /api/documents/delete-all
 * Removes all document records and chunks for the authenticated user
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getServerSupabase } from "@/lib/supabase";

export async function DELETE(): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServerSupabase();

  try {
    // Get all document IDs for this user
    const { data: docs, error: fetchError } = await supabase
      .from("documents")
      .select("id")
      .eq("user_id", userId);

    if (fetchError) throw fetchError;

    const docIds = (docs || []).map((d: { id: string }) => d.id);

    if (docIds.length > 0) {
      // Delete chunks first (foreign key constraint)
      const { error: chunksError } = await supabase
        .from("document_chunks")
        .delete()
        .in("doc_id", docIds);

      if (chunksError) throw chunksError;

      // Delete documents
      const { error: docsError } = await supabase
        .from("documents")
        .delete()
        .eq("user_id", userId);

      if (docsError) throw docsError;
    }

    console.log(`[DeleteAll] Deleted ${docIds.length} documents for user ${userId}`);

    return NextResponse.json({
      success: true,
      deleted: docIds.length,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[DeleteAll] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
