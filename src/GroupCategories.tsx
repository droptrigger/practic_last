import React, { useState, useEffect } from 'react';
import { GroupCategory } from './types';
import './styles/GroupCategories.css';
import Select from 'react-select';
import { API } from './config';

export const GroupCategories: React.FC = () => {
  const [categories, setCategories] = useState<GroupCategory[]>([]);
  const [newCategory, setNewCategory] = useState({ name: '', course: 1 });
  const [editingCategory, setEditingCategory] = useState<GroupCategory | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<any[]>([]);
  const [editingSubjects, setEditingSubjects] = useState<any[]>([]);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCategories();
    fetchSubjects();
  }, []);

  const fetchCategories = async () => {
    const response = await fetch(API.categories);
    const data = await response.json();
    setCategories(data);
  };

  const fetchSubjects = async () => {
    const response = await fetch(API.subjects);
    const data = await response.json();
    setSubjects(data);
  };

  const fetchCategorySubjects = async (categoryId: string) => {
    const response = await fetch(API.categorySubjects(categoryId));
    const data = await response.json();
    return data.map((s: any) => s.id);
  };

  const filterCategories = (items: GroupCategory[], search: string) => {
    const s = search.toLowerCase();
    return items.filter(item =>
      (item.name || '').toLowerCase().includes(s) ||
      (item.course ? String(item.course) : '').includes(s)
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch(API.categories, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCategory),
    });
    const category = await response.json();
    
    if (selectedSubjects.length > 0) {
      for (const subject of selectedSubjects) {
        await fetch(API.categorySubject, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category_id: category.id,
            subject_id: subject.value
          }),
        });
      }
    }
    
    setNewCategory({ name: '', course: 1 });
    setSelectedSubjects([]);
    fetchCategories();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    
    await fetch(`${API.categories}/${editingCategory.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingCategory),
    });

    if (editingSubjects.length > 0) {
      await fetch(`${API.categories}/${editingCategory.id}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectIds: editingSubjects.map((s: any) => s.value) }),
      });
    }

    setEditingCategory(null);
    setEditingSubjects([]);
    setEditingCategoryId(null);
    fetchCategories();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Удалить категорию?')) return;
    
    await fetch(`${API.categories}/${id}`, {
      method: 'DELETE',
    });
    fetchCategories();
  };

  const startEditSubjects = async (categoryId: string) => {
    const subjectIds = await fetchCategorySubjects(categoryId);
    setEditingSubjects(subjects.filter(s => subjectIds.includes(s.id)).map(s => ({ value: s.id, label: s.name })));
    setEditingCategoryId(categoryId);
  };

  const saveSubjects = async () => {
    if (!editingCategoryId) return;
    
    await fetch(`${API.categories}/${editingCategoryId}/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectIds: editingSubjects.map((s: any) => s.value) }),
    });
    
    setEditingCategoryId(null);
    setEditingSubjects([]);
    fetchCategories();
  };

  // Сортировка категорий по алфавиту и курсу
  const sortedCategories = [...categories].sort((a, b) => {
    const nameA = a.name.toLowerCase();
    const nameB = b.name.toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return (a.course || 0) - (b.course || 0);
  });

  return (
    <div className="group-categories">
      <h2>Категории групп</h2>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Поиск по названию, курсу..."
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
          value={newCategory.name}
          onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
          placeholder="Название категории"
          required
        />
        <input
          type="number"
          value={newCategory.course}
          onChange={e => setNewCategory({ ...newCategory, course: parseInt(e.target.value) })}
          min={1}
          max={6}
          required
        />
        <div style={{ minWidth: 200, flex: 1 }}>
          <Select
            isMulti
            options={subjects.map(subject => ({ value: subject.id, label: subject.name }))}
            value={selectedSubjects}
            onChange={value => setSelectedSubjects(Array.isArray(value) ? [...value] : [])}
            placeholder="Выберите предметы..."
            classNamePrefix="react-select"
          />
        </div>
        <button type="submit">Добавить категорию</button>
      </form>

      <div className="categories-list">
        {filterCategories(sortedCategories, search).map(category => (
          <div key={category.id} className="category-item">
            {editingCategory?.id === category.id ? (
              <form onSubmit={handleUpdate} className="edit-form">
                <input
                  type="text"
                  value={editingCategory.name}
                  onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  required
                />
                <input
                  type="number"
                  value={editingCategory.course}
                  onChange={e => setEditingCategory({ ...editingCategory, course: parseInt(e.target.value) })}
                  min={1}
                  max={6}
                  required
                />
                <div style={{ minWidth: 200, flex: 1 }}>
                  <Select
                    isMulti
                    options={subjects.map(subject => ({ value: subject.id, label: subject.name }))}
                    value={editingSubjects}
                    onChange={value => setEditingSubjects(Array.isArray(value) ? [...value] : [])}
                    placeholder="Выберите предметы..."
                    classNamePrefix="react-select"
                  />
                </div>
                <button type="submit">Сохранить</button>
                <button type="button" onClick={() => {
                  setEditingCategory(null);
                  setEditingSubjects([]);
                }}>Отмена</button>
              </form>
            ) : (
              <>
                <div className="category-info">
                  <span>{category.name} (Курс {category.course})</span>
                </div>
                <div className="actions">
                  <button onClick={() => {
                    setEditingCategory(category);
                    // При открытии редактирования подгружаем связанные предметы
                    fetchCategorySubjects(category.id).then(subjectIds => {
                      setEditingSubjects(subjects.filter(s => subjectIds.includes(s.id)).map(s => ({ value: s.id, label: s.name })));
                    });
                  }}>Редактировать</button>
                  <button onClick={() => handleDelete(category.id)} className="delete">Удалить</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GroupCategories; 