import { db } from '@/db';
import { users, boards, lists, tasks } from '@/db/schema';
import { asc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username');

  if (!username) {
    return NextResponse.json(
      { error: 'Username required' },
      { status: 400 },
    );
  }

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 },
    );
  }

  const joinedData = await db
    .select({
      boardId: boards.id,
      boardName: boards.title,
      listId: lists.id,
      listTitle: lists.title,
      listOrder: lists.order,
      taskId: tasks.id,
      taskContent: tasks.content,
      taskOrder: tasks.order,
    })
    .from(boards)
    .leftJoin(lists, eq(lists.boardId, boards.id))
    .leftJoin(tasks, eq(tasks.listId, lists.id))
    .where(eq(boards.userId, user.id))
    .orderBy(
      asc(boards.createdAt),
      asc(lists.order),
      asc(tasks.order),
    );

  return NextResponse.json(joinedData);
}
