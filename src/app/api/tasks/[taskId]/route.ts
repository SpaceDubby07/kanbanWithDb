import { db } from '@/db';
import { tasks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

interface Updates {
  listId?: string;
  content?: string;
  order?: number;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;
  const body = await request.json();
  const { listId, content, order } = body;

  const updates: Updates = {};
  if (listId) updates.listId = listId;
  if (content !== undefined) updates.content = content;
  if (order !== undefined) updates.order = order;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No updates provided' },
      { status: 400 },
    );
  }

  const [updated] = await db
    .update(tasks)
    .set(updates)
    .where(eq(tasks.id, taskId))
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: 'Task not found' },
      { status: 404 },
    );
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;

  await db.delete(tasks).where(eq(tasks.id, taskId));

  return NextResponse.json({ success: true });
}
