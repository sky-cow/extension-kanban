import React, { useMemo, useState } from 'react';

export function BoardPicker({ boards, activeBoardId, onSelectBoard, onCreateBoard, onRenameBoard }) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const active = useMemo(() => boards.find((b) => b.id === activeBoardId) || null, [boards, activeBoardId]);

  return (
    <div className="boardPicker">
      <select
        className="select"
        value={activeBoardId}
        onChange={(e) => onSelectBoard(e.target.value)}
        aria-label="Select board"
      >
        {boards.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>

      <input
        className="input"
        value={active?.name || ''}
        onChange={(e) => onRenameBoard(e.target.value)}
        aria-label="Rename board"
        placeholder="Board name"
        style={{ width: 220 }}
      />

      {!creating ? (
        <button className="button" onClick={() => { setCreating(true); setNewName(''); }}>
          New board
        </button>
      ) : (
        <form
          className="inlineForm"
          onSubmit={(e) => {
            e.preventDefault();
            const name = newName.trim();
            if (!name) return;
            onCreateBoard(name);
            setCreating(false);
            setNewName('');
          }}
        >
          <input
            className="input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Board name…"
            style={{ width: 160 }}
            autoFocus
          />
          <button className="button primary" type="submit">
            Create
          </button>
          <button className="button" type="button" onClick={() => setCreating(false)}>
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}

