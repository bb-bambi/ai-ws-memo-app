import React from 'react';
import NoteCard from './NoteCard';

export default function Sidebar({ notes, selectedId, onSelect, onAdd, onDelete }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">メモ</span>
        <button className="btn-new" onClick={onAdd} title="新規ノート">
          ＋
        </button>
      </div>
      <div className="note-list">
        {notes.length === 0 ? (
          <p className="note-list-empty">ノートがありません</p>
        ) : (
          notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              selected={note.id === selectedId}
              onClick={() => onSelect(note.id)}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </aside>
  );
}
