import React, { useEffect, useState } from 'react';

const API = {
  subjects: 'http://localhost:4000/api/subjects',
  teachers: 'http://localhost:4000/api/teachers',
  rooms: 'http://localhost:4000/api/rooms',
  times: 'http://localhost:4000/api/times',
  groups: 'http://localhost:4000/api/groups',
};

type DirectoryType = 'subjects' | 'teachers' | 'rooms' | 'times' | 'groups';

const directoryNames: Record<DirectoryType, string> = {
  subjects: 'Предметы',
  teachers: 'Преподаватели',
  rooms: 'Кабинеты',
  times: 'Время',
  groups: 'Группы',
};

const DirectoryManagerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DirectoryType>('subjects');
  const [data, setData] = useState<Record<DirectoryType, any[]>>({
    subjects: [],
    teachers: [],
    rooms: [],
    times: [],
    groups: [],
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<Record<number, string[]>>({});
  const [editTeacherId, setEditTeacherId] = useState<number | null>(null);
  const [editSubjects, setEditSubjects] = useState<string[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [search, setSearch] = useState('');

  const fetchData = async (type: DirectoryType) => {
    setLoading(true);
    const res = await fetch(API[type]);
    const json = await res.json();
    setData(prev => ({ ...prev, [type]: json }));
    setLoading(false);
    if (type === 'teachers') {
      // Получить связи преподаватель-предмет
      const allSubjects: Record<number, string[]> = {};
      await Promise.all(json.map(async (t: any) => {
        const res2 = await fetch(`http://localhost:4000/api/teacher-subjects/${t.id}`);
        const subjIds = await res2.json();
        allSubjects[t.id] = subjIds;
      }));
      setTeacherSubjects(allSubjects);
    }
  };

  useEffect(() => {
    fetchData(activeTab);
    // eslint-disable-next-line
  }, [activeTab]);

  const handleAdd = async () => {
    if (!input.trim()) return;
    if (activeTab === 'teachers') {
      // Сначала создаём преподавателя
      const res = await fetch(API[activeTab], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: input }),
      });
      const teacher = await res.json();
      // Затем сохраняем связи с предметами
      await fetch(`http://localhost:4000/api/teacher-subjects/${teacher.id || teacher.insertId || teacher.lastID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectIds: selectedSubjects }),
      });
      setSelectedSubjects([]);
    } else {
      await fetch(API[activeTab], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeTab === 'times' ? { time: input } : { name: input }),
      });
    }
    setInput('');
    fetchData(activeTab);
  };

  const handleDelete = async (id: number) => {
    await fetch(`${API[activeTab]}/${id}`, { method: 'DELETE' });
    fetchData(activeTab);
  };

  const startEdit = (teacherId: number) => {
    setEditTeacherId(teacherId);
    setEditSubjects(teacherSubjects[teacherId] || []);
  };

  const saveEdit = async () => {
    if (editTeacherId == null) return;
    await fetch(`http://localhost:4000/api/teacher-subjects/${editTeacherId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectIds: editSubjects }),
    });
    setEditTeacherId(null);
    setEditSubjects([]);
    fetchData('teachers');
  };

  const cancelEdit = () => {
    setEditTeacherId(null);
    setEditSubjects([]);
  };

  const startEditItem = (id: number, value: string) => {
    setEditId(id);
    setEditValue(value);
  };

  const saveEditItem = async () => {
    if (editId == null) return;
    await fetch(`${API[activeTab]}/${editId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activeTab === 'times' ? { time: editValue } : { name: editValue }),
    });
    setEditId(null);
    setEditValue('');
    fetchData(activeTab);
  };

  const cancelEditItem = () => {
    setEditId(null);
    setEditValue('');
  };

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 32, background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', minHeight: 400 }}>
      <h2 style={{ textAlign: 'center', marginBottom: 32, color: '#1976d2', letterSpacing: 1 }}>Управление справочниками</h2>
      <div style={{ display: 'flex', gap: 10, marginBottom: 32, justifyContent: 'center' }}>
        {(['subjects', 'teachers', 'rooms', 'times', 'groups'] as DirectoryType[]).map(type => (
          <button
            key={type}
            onClick={() => { setActiveTab(type); setSearch(''); }}
            style={{
              fontWeight: activeTab === type ? 700 : 400,
              background: activeTab === type ? '#1976d2' : '#f5f5f5',
              color: activeTab === type ? '#fff' : '#333',
              border: 'none',
              borderRadius: 8,
              padding: '8px 20px',
              cursor: 'pointer',
              boxShadow: activeTab === type ? '0 2px 8px rgba(25,118,210,0.08)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {directoryNames[type]}
          </button>
        ))}
      </div>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={activeTab === 'times' ? 'Поиск по времени' : 'Поиск по названию'}
        style={{
          marginBottom: 18,
          padding: '8px 12px',
          border: '1px solid #cfd8dc',
          borderRadius: 8,
          fontSize: 16,
          minWidth: 180,
          outline: 'none',
          transition: 'border 0.2s',
          width: '100%'
        }}
      />
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={activeTab === 'times' ? 'Время (например, 13:00)' : 'Название'}
          style={{
            marginRight: 8,
            padding: '8px 12px',
            border: '1px solid #cfd8dc',
            borderRadius: 8,
            fontSize: 16,
            minWidth: 180,
            outline: 'none',
            transition: 'border 0.2s',
          }}
        />
        {activeTab === 'teachers' && (
          <select
            multiple
            value={selectedSubjects}
            onChange={e => setSelectedSubjects(Array.from(e.target.selectedOptions, o => o.value))}
            style={{ minWidth: 120, marginRight: 8, padding: 8, borderRadius: 8, border: '1px solid #cfd8dc', fontSize: 15 }}
          >
            {data.subjects.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
        <button
          onClick={handleAdd}
          disabled={loading || !input.trim() || (activeTab === 'teachers' && selectedSubjects.length === 0)}
          style={{
            background: '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '8px 20px',
            fontWeight: 600,
            fontSize: 16,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            boxShadow: '0 2px 8px rgba(25,118,210,0.08)',
            transition: 'all 0.2s',
          }}
        >
          Добавить
        </button>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', color: '#1976d2', fontSize: 18, marginTop: 40 }}>Загрузка...</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {data[activeTab]
            .filter(item => {
              const value = (item.name || item.time || '').toLowerCase();
              return value.includes(search.toLowerCase());
            })
            .map((item: any) => (
              <li
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: '#f5f7fa',
                  borderRadius: 10,
                  marginBottom: 14,
                  padding: '12px 18px',
                  boxShadow: '0 1px 4px rgba(25,118,210,0.04)',
                  fontSize: 16,
                  position: 'relative',
                }}
              >
                {editId === item.id ? (
                  <>
                    <input
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      style={{ marginRight: 8, padding: '6px 10px', borderRadius: 6, border: '1px solid #b0bec5', fontSize: 15 }}
                    />
                    <button onClick={saveEditItem} style={{ color: 'green', marginRight: 4, border: 'none', background: 'none', fontWeight: 600, cursor: 'pointer' }}>Сохранить</button>
                    <button onClick={cancelEditItem} style={{ color: '#888', border: 'none', background: 'none', fontWeight: 600, cursor: 'pointer' }}>Отмена</button>
                  </>
                ) : (
                  <span style={{ fontWeight: 500 }}>{item.name || item.time}</span>
                )}
                {activeTab === 'teachers' && teacherSubjects[item.id] && (
                  <span style={{ fontSize: '0.95em', color: '#555' }}>
                    ({teacherSubjects[item.id].map((sid: string) => {
                      const subj = data.subjects.find((s: any) => s.id == sid);
                      return subj ? subj.name : '';
                    }).filter(Boolean).join(', ')})
                  </span>
                )}
                {activeTab === 'teachers' && (
                  editTeacherId === item.id ? (
                    <>
                      <select
                        multiple
                        value={editSubjects}
                        onChange={e => setEditSubjects(Array.from(e.target.selectedOptions, o => o.value))}
                        style={{ minWidth: 120, padding: 8, borderRadius: 8, border: '1px solid #cfd8dc', fontSize: 15 }}
                      >
                        {data.subjects.map((s: any) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <button onClick={saveEdit} style={{ color: 'green', marginRight: 4, border: 'none', background: 'none', fontWeight: 600, cursor: 'pointer' }}>Сохранить</button>
                      <button onClick={cancelEdit} style={{ color: '#888', border: 'none', background: 'none', fontWeight: 600, cursor: 'pointer' }}>Отмена</button>
                    </>
                  ) : (
                    <button onClick={() => startEdit(item.id)} style={{ color: '#1976d2', border: 'none', background: 'none', fontWeight: 600, cursor: 'pointer' }}>Редактировать предметы</button>
                  )
                )}
                {editId !== item.id && (
                  <button onClick={() => startEditItem(item.id, item.name || item.time)} style={{ color: '#1976d2', border: 'none', background: 'none', fontWeight: 600, cursor: 'pointer' }}>Редактировать</button>
                )}
                <button onClick={() => handleDelete(item.id)} style={{ color: '#d32f2f', border: 'none', background: 'none', fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}>Удалить</button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
};

export default DirectoryManagerPage; 