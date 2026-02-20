// app/api/boards/route.ts
import { db } from '@/db';
import { users, boards, lists } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, name } = body;

    if (!username || !name?.trim()) {
      return NextResponse.json(
        { error: 'Username and board name are required' },
        { status: 400 },
      );
    }

    const trimmedName = name.trim();

    // 1. Find the user by username
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

    // 2. Create the board
    const [newBoard] = await db
      .insert(boards)
      .values({
        userId: user.id,
        title: trimmedName,
        slug: trimmedName
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, ''), // simple slug generation
      })
      .returning({
        id: boards.id,
        title: boards.title,
        slug: boards.slug,
        createdAt: boards.createdAt,
      });

    // 3. Auto-create default lists
    const defaultLists = [
      { title: 'Today', order: 0 },
      { title: 'This Week', order: 1 },
      { title: 'Future', order: 2 },
      { title: 'Completed', order: 3 },
    ];

    await db.insert(lists).values(
      defaultLists.map((list) => ({
        ...list,
        boardId: newBoard.id,
      })),
    );

    // 4. Return the new board (frontend will add it to the list)
    return NextResponse.json({
      id: newBoard.id,
      name: newBoard.title, // match Sidebar's expected field
      // you can add slug, createdAt, etc. if needed
    });
  } catch (error) {
    console.error('Board creation error:', error);

    // Handle unique constraint violation on slug (if you have unique index)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any)?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return NextResponse.json(
        {
          error:
            'A board with this name already exists (slug conflict)',
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to create board' },
      { status: 500 },
    );
  }
}
