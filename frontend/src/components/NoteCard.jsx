import React from 'react';

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function excerpt(text, max = 80) {
  const oneLine = (text || '').replace(/\n+/g, ' ').trim();
  return oneLine.length > max ? oneLine.slice(0, max) + '…' : oneLine;
}

export default function NoteCard({ note, selected, onClick, onDelete }) {
  return (
    <div
      className={`note-card${selected ? ' selected' : ''}`}
      onClick={onClick}
    >
      <div className="note-card-header">
        <span className="note-card-title">{note.title || '無題'}</span>
        <button
          className="note-card-delete"
          title="削除"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(note.id);
          }}
        >
          ✕
        </button>
      </div>
      <p className="note-card-excerpt">{excerpt(note.content)}</p>
      <span className="note-card-date">{formatDate(note.updated_at)}</span>
    </div>
  );
}
