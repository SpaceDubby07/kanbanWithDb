'use client';

import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import { KanbanView } from './KanbanView';
import { toast } from 'sonner';

type Board = {
  id: string;
  name: string;
};

type JoinedRow = {
  boardId: string;
  boardName: string;
  listId: string | null;
  listTitle: string | null;
  listOrder: number | null;
  taskId: string | null;
  taskContent: string | null;
  taskOrder: number | null;
};

interface BoardLayoutClientProps {
  username: string;
  initialBoards: Board[];
  initialJoinedData: JoinedRow[];
}

export default function BoardLayoutClient({
  username,
  initialBoards,
  initialJoinedData,
}: BoardLayoutClientProps) {
  const [boards, setBoards] = useState<Board[]>(initialBoards);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(
    null,
  );
  const [localJoinedData, setLocalJoinedData] =
    useState<JoinedRow[]>(initialJoinedData);

  // Auto-select first board on load
  useEffect(() => {
    if (activeBoardId === null && boards.length > 0) {
      setActiveBoardId(boards[0].id);
    }
  }, [boards]);

  const handleCreateBoard = async (name: string) => {
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, name }),
      });

      if (!res.ok) throw new Error('Failed');

      const newBoard = await res.json();

      // Add board to list
      setBoards((prev) => [...prev, newBoard]);

      // Optimistically add default lists to localJoinedData
      const defaultLists = [
        { title: 'Today', order: 0 },
        { title: 'This Week', order: 1 },
        { title: 'Future', order: 2 },
        { title: 'Completed', order: 3 },
      ];

      const optimisticRows: JoinedRow[] = defaultLists.map(
        (list, index) => ({
          boardId: newBoard.id,
          boardName: newBoard.name,
          listId: `optimistic-${index}-${Date.now()}`, // temp ID
          listTitle: list.title,
          listOrder: list.order,
          taskId: null,
          taskContent: null,
          taskOrder: null,
        }),
      );

      setLocalJoinedData((prev) => [...prev, ...optimisticRows]);

      // Select it
      setActiveBoardId(newBoard.id);

      toast.success('Board created');
    } catch (err) {
      toast.error('Could not create board');
    }
  };

  const handleDeleteBoard = async (id: string) => {
    if (!confirm('Delete board?')) return;

    try {
      const res = await fetch(
        `/api/boards/${id}?username=${username}`,
        {
          method: 'DELETE',
        },
      );

      if (!res.ok) throw new Error();

      setBoards((prev) => prev.filter((b) => b.id !== id));
      if (activeBoardId === id) setActiveBoardId(null);

      // Optional: remove from localJoinedData
      setLocalJoinedData((prev) =>
        prev.filter((row) => row.boardId !== id),
      );

      toast.success('Board deleted');
    } catch {
      toast.error('Could not delete');
    }
  };

  return (
    <>
      <Sidebar
        username={username}
        activeBoardId={activeBoardId}
        setActiveBoardId={setActiveBoardId}
        boards={boards}
        onCreateBoard={handleCreateBoard}
        onDeleteBoard={handleDeleteBoard}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-auto p-6 bg-muted/30">
          <KanbanView
            activeBoardId={activeBoardId}
            joinedData={localJoinedData} // ← use local now
          />
        </main>
      </div>
    </>
  );
}
