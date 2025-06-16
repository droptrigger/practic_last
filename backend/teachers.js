const express = require('express');
const router = express.Router();

module.exports = (db) => {
  // Получить всех преподавателей
  router.get('/', (req, res) => {
    db.all('SELECT * FROM teachers', [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  });

  // Получить преподавателя по id
  router.get('/:id', (req, res) => {
    db.get('SELECT * FROM teachers WHERE id = ?', [req.params.id], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    });
  });

  // Создать преподавателя
  router.post('/', (req, res) => {
    const { name } = req.body;
    db.run('INSERT INTO teachers (name) VALUES (?)', [name], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, name });
    });
  });

  // Обновить преподавателя
  router.put('/:id', (req, res) => {
    const { name } = req.body;
    db.run('UPDATE teachers SET name = ? WHERE id = ?', [name, req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: req.params.id, name });
    });
  });

  // Удалить преподавателя
  router.delete('/:id', (req, res) => {
    db.run('DELETE FROM teachers WHERE id = ?', [req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ deleted: this.changes });
    });
  });

  return router;
}; 