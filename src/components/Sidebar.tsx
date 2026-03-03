'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Trash2, Plus, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Board {
  id: string;
  name: string;
}

interface SidebarProps {
  username: string;
  activeBoardId: string | null;
  setActiveBoardId: (id: string | null) => void;
  boards: Board[];
  onCreateBoard: (name: string) => Promise<void>;
  onDeleteBoard: (id: string) => Promise<void>;
}

export default function Sidebar(props: SidebarProps) {
  const {
    username,
    activeBoardId,
    setActiveBoardId,
    boards,
    onCreateBoard,
    onDeleteBoard,
  } = props;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    const trimmed = newBoardName.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      await onCreateBoard(trimmed);
      setNewBoardName('');
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 flex flex-col">
        <SheetHeader className="h-14 flex flex-row items-center border-b px-4 shrink-0 space-y-0">
          <SheetTitle>{username}&apos;s Boards</SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {boards.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                No boards yet
              </p>
            ) : (
              boards.map((board) => (
                <div
                  key={board.id}
                  onClick={() => {
                    setActiveBoardId(board.id);
                    setSheetOpen(false);
                  }}
                  className={cn(
                    'group flex items-center justify-between rounded-md px-3 py-2.5 text-sm cursor-pointer transition-colors',
                    activeBoardId === board.id
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/60',
                  )}
                >
                  <span className="truncate font-medium">
                    {board.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${board.name}"?`)) {
                        onDeleteBoard(board.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="border-t p-4 space-y-3">
            <Input
              placeholder="New board name..."
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={creating}
              className="h-9"
            />
            <Button
              onClick={handleCreate}
              disabled={creating || !newBoardName.trim()}
              className="w-full h-9"
            >
              {creating ? (
                'Creating...'
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Board
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
