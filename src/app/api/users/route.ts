import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = body;

    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 },
      );
    }

    // Clean and normalize
    const cleaned = username.trim().toLowerCase();

    // Basic validation
    if (cleaned.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters long' },
        { status: 400 },
      );
    }

    if (cleaned.length > 20) {
      return NextResponse.json(
        { error: 'Username must be at most 20 characters long' },
        { status: 400 },
      );
    }

    if (!/^[a-z0-9_-]+$/.test(cleaned)) {
      return NextResponse.json(
        {
          error:
            'Username can only contain lowercase letters, numbers, hyphens and underscores',
        },
        { status: 400 },
      );
    }

    // Check if username already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, cleaned))
      .limit(1);

    if (existingUser.length > 0) {
      // Already exists → treat as "login"
      return NextResponse.json({
        username: cleaned,
        message: 'Welcome back!',
      });
    }

    // Create new user
    await db.insert(users).values({
      username: cleaned,
    });

    return NextResponse.json({
      username: cleaned,
      message: 'Username created!',
    });
  } catch (error) {
    console.error('Error creating user:', error);

    // In case of unique constraint violation (shouldn't happen if we checked, but safety net)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any)?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return NextResponse.json(
        { error: 'This username is already taken' },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }
}
