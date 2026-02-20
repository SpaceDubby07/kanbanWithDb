'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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

interface List {
  id: string;
  title: string;
  order: number;
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

  // New list form state
  const [showNewListForm, setShowNewListForm] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [creatingList, setCreatingList] = useState(false);

  // Local lists state — starts from server, updated optimistically
  const [localLists, setLocalLists] = useState<List[]>([]);

  // Sync from server props whenever joinedData or activeBoardId changes
  useEffect(() => {
    if (!activeBoardId) {
      setLocalLists([]);
      setLocalTasks({});
      return;
    }

    // Build lists from joinedData
    const listsMap = new Map<string, List>();

    joinedData
      .filter((row) => row.boardId === activeBoardId && row.listId)
      .forEach((row) => {
        const listId = row.listId!;
        if (!listsMap.has(listId)) {
          listsMap.set(listId, {
            id: listId,
            title: row.listTitle || 'Untitled',
            order: row.listOrder ?? 0,
          });
        }
      });

    const newLists = Array.from(listsMap.values()).sort(
      (a, b) => a.order - b.order,
    );

    // Ensure "Completed" stays last
    const completedIndex = newLists.findIndex(
      (l) => l.title.toLowerCase() === 'completed',
    );
    if (
      completedIndex !== -1 &&
      completedIndex !== newLists.length - 1
    ) {
      const [completed] = newLists.splice(completedIndex, 1);
      newLists.push(completed);
    }

    setLocalLists(newLists);

    // Also sync tasks
    const tasksByList: Record<string, Task[]> = {};
    joinedData
      .filter(
        (row) =>
          row.boardId === activeBoardId && row.listId && row.taskId,
      )
      .forEach((row) => {
        const listId = row.listId!;
        if (!tasksByList[listId]) tasksByList[listId] = [];
        tasksByList[listId].push({
          id: row.taskId!,
          content: row.taskContent || '',
          order: row.taskOrder ?? 0,
          listId,
        });
      });

    Object.values(tasksByList).forEach((tasks) =>
      tasks.sort((a, b) => a.order - b.order),
    );

    setLocalTasks(tasksByList);
  }, [activeBoardId, joinedData]);

  const board = useMemo(() => {
    if (!activeBoardId || localLists.length === 0) return null;

    return {
      name:
        joinedData.find((r) => r.boardId === activeBoardId)
          ?.boardName || 'Board',
      lists: localLists,
    };
  }, [activeBoardId, localLists, joinedData]);

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

    } catch {
      toast.error('Could not mark as complete');
    }
  };

  const handleAddList = async () => {
    const title = newListTitle.trim();
    if (!title) return;

    setCreatingList(true);

    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId: activeBoardId, title }),
      });

      if (!res.ok) throw new Error();

      const newList = await res.json();

      // Optimistically add the new list (insert before Completed)
      setLocalLists((prev) => {
        const completedIndex = prev.findIndex(
          (l) => l.title.toLowerCase() === 'completed',
        );

        const newListObj = {
          id: newList.id,
          title: newList.title,
          order: newList.order,
        };

        if (completedIndex === -1) {
          return [...prev, newListObj];
        }

        const before = prev.slice(0, completedIndex);
        const after = prev.slice(completedIndex);
        return [...before, newListObj, ...after];
      });

      setLocalTasks((prev) => ({
        ...prev,
        [newList.id]: [],
      }));

      setNewListTitle('');
      setShowNewListForm(false);
    } catch {
      toast.error('Could not add list');
    } finally {
      setCreatingList(false);
    }
  };

  const handleDeleteList = async (
    listId: string,
    listTitle: string,
  ) => {
    if (!confirm(`Delete list "${listTitle}" and all its tasks?`))
      return;

    try {
      const res = await fetch(`/api/lists/${listId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error();

      // Optimistically remove list and its tasks
      setLocalLists((prev) => prev.filter((l) => l.id !== listId));
      setLocalTasks((prev) => {
        const copy = { ...prev };
        delete copy[listId];
        return copy;
      });

    } catch {
      toast.error('Could not delete list');
    }
  };

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddList();
    }
    if (e.key === 'Escape') {
      setShowNewListForm(false);
      setNewListTitle('');
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

  const isProtectedList = (title: string) => {
    const lower = title.toLowerCase();
    return (
      lower === 'today' ||
      lower === 'this week' ||
      lower === 'future' ||
      lower === 'completed'
    );
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
                isCollapsed
                  ? 'w-14 min-w-14 items-center'
                  : 'min-w-85',
                isCompleted
                  ? 'bg-emerald-950 border-emerald-800 text-emerald-100'
                  : 'bg-card border-border',
              )}
            >
              {/* Collapsible Header / Pill */}
              <div
                onClick={() => toggleListCollapse(list.id)}
                className={cn(
                  'cursor-pointer select-none transition-all duration-300 w-full flex items-center',
                  isCollapsed
                    ? 'flex-col justify-center py-6 gap-2 bg-muted/50 hover:bg-muted rounded-xl'
                    : 'justify-between px-4 py-3 border-b hover:bg-muted/30 group relative',
                )}
              >
                {isCollapsed ? (
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
                            fontSize: '7px',
                          }
                        : undefined
                    }
                  >
                    {list.title}
                  </span>
                ) : (
                  <div className="flex w-full items-center justify-between">
                    <span className="font-semibold">
                      {list.title}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        {tasks.length}
                      </span>
                      {!isProtectedList(list.title) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteList(list.id, list.title);
                          }}
                          title="Delete list"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
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

        {/* Add another list */}
        <div className="shrink-0 flex flex-col gap-2">
          {showNewListForm ? (
            <div className="w-85 rounded-xl border bg-card p-4 shadow-sm space-y-3">
              <Input
                placeholder="List name (e.g. In Review)"
                value={newListTitle}
                onChange={(e) => setNewListTitle(e.target.value)}
                onKeyDown={handleListKeyDown}
                autoFocus
                disabled={creatingList}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleAddList}
                  disabled={creatingList || !newListTitle.trim()}
                  className="flex-1"
                >
                  {creatingList ? 'Adding...' : 'Add List'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowNewListForm(false);
                    setNewListTitle('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewListForm(true)}
              className="flex h-35 w-85 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/50 hover:border-primary/50 hover:text-primary transition-colors"
            >
              <Plus className="mr-2 h-5 w-5" />
              Add another list
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
