// app/api/lists/[listId]/route.ts
import { db } from '@/db';
import { lists } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> },
) {
  const { listId } = await params;

  try {
    const [deleted] = await db
      .delete(lists)
      .where(eq(lists.id, listId))
      .returning({ id: lists.id });

    if (!deleted) {
      return NextResponse.json(
        { error: 'List not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, listId: deleted.id });
  } catch (error) {
    console.error('Delete list error:', error);
    return NextResponse.json(
      { error: 'Failed to delete list' },
      { status: 500 },
    );
  }
}
