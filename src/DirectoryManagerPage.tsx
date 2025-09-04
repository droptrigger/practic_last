import React, { useEffect, useState } from 'react';
import { GroupCategories } from './GroupCategories';
import Groups from './Groups';
import Select, { MultiValue } from 'react-select';
import { API } from './config';

type DirectoryType = 'subjects' | 'teachers' | 'rooms' | 'groups' | 'categories';

const directoryNames: Record<DirectoryType, string> = {
  subjects: 'Предметы',
  teachers: 'Преподаватели',
  rooms: 'Кабинеты',
  groups: 'Группы',
  categories: 'Категории групп',
};

const DirectoryManagerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DirectoryType>('subjects');
  const [data, setData] = useState<Record<DirectoryType, any[]>>({
    subjects: [],
    teachers: [],
    rooms: [],
    groups: [],
    categories: [],
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<{ value: string, label: string }[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<Record<number, string[]>>({});
  const [editTeacherId, setEditTeacherId] = useState<number | null>(null);
  const [editSubjects, setEditSubjects] = useState<{ value: string, label: string }[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [search, setSearch] = useState('');

  const fetchData = async (type: DirectoryType) => {
    setLoading(true);
    const res = await fetch(API[type]);
    const json = await res.json();
    setData(prev => ({ ...prev, [type]: Array.isArray(json) ? json : [] }));
    setLoading(false);
    if (type === 'teachers') {
      // Получить связи преподаватель-предмет
      const allSubjects: Record<number, string[]> = {};
      await Promise.all(json.map(async (t: any) => {
        const res2 = await fetch(API.teacherSubjects(t.id));
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
      await fetch(API.teacherSubjects(teacher.id || teacher.insertId || teacher.lastID), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectIds: selectedSubjects.map(s => s.value) }),
      });
      setSelectedSubjects([]);
    } else {
      await fetch(API[activeTab], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: input }),
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
    setEditSubjects((teacherSubjects[teacherId] || [])
      .map((id: string) => {
        const subj = data.subjects.find((s: any) => s.id == id);
        return subj ? { value: subj.id, label: subj.name } : undefined;
      })
      .filter((v): v is { value: string, label: string } => Boolean(v))
    );
  };

  const saveEdit = async () => {
    if (editTeacherId == null) return;
    await fetch(API.teacherSubjects(editTeacherId.toString()), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectIds: editSubjects.map(s => s.value) }),
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
    if (activeTab === 'teachers') {
      setEditSubjects((teacherSubjects[id] || []).map((sid: string) => {
        const subj = data.subjects.find((s: any) => s.id == sid);
        return subj ? { value: subj.id, label: subj.name } : undefined;
      }).filter((v): v is { value: string, label: string } => Boolean(v)));
    }
  };

  const saveEditItem = async () => {
    if (editId == null) return;
    await fetch(`${API[activeTab]}/${editId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editValue }),
    });
    if (activeTab === 'teachers') {
      await fetch(API.teacherSubjects(editId.toString()), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectIds: editSubjects.map(s => s.value) }),
      });
    }
    setEditId(null);
    setEditValue('');
    setEditSubjects([]);
    fetchData(activeTab);
  };

  const cancelEditItem = () => {
    setEditId(null);
    setEditValue('');
  };

  // Поиск по нескольким полям
  const filterItems = (items: any[], search: string, fields: string[]) => {
    const s = search.toLowerCase();
    return items.filter(item =>
      fields.some(field => (item[field] || '').toString().toLowerCase().includes(s))
    );
  };

  // Сортировка по алфавиту для предметов и других справочников
  const getSortedItems = (items: any[], type: DirectoryType) => {
    if (type === 'subjects') {
      return [...items].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'));
    }
    if (type === 'groups') {
      // Уже сортируется в Groups.tsx
      return items;
    }
    if (type === 'categories') {
      // Уже сортируется в GroupCategories.tsx
      return items;
    }
    // Для остальных — по имени
    return [...items].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'));
  };

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 32, background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', minHeight: 400 }}>
      <h2 style={{ textAlign: 'center', marginBottom: 32, color: '#1976d2', letterSpacing: 1 }}>Управление справочниками</h2>
      <div style={{ display: 'flex', gap: 10, marginBottom: 32, justifyContent: 'center' }}>
        {(['subjects', 'teachers', 'rooms', 'groups', 'categories'] as DirectoryType[]).map(type => (
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
      {activeTab === 'categories' ? (
        <GroupCategories />
      ) : activeTab === 'groups' ? (
        <Groups />
      ) : (
        <>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по названию, категории, курсу..."
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
          <div style={{ display: 'flex', gap: 10, marginBottom: 24, alignItems: 'center' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Название"
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #cfd8dc',
                borderRadius: 8,
                fontSize: 16,
                outline: 'none',
                transition: 'border 0.2s',
                minWidth: 0
              }}
            />
            {activeTab === 'teachers' && (
              <div style={{ minWidth: 200, flex: 1 }}>
                <Select
                  isMulti
                  options={data.subjects.map((s: any) => ({ value: s.id, label: s.name }))}
                  value={selectedSubjects}
                  onChange={value => setSelectedSubjects(Array.isArray(value) ? [...value] : [])}
                  placeholder="Выберите предметы..."
                  classNamePrefix="react-select"
                />
              </div>
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
                whiteSpace: 'nowrap'
              }}
            >
              Добавить
            </button>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#1976d2', fontSize: 18, marginTop: 40 }}>Загрузка...</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {filterItems(getSortedItems(data[activeTab], activeTab), search, ['name', 'category_name', 'course'])
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
                        {activeTab === 'teachers' && (
                          <div style={{ minWidth: 200, flex: 1 }}>
                            <Select
                              isMulti
                              options={data.subjects.map((s: any) => ({ value: s.id, label: s.name }))}
                              value={editSubjects}
                              onChange={value => setEditSubjects(Array.isArray(value) ? [...value] : [])}
                              placeholder="Выберите предметы..."
                              classNamePrefix="react-select"
                            />
                          </div>
                        )}
                        <button onClick={saveEditItem} style={{ color: 'green', marginRight: 4, border: 'none', background: 'none', fontWeight: 600, cursor: 'pointer' }}>Сохранить</button>
                        <button onClick={cancelEditItem} style={{ color: '#888', border: 'none', background: 'none', fontWeight: 600, cursor: 'pointer' }}>Отмена</button>
                      </>
                    ) : (
                      <span style={{ fontWeight: 500 }}>{item.name}</span>
                    )}
                    {editId !== item.id && (
                      <button onClick={() => startEditItem(item.id, item.name)} style={{ color: '#1976d2', border: 'none', background: 'none', fontWeight: 600, cursor: 'pointer' }}>Редактировать</button>
                    )}
                    <button onClick={() => handleDelete(item.id)} style={{ color: '#d32f2f', border: 'none', background: 'none', fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}>Удалить</button>
                  </li>
                ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

export default DirectoryManagerPage; 