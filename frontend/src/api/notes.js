const BASE = '/api/notes';

export const fetchNotes = async () => {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error('ノートの取得に失敗しました');
  return res.json();
};

export const fetchNote = async (id) => {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error('ノートの取得に失敗しました');
  return res.json();
};

export const createNote = async () => {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '無題', content: '' }),
  });
  if (!res.ok) throw new Error('ノートの作成に失敗しました');
  return res.json();
};

export const updateNote = async (id, { title, content }) => {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content }),
  });
  if (!res.ok) throw new Error('ノートの更新に失敗しました');
  return res.json();
};

export const deleteNote = async (id) => {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('ノートの削除に失敗しました');
  return res.json();
};
