import React, { useState } from 'react';

export function CreateBar({ onCreateList }) {
  const [name, setName] = useState('');

  return (
    <div className="createBar">
      <form
        className="inlineForm"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = name.trim();
          if (!trimmed) return;
          onCreateList(trimmed);
          setName('');
        }}
      >
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add a list (column)…"
          style={{ width: 260 }}
        />
        <button className="button primary" type="submit">
          Add list
        </button>
      </form>
    </div>
  );
}

