import React from 'react';
import Sidebar from './components/Sidebar';
import NoteEditor from './components/NoteEditor';
import { useNotes } from './hooks/useNotes';
import './App.css';

export default function App() {
  const {
    notes,
    selectedId,
    selectedNote,
    loading,
    error,
    setSelectedId,
    addNote,
    removeNote,
    saveNote,
  } = useNotes();

  return (
    <div className="app">
      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}
      {loading ? (
        <div className="loading">読み込み中...</div>
      ) : (
        <>
          <Sidebar
            notes={notes}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAdd={addNote}
            onDelete={removeNote}
          />
          <NoteEditor
            note={selectedNote}
            onSave={saveNote}
          />
        </>
      )}
    </div>
  );
}
