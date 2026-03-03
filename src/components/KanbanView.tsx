'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  CheckCircle,
  ArrowLeftRight,
  X,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

// Sortable task wrapper for desktop
function SortableTask({
  task,
  isCompleted,
  onComplete,
  onDelete,
}: {
  task: Task;
  isCompleted: boolean;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    touchAction: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group relative rounded-lg border bg-background p-4 shadow-sm flex items-start gap-3 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
    >
      {!isCompleted && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onComplete();
          }}
          title="Mark as complete"
        >
          <CheckCircle className="h-5 w-5" />
        </Button>
      )}
      <p className="text-sm whitespace-pre-wrap flex-1 pointer-events-none">
        {task.content}
      </p>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title="Delete task"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function DroppableList({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className="flex-1 space-y-3 overflow-y-auto p-3 min-h-20"
    >
      {children}
    </div>
  );
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
  const [showNewListForm, setShowNewListForm] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [creatingList, setCreatingList] = useState(false);
  const [localLists, setLocalLists] = useState<List[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(
    null,
  );

  // Mobile move state
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    null,
  );
  const [selectedTaskListId, setSelectedTaskListId] = useState<
    string | null
  >(null);

  // Desktop drag state
  const [activeDragId, setActiveDragId] = useState<string | null>(
    null,
  );

  // hopefully fix brave delete issue
  const [pendingDeleteTaskId, setPendingDeleteTaskId] = useState<
    string | null
  >(null);
  const [pendingDeleteListId, setPendingDeleteListId] = useState<
    string | null
  >(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  );

  useEffect(() => {
    if (!activeBoardId) {
      setLocalLists([]);
      setLocalTasks({});
      return;
    }

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

  useEffect(() => {
    if (localLists.length > 0 && !activeListId) {
      setActiveListId(localLists[0].id);
    }
  }, [localLists]);

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
  const isProtectedList = (title: string) => {
    const lower = title.toLowerCase();
    return (
      lower === 'today' ||
      lower === 'this week' ||
      lower === 'future' ||
      lower === 'completed'
    );
  };

  const toggleListCollapse = (listId: string) => {
    setCollapsedLists((prev) => ({
      ...prev,
      [listId]: !prev[listId],
    }));
  };

  // Mobile move logic
  const handleSelectTask = (taskId: string, listId: string) => {
    console.log('selecting task', taskId, 'in list', listId);
    if (selectedTaskId === taskId) {
      setSelectedTaskId(null);
      setSelectedTaskListId(null);
    } else {
      setSelectedTaskId(taskId);
      setSelectedTaskListId(listId);
    }
  };

  const handleMoveToList = async (targetListId: string) => {
    if (!selectedTaskId || !selectedTaskListId) return;
    if (targetListId === selectedTaskListId) {
      setSelectedTaskId(null);
      setSelectedTaskListId(null);
      return;
    }

    const task = (localTasks[selectedTaskListId] || []).find(
      (t) => t.id === selectedTaskId,
    );
    if (!task) return;

    // Optimistic
    setLocalTasks((prev) => {
      const sourceList = (prev[selectedTaskListId!] || []).filter(
        (t) => t.id !== selectedTaskId,
      );
      const targetList = [
        ...(prev[targetListId] || []),
        { ...task, listId: targetListId },
      ];
      return {
        ...prev,
        [selectedTaskListId!]: sourceList,
        [targetListId]: targetList,
      };
    });

    setSelectedTaskId(null);
    setSelectedTaskListId(null);
    setActiveListId(targetListId);

    try {
      await fetch(`/api/tasks/${selectedTaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId: targetListId }),
      });
    } catch {
      toast.error('Could not move task');
    }
  };

  const handleMoveTaskOrder = async (
    taskId: string,
    listId: string,
    direction: 'up' | 'down',
  ) => {
    const tasks = [...(localTasks[listId] || [])];
    const index = tasks.findIndex((t) => t.id === taskId);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === tasks.length - 1) return;

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [tasks[index], tasks[swapIndex]] = [
      tasks[swapIndex],
      tasks[index],
    ];

    const reordered = tasks.map((t, i) => ({ ...t, order: i }));
    setLocalTasks((prev) => ({ ...prev, [listId]: reordered }));

    try {
      await Promise.all([
        fetch(`/api/tasks/${reordered[index].id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: reordered[index].order }),
        }),
        fetch(`/api/tasks/${reordered[swapIndex].id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: reordered[swapIndex].order }),
        }),
      ]);
    } catch {
      toast.error('Could not reorder task');
    }
  };

  // Desktop drag logic
  const findListByTaskId = (taskId: string) => {
    return (
      Object.entries(localTasks).find(([, tasks]) =>
        tasks.some((t) => t.id === taskId),
      )?.[0] ?? null
    );
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const activeListId = findListByTaskId(activeId);
    const overListId = localLists.find((l) => l.id === overId)
      ? overId
      : findListByTaskId(overId);

    if (!activeListId || !overListId) return;
    if (
      isCompletedList(
        localLists.find((l) => l.id === overListId)?.title ?? '',
      )
    )
      return;

    // Cross-list move only — same list reordering handled in dragEnd
    if (activeListId !== overListId) {
      setLocalTasks((prev) => {
        const activeTask = (prev[activeListId] || []).find(
          (t) => t.id === activeId,
        );
        if (!activeTask) return prev;
        const sourceList = (prev[activeListId] || []).filter(
          (t) => t.id !== activeId,
        );
        const targetList = [
          ...(prev[overListId] || []),
          { ...activeTask, listId: overListId },
        ];
        return {
          ...prev,
          [activeListId]: sourceList,
          [overListId]: targetList,
        };
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const currentListId = findListByTaskId(activeId);
    if (!currentListId) return;

    const currentList = [...(localTasks[currentListId] || [])];
    const activeIndex = currentList.findIndex(
      (t) => t.id === activeId,
    );
    const overIndex = currentList.findIndex((t) => t.id === overId);

    // Same list reorder
    if (activeIndex !== -1 && overIndex !== -1) {
      const reordered = [...currentList];
      const [moved] = reordered.splice(activeIndex, 1);
      reordered.splice(overIndex, 0, moved);
      const withOrder = reordered.map((t, i) => ({ ...t, order: i }));
      setLocalTasks((prev) => ({
        ...prev,
        [currentListId]: withOrder,
      }));

      try {
        await Promise.all(
          withOrder.map((t) =>
            fetch(`/api/tasks/${t.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ order: t.order }),
            }),
          ),
        );
      } catch {
        toast.error('Could not save order');
      }
      return;
    }

    try {
      await fetch(`/api/tasks/${activeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId: currentListId }),
      });
    } catch {
      toast.error('Could not move task');
    }
  };

  const activeDragTask = activeDragId
    ? Object.values(localTasks)
        .flat()
        .find((t) => t.id === activeDragId)
    : null;

  // Shared handlers
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
    // removed confirm()
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
      setLocalTasks((prev) => ({
        ...prev,
        [currentListId]: (prev[currentListId] || []).filter(
          (t) => t.id !== task.id,
        ),
        [completedList.id]: [
          ...(prev[completedList.id] || []),
          { ...task, listId: completedList.id },
        ],
      }));
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
      setLocalLists((prev) => {
        const completedIndex = prev.findIndex(
          (l) => l.title.toLowerCase() === 'completed',
        );
        const newListObj = {
          id: newList.id,
          title: newList.title,
          order: newList.order,
        };
        if (completedIndex === -1) return [...prev, newListObj];
        return [
          ...prev.slice(0, completedIndex),
          newListObj,
          ...prev.slice(completedIndex),
        ];
      });
      setLocalTasks((prev) => ({ ...prev, [newList.id]: [] }));
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
    try {
      const res = await fetch(`/api/lists/${listId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
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

  return (
    <div className="flex flex-col h-full select-none">
      {/* Mobile tabs */}
      <div className="md:hidden flex overflow-x-auto gap-1 mb-2 pb-1 border-b shrink-0">
        {board.lists.map((list) => {
          const isCompleted = isCompletedList(list.title);
          const isMoveable =
            selectedTaskId &&
            !isCompleted &&
            list.id !== selectedTaskListId;
          const isMoveTarget = isMoveable;

          return (
            <button
              key={list.id}
              onClick={() => {
                if (isMoveTarget) {
                  handleMoveToList(list.id);
                } else if (!selectedTaskId) {
                  setActiveListId(list.id);
                }
              }}
              className={cn(
                'shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
                isMoveTarget
                  ? 'bg-blue-500 text-white animate-pulse'
                  : activeListId === list.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {isMoveTarget ? `→ ${list.title}` : list.title}
              <span className="ml-1.5 text-xs opacity-70">
                {(localTasks[list.id] || []).length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile add new list */}
      <div className="md:hidden mb-4 shrink-0">
        {showNewListForm ? (
          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
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
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowNewListForm(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add another list
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {/* Mobile single column */}
        <div className="md:hidden h-full">
          {board.lists.map((list) => {
            const tasks = localTasks[list.id] || [];
            const isCompleted = isCompletedList(list.title);
            if (activeListId !== list.id) return null;

            return (
              <div
                key={list.id}
                className={cn(
                  'h-full flex flex-col rounded-xl border shadow-sm overflow-hidden',
                  isCompleted
                    ? 'bg-emerald-950 border-emerald-800 text-emerald-100'
                    : 'bg-card border-border',
                )}
              >
                {/* Header */}
                <div className="flex w-full items-center justify-between px-4 py-3 border-b group">
                  <span className="font-semibold">{list.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                      {tasks.length}
                    </span>
                    {!isProtectedList(list.title) && (
                      <div className="flex items-center gap-1">
                        {pendingDeleteListId === list.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                              onClick={() =>
                                setPendingDeleteListId(null)
                              }
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:bg-red-50"
                              onClick={() => {
                                handleDeleteList(list.id, list.title);
                                setPendingDeleteListId(null);
                              }}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() =>
                              setPendingDeleteListId(list.id)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tasks */}
                <div className="flex-1 space-y-3 overflow-y-auto p-3">
                  {tasks.map((task, index) => {
                    const isSelected = selectedTaskId === task.id;
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          'relative rounded-lg border bg-background p-4 shadow-sm flex items-start gap-3 transition-all',
                          isSelected && 'ring-2 ring-blue-500',
                        )}
                      >
                        {!isCompleted && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 shrink-0" // h-8 w-8
                            onClick={() =>
                              handleCompleteTask(task, list.id)
                            }
                          >
                            <CheckCircle className="h-5 w-5" />
                          </Button>
                        )}

                        <p className="text-sm whitespace-pre-wrap flex-1">
                          {task.content}
                        </p>

                        <div className="flex flex-col gap-1 shrink-0">
                          {!isCompleted && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  'h-8 w-8 shrink-0 transition-colors', // h-8 w-8 instead of h-6 w-6
                                  isSelected
                                    ? 'text-blue-500 bg-blue-50'
                                    : 'text-muted-foreground hover:text-blue-500',
                                )}
                                onClick={() =>
                                  handleSelectTask(task.id, list.id)
                                }
                                title={
                                  isSelected
                                    ? 'Cancel move'
                                    : 'Move task'
                                }
                              >
                                {isSelected ? (
                                  <X className="h-4 w-4" />
                                ) : (
                                  <ArrowLeftRight className="h-4 w-4" />
                                )}
                              </Button>

                              {isSelected && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                    onClick={() =>
                                      handleMoveTaskOrder(
                                        task.id,
                                        list.id,
                                        'up',
                                      )
                                    }
                                    disabled={index === 0}
                                  >
                                    <ArrowUp className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                    onClick={() =>
                                      handleMoveTaskOrder(
                                        task.id,
                                        list.id,
                                        'down',
                                      )
                                    }
                                    disabled={
                                      index === tasks.length - 1
                                    }
                                  >
                                    <ArrowDown className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </>
                          )}

                          {pendingDeleteTaskId === task.id ? (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground"
                                onClick={() =>
                                  setPendingDeleteTaskId(null)
                                }
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  handleDeleteTask(task.id, list.id);
                                  setPendingDeleteTaskId(null);
                                }}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                              onClick={() =>
                                setPendingDeleteTaskId(task.id)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!isCompleted && (
                  <div className="border-t p-3 shrink-0">
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
              </div>
            );
          })}
        </div>

        {/* Desktop horizontal scroll */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="hidden md:flex gap-4 overflow-x-auto pb-8 h-full snap-x snap-mandatory">
            {board.lists.map((list) => {
              const isCollapsed = collapsedLists[list.id] ?? false;
              const tasks = localTasks[list.id] || [];
              const isCompleted = isCompletedList(list.title);

              return (
                <div
                  key={list.id}
                  className={cn(
                    'snap-start snap-always flex flex-col rounded-xl border shadow-sm transition-all duration-300 ease-in-out overflow-hidden',
                    isCollapsed
                      ? 'w-14 min-w-14 items-center'
                      : 'min-w-85',
                    isCompleted
                      ? 'bg-emerald-950 border-emerald-800 text-emerald-100'
                      : 'bg-card border-border',
                  )}
                >
                  {/* Header */}
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
                        className="font-semibold text-sm text-center"
                        style={{
                          writingMode: 'vertical-rl',
                          textOrientation: 'upright',
                          fontSize: '7px',
                        }}
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
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {!isCollapsed && (
                    <>
                      <SortableContext
                        items={tasks.map((t) => t.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <DroppableList id={list.id}>
                          {tasks.map((task) => (
                            <SortableTask
                              key={task.id}
                              task={task}
                              isCompleted={isCompleted}
                              onComplete={() =>
                                handleCompleteTask(task, list.id)
                              }
                              onDelete={() =>
                                handleDeleteTask(task.id, list.id)
                              }
                            />
                          ))}
                        </DroppableList>
                      </SortableContext>

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
                              className="w-full cursor-pointer"
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

            {/* Add new list — desktop only */}
            <div className="hidden md:flex shrink-0 flex-col gap-2">
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
                      className="flex-1 cursor-pointer"
                    >
                      {creatingList ? 'Adding...' : 'Add List'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowNewListForm(false);
                        setNewListTitle('');
                      }}
                      className="cursor-pointer"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewListForm(true)}
                  className="cursor-pointer flex h-35 w-85 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/50 hover:border-primary/50 hover:text-primary transition-colors"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Add another list
                </button>
              )}
            </div>
          </div>

          {/* Drag overlay, shows ghost card while dragging */}
          <DragOverlay>
            {activeDragTask && (
              <div className="rounded-lg border bg-background p-4 shadow-xl opacity-90 min-w-60">
                <p className="text-sm whitespace-pre-wrap">
                  {activeDragTask.content}
                </p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
