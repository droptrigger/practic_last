const express = require('express');
const router = express.Router();

module.exports = (db) => {
  // Получить все группы с их категориями
  router.get('/', (req, res) => {
    db.all(`
      SELECT g.*, gc.name as category_name, gc.course 
      FROM groups g
      LEFT JOIN group_categories gc ON g.category_id = gc.id
    `, [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  });

  // Получить группу по id с её категорией
  router.get('/:id', (req, res) => {
    db.get(`
      SELECT g.*, gc.name as category_name, gc.course 
      FROM groups g
      LEFT JOIN group_categories gc ON g.category_id = gc.id
      WHERE g.id = ?
    `, [req.params.id], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    });
  });

  // Создать группу
  router.post('/', (req, res) => {
    const { name, category_id } = req.body;
    db.run('INSERT INTO groups (name, category_id) VALUES (?, ?)', 
      [name, category_id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, name, category_id });
    });
  });

  // Обновить группу
  router.put('/:id', (req, res) => {
    const { name, category_id } = req.body;
    db.run('UPDATE groups SET name = ?, category_id = ? WHERE id = ?', 
      [name, category_id, req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: req.params.id, name, category_id });
    });
  });

  // Удалить группу
  router.delete('/:id', (req, res) => {
    db.run('DELETE FROM groups WHERE id = ?', [req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ deleted: this.changes });
    });
  });

  return router;
}; 