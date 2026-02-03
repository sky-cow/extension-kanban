import React, { useMemo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { SortableTask } from './SortableTask.jsx';

export function ListColumn({ dndId, list, tasks, onRename, onCreateTask, onUpdateTask, taskDndId }) {
  const [newTitle, setNewTitle] = useState('');

  // Make the whole column droppable (so dropping onto column moves task into it)
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: dndId });

  // Make the list itself sortable (horizontal reordering)
  const { attributes, listeners, setNodeRef: setSortRef, transform, transition, isDragging } = useSortable({
    id: dndId,
    data: { type: 'list', listId: list.id },
  });

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.6 : 1,
      outline: isOver ? '2px solid rgba(54, 179, 126, 0.55)' : 'none',
    }),
    [transform, transition, isDragging, isOver]
  );

  return (
    <section className="list" ref={(node) => { setSortRef(node); setDropRef(node); }} style={style}>
      <div className="listHeader">
        <div className="dragHandle" title="Drag to reorder lists" {...attributes} {...listeners}>
          ⋮⋮
        </div>
        <input
          className="listTitle"
          value={list.name}
          onChange={(e) => onRename(e.target.value)}
          aria-label="List name"
        />
      </div>

      <div className="taskList">
        {tasks.map((task) => (
          <SortableTask
            key={task.id}
            id={taskDndId(task.id)}
            task={task}
            onUpdateTask={onUpdateTask}
          />
        ))}
      </div>

      <form
        className="newTaskForm"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = newTitle.trim();
          if (!trimmed) return;
          onCreateTask(trimmed);
          setNewTitle('');
        }}
      >
        <input
          className="input"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a task…"
        />
        <button className="button" type="submit">
          Add
        </button>
      </form>
    </section>
  );
}

