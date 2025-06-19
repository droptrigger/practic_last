import React, { useState, useEffect } from 'react';
import { Group, GroupCategory } from './types';
import './styles/Groups.css';
import Select from 'react-select';

export const Groups: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<GroupCategory[]>([]);
  const [newGroup, setNewGroup] = useState({ name: '', category_id: '' });
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchGroups();
    fetchCategories();
  }, []);

  const fetchGroups = async () => {
    const response = await fetch('http://localhost:4000/api/groups');
    const data = await response.json();
    setGroups(data);
  };

  const fetchCategories = async () => {
    const response = await fetch('http://localhost:4000/api/group-categories');
    const data = await response.json();
    setCategories(data);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('http://localhost:4000/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newGroup, category_id: selectedCategory ? selectedCategory.value : '' }),
    });
    setNewGroup({ name: '', category_id: '' });
    setSelectedCategory(null);
    fetchGroups();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;
    await fetch(`http://localhost:4000/api/groups/${editingGroup.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editingGroup, category_id: editingCategory ? editingCategory.value : '' }),
    });
    setEditingGroup(null);
    setEditingCategory(null);
    fetchGroups();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Удалить группу?')) return;
    await fetch(`http://localhost:4000/api/groups/${id}`, {
      method: 'DELETE',
    });
    fetchGroups();
  };

  // Сортировка категорий по алфавиту и курсу
  const sortedCategories = [...categories].sort((a, b) => {
    const nameA = a.name.toLowerCase();
    const nameB = b.name.toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return (a.course || 0) - (b.course || 0);
  });
  const categoryOptions = sortedCategories.map(category => ({ value: category.id, label: `${category.name} (Курс ${category.course})` }));

  // Сортировка групп по алфавиту и категории
  const sortedGroups = [...groups].sort((a, b) => {
    const nameA = a.name.toLowerCase();
    const nameB = b.name.toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    // Если названия одинаковые, сортируем по категории
    const catA = (a.category_name || '').toLowerCase();
    const catB = (b.category_name || '').toLowerCase();
    if (catA < catB) return -1;
    if (catA > catB) return 1;
    // Если категории одинаковые, сортируем по курсу
    return (a.course || 0) - (b.course || 0);
  });

  // Фильтрация по нескольким полям
  const filterGroups = (items: Group[], search: string) => {
    const s = search.toLowerCase();
    return items.filter(item =>
      (item.name || '').toLowerCase().includes(s) ||
      (item.category_name || '').toLowerCase().includes(s) ||
      (item.course ? String(item.course) : '').includes(s)
    );
  };

  return (
    <div className="groups">
      <h2>Группы</h2>
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
      <form onSubmit={handleCreate} className="create-form">
        <input
          type="text"
          value={newGroup.name}
          onChange={e => setNewGroup({ ...newGroup, name: e.target.value })}
          placeholder="Название группы"
          required
        />
        <div style={{ minWidth: 200, flex: 1 }}>
          <Select
            options={categoryOptions}
            value={selectedCategory}
            onChange={setSelectedCategory}
            placeholder="Выберите категорию..."
            classNamePrefix="react-select"
            isClearable
          />
        </div>
        <button type="submit">Добавить группу</button>
      </form>
      <div className="groups-list">
        {filterGroups(sortedGroups, search).map(group => (
          <div key={group.id} className="group-item">
            {editingGroup?.id === group.id ? (
              <form onSubmit={handleUpdate} className="edit-form">
                <input
                  type="text"
                  value={editingGroup.name}
                  onChange={e => setEditingGroup({ ...editingGroup, name: e.target.value })}
                  required
                />
                <div style={{ minWidth: 200, flex: 1 }}>
                  <Select
                    options={categoryOptions}
                    value={editingCategory}
                    onChange={setEditingCategory}
                    placeholder="Выберите категорию..."
                    classNamePrefix="react-select"
                    isClearable
                  />
                </div>
                <button type="submit">Сохранить</button>
                <button type="button" onClick={() => { setEditingGroup(null); setEditingCategory(null); }}>Отмена</button>
              </form>
            ) : (
              <>
                <div className="group-info">
                  <span className="group-name">{group.name}</span>
                  {group.category_name && (
                    <span className="group-category">
                      {group.category_name} (Курс {group.course})
                    </span>
                  )}
                </div>
                <div className="actions">
                  <button onClick={() => {
                    setEditingGroup(group);
                    setEditingCategory(categoryOptions.find(opt => opt.value === group.category_id) || null);
                  }}>Редактировать</button>
                  <button onClick={() => handleDelete(group.id)} className="delete">Удалить</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Groups; 