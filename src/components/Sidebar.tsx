'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Trash2, Plus, ChevronLeft, SidebarOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Board {
  id: string;
  name: string; // or title — adjust to match your schema
}

interface SidebarProps {
  username: string;
  activeBoardId: string | null;
  setActiveBoardId: (id: string | null) => void;
  // Later you can pass boards from parent / server props
  boards: Board[];
  onCreateBoard: (name: string) => Promise<void>;
  onDeleteBoard: (id: string) => Promise<void>;
}

export default function Sidebar({
  username,
  activeBoardId,
  setActiveBoardId,
  boards = [],
  onCreateBoard,
  onDeleteBoard,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
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
    <Card
      className={cn(
        'h-screen border-r border-border bg-card transition-all duration-300 ease-in-out',
        'flex flex-col rounded-none shadow-sm',
        isCollapsed ? 'w-16' : 'w-72', // 72 for a bit more breathing room than 64
      )}
    >
      {/* Header */}
      <div className="relative flex h-14 items-center justify-between border-b px-4">
        {/* Title (layered, doesn’t affect layout) */}
        <h2
          className={cn(
            'absolute left-4 whitespace-nowrap text-lg font-semibold tracking-tight transition-opacity duration-200',
            isCollapsed
              ? 'opacity-0 delay-0 pointer-events-none'
              : 'opacity-100 delay-100',
          )}
        >
          {username}&apos;s Boards
        </h2>

        {/* Spacer so button stays right aligned */}
        <div />

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <SidebarOpen className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Content - only shown when expanded */}
      {!isCollapsed && (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Boards list */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {boards.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                No boards yet
              </p>
            ) : (
              boards.map((board) => (
                <div
                  key={board.id}
                  onClick={() => setActiveBoardId(board.id)}
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

          {/* Create new board section */}
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
      )}

      {/* Collapsed mode: just a big + button to expand & create */}
      {isCollapsed && (
        <div className="flex flex-1 items-center justify-center">
          <Button
            variant="ghost"
            size="lg"
            className="h-12 w-12 rounded-full"
            onClick={() => setIsCollapsed(false)}
            title="Expand to create or view boards"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      )}
    </Card>
  );
}
