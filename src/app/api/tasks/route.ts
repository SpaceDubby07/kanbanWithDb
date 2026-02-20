import { db } from '@/db';
import { tasks } from '@/db/schema';
import { asc, desc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { listId, content } = body;

    if (!listId || !content?.trim()) {
      return NextResponse.json(
        { error: 'List ID and content are required' },
        { status: 400 },
      );
    }

    const maxOrder = await db
      .select({ order: tasks.order })
      .from(tasks)
      .where(eq(tasks.listId, listId))
      .orderBy(desc(tasks.order))
      .limit(1);

    const newOrder = (maxOrder[0]?.order || 0) + 1;

    const [newTask] = await db
      .insert(tasks)
      .values({
        listId,
        content: content.trim(),
        order: newOrder,
      })
      .returning({
        id: tasks.id,
        content: tasks.content,
        order: tasks.order,
      });

    return NextResponse.json(newTask);
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const listId = request.nextUrl.searchParams.get('listId');

  if (!listId) {
    return NextResponse.json(
      { error: 'List ID is required' },
      { status: 400 },
    );
  }

  const taskList = await db
    .select()
    .from(tasks)
    .where(eq(tasks.listId, listId))
    .orderBy(asc(tasks.order));

  return NextResponse.json(taskList);
}
