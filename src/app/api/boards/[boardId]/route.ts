// app/api/boards/[boardId]/route.ts
import { db } from '@/db';
import { boards, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ boardId: string }> }, // ← Promise type
) {
  // Await the params Promise here
  const params = await context.params;
  const boardId = params.boardId;

  console.log(`DELETE request received for boardId: ${boardId}`);

  const username = request.nextUrl.searchParams.get('username');
  console.log(`Username from query: ${username}`);

  if (!username) {
    console.log('Missing username param');
    return NextResponse.json(
      { error: 'Username is required' },
      { status: 400 },
    );
  }

  if (!boardId) {
    console.log('Missing boardId in params');
    return NextResponse.json(
      { error: 'Board ID is required' },
      { status: 400 },
    );
  }

  try {
    console.log(`Looking up user: ${username}`);
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user) {
      console.log(`User not found: ${username}`);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 },
      );
    }
    console.log(`User found with id: ${user.id}`);

    console.log(`Checking board ownership for boardId: ${boardId}`);
    const [board] = await db
      .select()
      .from(boards)
      .where(and(eq(boards.id, boardId), eq(boards.userId, user.id)))
      .limit(1);

    if (!board) {
      console.log(`Board not found or not owned by user`);
      return NextResponse.json(
        { error: 'Board not found or access denied' },
        { status: 404 },
      );
    }
    console.log(`Board found: ${board.title} (id: ${board.id})`);

    console.log(`Executing delete on boardId: ${boardId}`);
    await db.delete(boards).where(eq(boards.id, boardId));
    console.log(`Delete successful for boardId: ${boardId}`);

    return NextResponse.json(
      { message: 'Board deleted successfully', boardId },
      { status: 200 },
    );
  } catch (error) {
    console.error('DELETE /api/boards/[boardId] failed:', error);
    return NextResponse.json(
      { error: 'Internal server error during delete' },
      { status: 500 },
    );
  }
}
