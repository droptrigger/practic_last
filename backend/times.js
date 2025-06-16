const express = require('express');
const router = express.Router();

module.exports = (db) => {
  // Получить все времена
  router.get('/', (req, res) => {
    db.all('SELECT * FROM times', [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  });

  // Получить время по id
  router.get('/:id', (req, res) => {
    db.get('SELECT * FROM times WHERE id = ?', [req.params.id], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    });
  });

  // Создать время
  router.post('/', (req, res) => {
    const { time } = req.body;
    db.run('INSERT INTO times (time) VALUES (?)', [time], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, time });
    });
  });

  // Обновить время
  router.put('/:id', (req, res) => {
    const { time } = req.body;
    db.run('UPDATE times SET time = ? WHERE id = ?', [time, req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: req.params.id, time });
    });
  });

  // Удалить время
  router.delete('/:id', (req, res) => {
    db.run('DELETE FROM times WHERE id = ?', [req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ deleted: this.changes });
    });
  });

  return router;
}; 