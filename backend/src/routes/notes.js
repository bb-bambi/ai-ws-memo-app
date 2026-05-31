const express = require('express');
const router = express.Router();
const db = require('../db/knex');

router.get('/', async (req, res) => {
  try {
    const notes = await db('notes').orderBy('updated_at', 'desc');
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const note = await db('notes').where({ id: req.params.id }).first();
    if (!note) return res.status(404).json({ error: 'ノートが見つかりません' });
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title = '無題', content = '' } = req.body;
    const [note] = await db('notes').insert({ title, content }).returning('*');
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, content } = req.body;
    const [note] = await db('notes')
      .where({ id: req.params.id })
      .update({ title, content, updated_at: db.fn.now() })
      .returning('*');
    if (!note) return res.status(404).json({ error: 'ノートが見つかりません' });
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const count = await db('notes').where({ id: req.params.id }).del();
    if (!count) return res.status(404).json({ error: 'ノートが見つかりません' });
    res.json({ message: '削除しました' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
