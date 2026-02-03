import React, { useMemo, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { TaskCard } from './TaskCard.jsx';

export function SortableTask({ id, task, onUpdateTask }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data: { type: 'task', taskId: task.id, listId: task.listId },
  });

  const [expanded, setExpanded] = useState(false);
  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.6 : 1,
    }),
    [transform, transition, isDragging]
  );

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard
        task={task}
        expanded={expanded}
        onToggleExpanded={() => setExpanded((v) => !v)}
        onUpdateTask={onUpdateTask}
      />
    </div>
  );
}

