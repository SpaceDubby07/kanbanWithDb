'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface KanbanViewProps {
  activeBoardId: string | null;
  joinedData: {
    boardId: string;
    boardName: string;
    listId: string | null;
    listTitle: string | null;
    listOrder: number | null;
    taskId: string | null;
    taskContent: string | null;
    taskOrder: number | null;
  }[];
}

interface Task {
  id: string;
  content: string;
  order: number;
  listId: string;
}

export function KanbanView({
  activeBoardId,
  joinedData,
}: KanbanViewProps) {
  const [newTaskContent, setNewTaskContent] = useState<
    Record<string, string>
  >({});
  const [creatingTask, setCreatingTask] = useState<
    Record<string, boolean>
  >({});
  const [localTasks, setLocalTasks] = useState<
    Record<string, Task[]>
  >({});
  const [collapsedLists, setCollapsedLists] = useState<
    Record<string, boolean>
  >({});

  // Sync server data → local tasks
  useEffect(() => {
    if (!activeBoardId) return;

    const tasksByList: Record<string, Task[]> = {};

    joinedData
      .filter((row) => row.boardId === activeBoardId && row.listId)
      .forEach((row) => {
        const listId = row.listId!;
        if (!tasksByList[listId]) tasksByList[listId] = [];
        if (row.taskId) {
          tasksByList[listId].push({
            id: row.taskId,
            content: row.taskContent || '',
            order: row.taskOrder ?? 0,
            listId,
          });
        }
      });

    Object.keys(tasksByList).forEach((listId) => {
      tasksByList[listId].sort((a, b) => a.order - b.order);
    });

    setLocalTasks(tasksByList);
  }, [activeBoardId, joinedData]);

  const board = useMemo(() => {
    if (!activeBoardId) return null;

    const rows = joinedData.filter(
      (row) => row.boardId === activeBoardId,
    );
    if (rows.length === 0) return null;

    const listsMap = new Map<
      string,
      { id: string; title: string; order: number }
    >();

    rows.forEach((row) => {
      if (!row.listId) return;
      if (!listsMap.has(row.listId)) {
        listsMap.set(row.listId, {
          id: row.listId,
          title: row.listTitle || 'Untitled',
          order: row.listOrder ?? 0,
        });
      }
    });

    const sortedLists = Array.from(listsMap.values()).sort(
      (a, b) => a.order - b.order,
    );

    return {
      name: rows[0].boardName || 'Board',
      lists: sortedLists,
    };
  }, [activeBoardId, joinedData]);

  if (!board) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4">
        <p className="text-lg">Select a board from the sidebar</p>
        <p className="text-sm">or create a new one</p>
      </div>
    );
  }

  const isCompletedList = (title: string) =>
    title.toLowerCase() === 'completed';

  const toggleListCollapse = (listId: string) => {
    setCollapsedLists((prev) => ({
      ...prev,
      [listId]: !prev[listId],
    }));
  };

  const handleAddTask = async (listId: string) => {
    const content = newTaskContent[listId]?.trim();
    if (!content) return;

    setCreatingTask((prev) => ({ ...prev, [listId]: true }));

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId, content }),
      });

      if (!res.ok) throw new Error();

      const newTask = await res.json();

      setLocalTasks((prev) => ({
        ...prev,
        [listId]: [
          ...(prev[listId] || []),
          {
            id: newTask.id,
            content: newTask.content,
            order: newTask.order,
            listId,
          },
        ],
      }));

      setNewTaskContent((prev) => ({ ...prev, [listId]: '' }));
      toast.success('Task added');
    } catch {
      toast.error('Could not add task');
    } finally {
      setCreatingTask((prev) => ({ ...prev, [listId]: false }));
    }
  };

  const handleDeleteTask = async (taskId: string, listId: string) => {
    if (!confirm('Delete this task?')) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error();

      setLocalTasks((prev) => ({
        ...prev,
        [listId]: (prev[listId] || []).filter((t) => t.id !== taskId),
      }));

      toast.success('Task deleted');
    } catch {
      toast.error('Could not delete task');
    }
  };

  const handleCompleteTask = async (
    task: Task,
    currentListId: string,
  ) => {
    const completedList = board.lists.find(
      (l) => l.title.toLowerCase() === 'completed',
    );
    if (!completedList) {
      toast.error('No "Completed" list found');
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId: completedList.id }),
      });

      if (!res.ok) throw new Error();

      setLocalTasks((prev) => {
        const currentTasks = prev[currentListId] || [];
        const remaining = currentTasks.filter(
          (t) => t.id !== task.id,
        );
        const completedTasks = prev[completedList.id] || [];

        return {
          ...prev,
          [currentListId]: remaining,
          [completedList.id]: [
            ...completedTasks,
            { ...task, listId: completedList.id },
          ],
        };
      });

      toast.success('Task completed');
    } catch {
      toast.error('Could not mark as complete');
    }
  };

  const handleTaskInputChange = (listId: string, value: string) => {
    setNewTaskContent((prev) => ({ ...prev, [listId]: value }));
  };

  const handleTaskKeyDown = (
    listId: string,
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddTask(listId);
    }
  };

  return (
    <div className="h-full">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">
        {board.name}
      </h1>

      <div className="flex gap-4 overflow-x-auto pb-8 h-[calc(100%-4rem)]">
        {board.lists.map((list) => {
          const isCollapsed = collapsedLists[list.id] ?? false;
          const tasks = localTasks[list.id] || [];
          const isCompleted = isCompletedList(list.title);

          return (
            <div
              key={list.id}
              className={cn(
                'flex flex-col rounded-xl border shadow-sm transition-all duration-300 ease-in-out overflow-hidden',
                isCollapsed ? 'w-14 min-w-14' : 'min-w-[340px]',
                isCompleted
                  ? 'bg-emerald-950 border-emerald-800 text-emerald-100'
                  : 'bg-card border-border',
              )}
            >
              {/* Collapsible Header */}
              <div
                onClick={() => toggleListCollapse(list.id)}
                className={cn(
                  'cursor-pointer select-none transition-all duration-300',
                  isCollapsed
                    ? 'flex flex-col items-center justify-center py-4 gap-3 bg-muted/50 hover:bg-muted'
                    : 'flex items-center justify-between px-4 py-3 border-b hover:bg-muted/30',
                )}
              >
                {/* Title */}
                <span
                  className={cn(
                    'font-semibold text-sm transition-all duration-300',
                    isCollapsed ? 'text-center' : 'truncate',
                  )}
                  style={
                    isCollapsed
                      ? {
                          writingMode: 'vertical-rl',
                          textOrientation: 'upright',
                          fontSize: '9px',
                        }
                      : undefined
                  }
                >
                  {list.title}
                </span>

                {/* Count + Icon */}
                {isCollapsed ? (
                  <span className="text-[10px] font-medium bg-background/70 px-2 py-1 rounded-full">
                    {tasks.length}
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                      {tasks.length}
                    </span>
                    <ChevronUp className="h-4 w-4 transition-transform duration-300" />
                  </div>
                )}
              </div>

              {/* Content */}
              {!isCollapsed && (
                <>
                  <div className="flex-1 space-y-3 overflow-y-auto p-3 transition-opacity duration-200">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="group relative rounded-lg border bg-background p-4 shadow-sm flex items-start gap-3 hover:shadow-md transition-shadow"
                      >
                        {!isCompleted && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50 shrink-0"
                            onClick={() =>
                              handleCompleteTask(task, list.id)
                            }
                            title="Mark as complete"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </Button>
                        )}

                        <p className="text-sm whitespace-pre-wrap flex-1">
                          {task.content}
                        </p>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity"
                          onClick={() =>
                            handleDeleteTask(task.id, list.id)
                          }
                          title="Delete task"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {!isCompleted && (
                    <div className="border-t p-3">
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Enter task content..."
                          value={newTaskContent[list.id] || ''}
                          onChange={(e) =>
                            handleTaskInputChange(
                              list.id,
                              e.target.value,
                            )
                          }
                          onKeyDown={(e) =>
                            handleTaskKeyDown(list.id, e)
                          }
                          disabled={creatingTask[list.id]}
                        />
                        <Button
                          onClick={() => handleAddTask(list.id)}
                          disabled={
                            creatingTask[list.id] ||
                            !newTaskContent[list.id]?.trim()
                          }
                          className="w-full"
                        >
                          {creatingTask[list.id]
                            ? 'Adding...'
                            : 'Add Task'}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}

        <button className="flex h-[140px] w-[340px] shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/50 hover:border-primary/50 hover:text-primary transition-colors">
          <Plus className="mr-2 h-5 w-5" />
          Add another list
        </button>
      </div>
    </div>
  );
}
