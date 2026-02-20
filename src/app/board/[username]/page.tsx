// app/board/[username]/page.tsx
import { notFound } from 'next/navigation';
import { db } from '@/db';
import { users, boards, lists, tasks } from '@/db/schema';
import { asc, eq } from 'drizzle-orm';

import BoardLayoutClient from '@/components/BoardLayoutClient';
import { SidebarProvider } from '@/components/ui/sidebar';

export default async function UserBoardsPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  // 1. Get user
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) notFound();

  // 2. Get all boards
  const userBoards = await db
    .select({
      id: boards.id,
      name: boards.title,
    })
    .from(boards)
    .where(eq(boards.userId, user.id))
    .orderBy(asc(boards.createdAt));

  // 3. Get joined lists + tasks
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

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full overflow-hidden">
        <BoardLayoutClient
          username={username}
          initialBoards={userBoards}
          initialJoinedData={joinedData}
        />

        {/* No more KanbanView here — it's inside BoardLayoutClient now */}
      </div>
    </SidebarProvider>
  );
}
