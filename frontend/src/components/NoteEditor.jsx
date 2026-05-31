import React, { useEffect, useRef } from 'react';

export default function NoteEditor({ note, onSave }) {
  const titleRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!note) return;
    if (titleRef.current && titleRef.current.value !== note.title) {
      titleRef.current.value = note.title || '';
    }
    if (contentRef.current && contentRef.current.value !== note.content) {
      contentRef.current.value = note.content || '';
    }
  }, [note?.id]);

  if (!note) {
    return (
      <main className="editor editor-empty">
        <p>左のリストからノートを選択するか、<br />「＋」で新規作成してください。</p>
      </main>
    );
  }

  const handleTitleChange = (e) => {
    onSave(note.id, { title: e.target.value, content: contentRef.current?.value ?? note.content });
  };

  const handleContentChange = (e) => {
    onSave(note.id, { title: titleRef.current?.value ?? note.title, content: e.target.value });
  };

  return (
    <main className="editor">
      <div className="editor-header">
        <input
          ref={titleRef}
          className="editor-title"
          defaultValue={note.title || ''}
          placeholder="タイトル"
          onChange={handleTitleChange}
        />
        <span className="editor-meta">
          最終更新: {new Date(note.updated_at).toLocaleString('ja-JP')}
        </span>
      </div>
      <textarea
        ref={contentRef}
        className="editor-content"
        defaultValue={note.content || ''}
        placeholder="ここにメモを書いてください..."
        onChange={handleContentChange}
      />
    </main>
  );
}
