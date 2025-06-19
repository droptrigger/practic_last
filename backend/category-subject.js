const express = require('express');
const router = express.Router();

module.exports = (db) => {
  // Получить все связи категорий с предметами
  router.get('/', (req, res) => {
    db.all(`
      SELECT cs.*, c.name as category_name, s.name as subject_name
      FROM category_subject cs
      JOIN group_categories c ON cs.category_id = c.id
      JOIN subjects s ON cs.subject_id = s.id
    `, [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  });

  // Получить предметы для категории
  router.get('/category/:categoryId', (req, res) => {
    db.all(`
      SELECT s.*
      FROM subjects s
      JOIN category_subject cs ON s.id = cs.subject_id
      WHERE cs.category_id = ?
    `, [req.params.categoryId], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  });

  // Добавить предмет к категории
  router.post('/', (req, res) => {
    const { category_id, subject_id } = req.body;
    db.run(
      'INSERT INTO category_subject (category_id, subject_id) VALUES (?, ?)',
      [category_id, subject_id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ category_id, subject_id });
      }
    );
  });

  // Удалить предмет из категории
  router.delete('/:categoryId/:subjectId', (req, res) => {
    db.run(
      'DELETE FROM category_subject WHERE category_id = ? AND subject_id = ?',
      [req.params.categoryId, req.params.subjectId],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
      }
    );
  });

  return router;
}; 