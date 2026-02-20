import { db } from '@/db';
import { lists } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { boardId, title } = body;

    if (!boardId || !title?.trim()) {
      return NextResponse.json(
        { error: 'Board ID and title are required' },
        { status: 400 },
      );
    }

    // Get current max order for this board
    const maxOrderResult = await db
      .select({ order: lists.order })
      .from(lists)
      .where(eq(lists.boardId, boardId))
      .orderBy(desc(lists.order))
      .limit(1);

    const newOrder = (maxOrderResult[0]?.order || 0) + 1;

    const [newList] = await db
      .insert(lists)
      .values({
        boardId,
        title: title.trim(),
        order: newOrder,
      })
      .returning({
        id: lists.id,
        title: lists.title,
        order: lists.order,
        boardId: lists.boardId,
      });

    return NextResponse.json(newList);
  } catch (error) {
    console.error('Create list error:', error);
    return NextResponse.json(
      { error: 'Failed to create list' },
      { status: 500 },
    );
  }
}
