const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

// Подключение к базе данных
const db = new sqlite3.Database(path.join(__dirname, 'schedule.db'), (err) => {
  if (err) {
    console.error('Ошибка подключения к базе данных:', err.message);
  } else {
    console.log('Подключено к базе данных SQLite.');
  }
});

// Создание таблиц, если их нет
const createTables = () => {
  db.run(`CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS times (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    time TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS teacher_subject (
    teacher_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    PRIMARY KEY (teacher_id, subject_id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    shift INTEGER NOT NULL,
    data TEXT NOT NULL,
    UNIQUE(date, shift)
  )`);
};

createTables();

// Заглушка для API (добавим CRUD позже)
app.get('/', (req, res) => {
  res.send('Backend работает!');
});

const subjectsRouter = require('./subjects')(db);
const teachersRouter = require('./teachers')(db);
const roomsRouter = require('./rooms')(db);
const timesRouter = require('./times')(db);
const groupsRouter = require('./groups')(db);

app.use('/api/subjects', subjectsRouter);
app.use('/api/teachers', teachersRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/times', timesRouter);
app.use('/api/groups', groupsRouter);

// API для связей преподаватель-предмет
app.get('/api/teacher-subjects/:teacherId', (req, res) => {
  db.all('SELECT subject_id FROM teacher_subject WHERE teacher_id = ?', [req.params.teacherId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => r.subject_id));
  });
});

app.post('/api/teacher-subjects/:teacherId', (req, res) => {
  const { subjectIds } = req.body;
  db.serialize(() => {
    db.run('DELETE FROM teacher_subject WHERE teacher_id = ?', [req.params.teacherId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!Array.isArray(subjectIds) || subjectIds.length === 0) return res.json({});
      const stmt = db.prepare('INSERT INTO teacher_subject (teacher_id, subject_id) VALUES (?, ?)');
      subjectIds.forEach(sid => stmt.run(req.params.teacherId, sid));
      stmt.finalize();
      res.json({});
    });
  });
});

// Получить преподавателей по предмету
app.get('/api/teachers/by-subject/:subjectId', (req, res) => {
  db.all(`SELECT t.* FROM teachers t
    JOIN teacher_subject ts ON t.id = ts.teacher_id
    WHERE ts.subject_id = ?`, [req.params.subjectId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Получить расписание по дате и смене
app.get('/api/schedule', (req, res) => {
  const { date, shift } = req.query;
  if (!date || !shift) return res.status(400).json({ error: 'date and shift required' });
  db.get('SELECT data FROM schedules WHERE date = ? AND shift = ?', [date, shift], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.json(null);
    try {
      res.json(JSON.parse(row.data));
    } catch (e) {
      res.status(500).json({ error: 'Corrupted data' });
    }
  });
});

// Сохранить расписание по дате и смене
app.post('/api/schedule', (req, res) => {
  const { date, shift, data } = req.body;
  if (!date || !shift || !data) return res.status(400).json({ error: 'date, shift, data required' });
  const jsonData = JSON.stringify(data);
  db.run(
    'INSERT INTO schedules (date, shift, data) VALUES (?, ?, ?) ON CONFLICT(date, shift) DO UPDATE SET data = excluded.data',
    [date, shift, jsonData],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Backend сервер запущен на http://localhost:${PORT}`);
}); 