import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from '../api/notes';

export function useNotes() {
  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const saveTimer = useRef(null);

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.fetchNotes();
      setNotes(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null;

  const addNote = async () => {
    try {
      const note = await api.createNote();
      setNotes((prev) => [note, ...prev]);
      setSelectedId(note.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const removeNote = async (id) => {
    try {
      await api.deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (selectedId === id) {
        const remaining = notes.filter((n) => n.id !== id);
        setSelectedId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const saveNote = useCallback((id, fields) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...fields } : n))
    );

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const updated = await api.updateNote(id, fields);
        setNotes((prev) =>
          prev.map((n) => (n.id === id ? updated : n))
        );
      } catch (err) {
        setError(err.message);
      }
    }, 600);
  }, []);

  return {
    notes,
    selectedId,
    selectedNote,
    loading,
    error,
    setSelectedId,
    addNote,
    removeNote,
    saveNote,
  };
}
