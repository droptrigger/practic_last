const express = require('express');
const router = express.Router();

module.exports = (db) => {
  // Получить все категории
  router.get('/', (req, res) => {
    db.all('SELECT * FROM group_categories', [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  });

  // Получить категорию по id
  router.get('/:id', (req, res) => {
    db.get('SELECT * FROM group_categories WHERE id = ?', [req.params.id], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    });
  });

  // Создать категорию
  router.post('/', (req, res) => {
    const { name, course } = req.body;
    db.run('INSERT INTO group_categories (name, course) VALUES (?, ?)', [name, course], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, name, course });
    });
  });

  // Обновить категорию
  router.put('/:id', (req, res) => {
    const { name, course } = req.body;
    db.run('UPDATE group_categories SET name = ?, course = ? WHERE id = ?', 
      [name, course, req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: req.params.id, name, course });
    });
  });

  // Удалить категорию
  router.delete('/:id', (req, res) => {
    db.run('DELETE FROM group_categories WHERE id = ?', [req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ deleted: this.changes });
    });
  });

  // Получить предметы категории
  router.get('/:id/subjects', (req, res) => {
    db.all(`
      SELECT s.* FROM subjects s
      JOIN category_subject cs ON s.id = cs.subject_id
      WHERE cs.category_id = ?
    `, [req.params.id], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  });

  // Добавить предметы к категории
  router.post('/:id/subjects', (req, res) => {
    const { subjectIds } = req.body;
    db.serialize(() => {
      db.run('DELETE FROM category_subject WHERE category_id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!Array.isArray(subjectIds) || subjectIds.length === 0) return res.json({});
        const stmt = db.prepare('INSERT INTO category_subject (category_id, subject_id) VALUES (?, ?)');
        subjectIds.forEach(sid => stmt.run(req.params.id, sid));
        stmt.finalize();
        res.json({});
      });
    });
  });

  return router;
}; 