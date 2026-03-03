'use client';

import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import { KanbanView } from './KanbanView';
import { toast } from 'sonner';
import Link from 'next/link';
import { Button } from './ui/button';
import Image from 'next/image';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

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

  const activeBoardName = boards.find(
    (b) => b.id === activeBoardId,
  )?.name;

  // On load, restore last active board or fall back to first
  useEffect(() => {
    if (boards.length === 0) return;
    const saved = localStorage.getItem(`activeBoard:${username}`);
    if (saved && boards.find((b) => b.id === saved)) {
      setActiveBoardId(saved);
    } else {
      setActiveBoardId(boards[0].id);
    }
  }, [boards]);

  // Persist whenever active board changes
  useEffect(() => {
    if (activeBoardId) {
      localStorage.setItem(`activeBoard:${username}`, activeBoardId);
    }
  }, [activeBoardId, username]);

  // Polling
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/boards/data?username=${username}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        setLocalJoinedData(data);
      } catch {
        // silently fail
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [username]);

  const handleCreateBoard = async (name: string) => {
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, name }),
      });

      if (!res.ok) throw new Error('Failed');

      const newBoard = await res.json();

      setBoards((prev) => [...prev, newBoard]);

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
          listId: `optimistic-${index}-${Date.now()}`,
          listTitle: list.title,
          listOrder: list.order,
          taskId: null,
          taskContent: null,
          taskOrder: null,
        }),
      );

      setLocalJoinedData((prev) => [...prev, ...optimisticRows]);
      setActiveBoardId(newBoard.id);
      toast.success('Board created');
    } catch {
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
      setLocalJoinedData((prev) =>
        prev.filter((row) => row.boardId !== id),
      );
      toast.success('Board deleted');
    } catch {
      toast.error('Could not delete');
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 h-14 border-b shrink-0 bg-card">
        <Sidebar
          username={username}
          activeBoardId={activeBoardId}
          setActiveBoardId={setActiveBoardId}
          boards={boards}
          onCreateBoard={handleCreateBoard}
          onDeleteBoard={handleDeleteBoard}
        />

        <h1 className="text-xl font-bold tracking-tight truncate flex-1">
          {activeBoardName ?? 'Select a board'}
        </h1>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="https://ko-fi.com/spacedubby07"
              target="_blank"
            >
              <Button className="p-4 cursor-pointer">
                <Image
                  src="/images/kofi.png"
                  width={24}
                  height={24}
                  alt="donate via kofi"
                />
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Donate</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6 bg-muted/30">
        <KanbanView
          activeBoardId={activeBoardId}
          joinedData={localJoinedData}
        />
      </main>
    </div>
  );
}
