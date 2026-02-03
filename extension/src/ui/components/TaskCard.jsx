import React, { useState } from 'react';

const LABELS = ['urgent', 'important', 'normal', 'low', 'none'];

function labelBadge(label) {
  if (!label || label === 'none') return null;
  return <span className={`badge badge-${label}`}>{label}</span>;
}

export function TaskCard({ task, expanded = false, onToggleExpanded, onUpdateTask, isOverlay = false }) {
  const [draft, setDraft] = useState({
    title: task.title || '',
    description: task.description || '',
    link: task.link || '',
    label: task.label || 'none',
  });

  const canEdit = Boolean(onUpdateTask) && !isOverlay;

  return (
    <article className={`task ${isOverlay ? 'taskOverlay' : ''}`} onDoubleClick={onToggleExpanded}>
      <div className="taskTop">
        <div className="taskTitleRow">
          {labelBadge(task.label)}
          <div className="taskTitle">{task.title}</div>
        </div>
        {!isOverlay ? (
          <button className="iconButton" onClick={onToggleExpanded} type="button" title="Edit">
            {expanded ? '×' : '✎'}
          </button>
        ) : null}
      </div>

      {task.link ? (
        <a className="taskLink" href={task.link} target="_blank" rel="noopener noreferrer">
          {task.link}
        </a>
      ) : null}

      {expanded && canEdit ? (
        <div className="taskEditor">
          <input
            className="input"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="Title"
          />
          <textarea
            className="textarea"
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            placeholder="Description (optional)"
            rows={3}
          />
          <input
            className="input"
            value={draft.link}
            onChange={(e) => setDraft((d) => ({ ...d, link: e.target.value }))}
            placeholder="Link (optional)"
          />
          <div className="row">
            <select
              className="select"
              value={draft.label}
              onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
              aria-label="Label"
            >
              {LABELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <button
              className="button primary"
              type="button"
              onClick={() => {
                onUpdateTask(task.id, {
                  title: draft.title.trim() || task.title,
                  description: draft.description,
                  link: draft.link,
                  label: draft.label,
                });
                onToggleExpanded();
              }}
            >
              Save
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

