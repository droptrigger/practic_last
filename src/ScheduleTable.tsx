import React, { useState, useEffect } from 'react';
import { ScheduleCell } from './types';
import './styles/ScheduleTable.css';
import Select from 'react-select';
import TimePicker from 'react-time-picker';

const GROUPS_IN_ROW = 7;
const MIN_LESSONS = 4;
const MAX_LESSONS = 6;
const COLUMN_WIDTH = 180;

const DEFAULT_BELL_TIMES = [
  '08:30', '10:00', '11:50', '13:20', '14:50',
  '15:00', '15:30', '16:00', '17:30'
];

// Добавляем время окончания пар (90 минут после начала)
const DEFAULT_BELL_END_TIMES = DEFAULT_BELL_TIMES.map(time => {
  const [hours, minutes] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + 90;
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
});

interface BellTimes {
  [key: number]: string;
}

interface BellTimeRanges {
  start: string;
  end: string;
}

// Функция для проверки пересечения временных интервалов
const isTimeRangesOverlap = (range1: BellTimeRanges, range2: BellTimeRanges): boolean => {
  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const start1 = timeToMinutes(range1.start);
  const end1 = timeToMinutes(range1.end);
  const start2 = timeToMinutes(range2.start);
  const end2 = timeToMinutes(range2.end);

  return (start1 < end2 && end1 > start2);
};

// Функция для получения временного диапазона пары
const getLessonTimeRange = (time: string | undefined, lessonNumber: number, bellTimes: BellTimes): BellTimeRanges => {
  if (time) {
    // Если указано нестандартное время, считаем что пара длится 90 минут
    const [hours, minutes] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + 90;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return {
      start: time,
      end: `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`
    };
  } else {
    // Используем стандартное время из настроек
    const startTime = bellTimes[lessonNumber];
    const endTime = DEFAULT_BELL_END_TIMES[lessonNumber - 1];
    return { start: startTime, end: endTime };
  }
};

const emptyCell: ScheduleCell = { subjectId: '', teacherId: '', roomId: '' };

// Для каждого ряда: группы, количество пар, расписание
interface GroupRow {
  groups: (string | null)[];
  lessons: number;
  schedule: ScheduleCell[][]; // [lesson][group]
}

interface ScheduleTableProps {
  startLessonNumber?: number;
  date: string;
}

// Компонент для отображения одного ряда групп
const GroupRowTable: React.FC<{
  row: GroupRow;
  rowIdx: number;
  hovered: any;
  setHovered: any;
  handleGroupChange: any;
  handleLessonsChange: any;
  handleCellChange: any;
  isTeacherConflict: any;
  isRoomConflict: any;
  allSelectedGroups: string[];
  startLessonNumber: number;
  subjects: any[];
  teachers: any[];
  rooms: any[];
  groups: any[];
  allGroupRows: GroupRow[];
  allGroups: any[];
  times: any[];
  currentShift: number;
  otherShiftGroups: string[];
}> = ({ row, rowIdx, hovered, setHovered, handleGroupChange, handleLessonsChange, handleCellChange, isTeacherConflict, isRoomConflict, allSelectedGroups, startLessonNumber, subjects, teachers, rooms, groups, allGroupRows, allGroups, times, currentShift, otherShiftGroups }) => {
  const [showSecondTeacherCells, setShowSecondTeacherCells] = useState<{[key: string]: boolean}>({});
  const [showSecondRoomCells, setShowSecondRoomCells] = useState<{[key: string]: boolean}>({});
  const [subjectTeachers, setSubjectTeachers] = useState<Record<string, any[]>>({});
  const [categorySubjects, setCategorySubjects] = useState<Record<string, any[]>>({});

  // Загружать преподавателей для выбранного предмета
  const fetchTeachers = async (subjectId: string) => {
    if (!subjectId || subjectTeachers[subjectId]) return;
    const res = await fetch(`http://localhost:4000/api/teachers/by-subject/${subjectId}`);
    const json = await res.json();
    const teachersWithStringIds = json.map((teacher: any) => ({
      ...teacher,
      id: String(teacher.id)
    }));
    setSubjectTeachers(prev => ({ ...prev, [subjectId]: teachersWithStringIds }));
  };

  // Загружать предметы для категории группы
  const fetchCategorySubjects = async (categoryId: string) => {
    if (!categoryId || categorySubjects[categoryId]) return;
    const res = await fetch(`http://localhost:4000/api/subjects/by-category/${categoryId}`);
    const json = await res.json();
    const subjectsWithStringIds = json.map((subject: any) => ({
      ...subject,
      id: String(subject.id)
    }));
    setCategorySubjects(prev => ({ ...prev, [categoryId]: subjectsWithStringIds }));
  };

  useEffect(() => {
    // Предзагрузка для уже выбранных предметов
    row.schedule.forEach(lessonArr => {
      lessonArr.forEach(cell => {
        if (cell.subjectId) fetchTeachers(cell.subjectId);
      });
    });
    // При загрузке строки, если есть teacherId2, раскрыть второй выпадающий список
    const newShow: {[key: string]: boolean} = {};
    row.schedule.forEach((lessonArr, lessonIdx) => {
      lessonArr.forEach((cell, groupIdx) => {
        if (cell.teacherId2) {
          newShow[`${lessonIdx}-${groupIdx}`] = true;
        }
      });
    });
    setShowSecondTeacherCells(newShow);
    // eslint-disable-next-line
  }, [row.schedule]);

  // Получить доступные предметы для группы
  const getAvailableSubjects = (groupId: string) => {
    const group = allGroups.find(g => g.id === groupId);
    if (!group || !group.category_id) return subjects;
    return categorySubjects[group.category_id] || subjects;
  };

  const toggleSecondTeacher = (lessonIdx: number, groupIdx: number) => {
    const key = `${lessonIdx}-${groupIdx}`;
    setShowSecondTeacherCells(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    if (showSecondTeacherCells[key]) {
      handleCellChange(rowIdx, lessonIdx, groupIdx, 'teacherId2', '');
    }
  };

  const toggleSecondRoom = (lessonIdx: number, groupIdx: number) => {
    const key = `${lessonIdx}-${groupIdx}`;
    setShowSecondRoomCells(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    if (showSecondRoomCells[key]) {
      handleCellChange(rowIdx, lessonIdx, groupIdx, 'roomId2', '');
    }
  };

  return (
    <table border={1} cellPadding={6} className="schedule-table">
      <thead>
        <tr>
          <th style={{ maxWidth: 40 }}></th>
          {row.groups.map((groupId, groupIdx) => {
            // Получаем все выбранные группы во всех рядах этой смены, кроме текущей ячейки
            const allSelectedGroupsInShift = allGroupRows
              .flatMap((r, rIdx) => r.groups.map((g, gIdx) => ({ g, rIdx, gIdx })))
              .filter(({ g, rIdx, gIdx }) => g && !(rIdx === rowIdx && gIdx === groupIdx))
              .map(({ g }) => g);
            // Только те группы, которые не выбраны в других ячейках всех рядов, или уже выбраны в этой
            const groupOptions = Array.isArray(allGroups) ? allGroups
              .filter(group => {
                if (group.id === groupId) return true;
                if (allSelectedGroupsInShift.includes(group.id)) return false;
                if (currentShift === 2 && otherShiftGroups.includes(group.id)) return false;
                if (currentShift === 1 && otherShiftGroups.includes(group.id)) return false;
                return true;
              })
              .map(group => ({
                value: group.id,
                label: group.name,
              })) : [];
            return (
              <th key={rowIdx + '-' + groupIdx} style={{ minWidth: COLUMN_WIDTH, width: COLUMN_WIDTH }}>
                <Select
                  value={groupOptions.find(opt => opt.value === groupId) || null}
                  onChange={opt => handleGroupChange(rowIdx, groupIdx, opt ? opt.value : null)}
                  options={groupOptions}
                  placeholder="Выберите группу"
                  isClearable
                />
              </th>
            );
          })}
        </tr>
        <tr>
          <th></th>
          <th colSpan={GROUPS_IN_ROW} className="lessons-count">
            <label>
              Количество пар:
              <select
                value={row.lessons}
                onChange={e => handleLessonsChange(rowIdx, Number(e.target.value))}
                className="lessons-select"
              >
                {Array.from(
                  { length: (currentShift === 1 ? 6 : 9) - MIN_LESSONS + 1 }, 
                  (_, i) => i + MIN_LESSONS
                ).map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
          </th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: row.lessons }, (_, lessonIdx) => (
          <tr key={lessonIdx}>
            <td className="lesson-number">{lessonIdx + startLessonNumber}</td>
            {row.groups.map((groupId, groupIdx) => (
              <td key={rowIdx + '-' + groupIdx + '-' + lessonIdx} className="group-cell">
                {groupId ? (
                  <div className="cell-content" style={{display: 'flex', flexDirection: 'column', gap: 4}}>
                    <div className="subject-row" style={{width: '100%'}}>
                      <div style={{ width: '100%' }}>
                        <Select
                          value={subjects
                            .map(subject => ({ value: subject.id, label: subject.name }))
                            .find(opt => opt.value === row.schedule[lessonIdx][groupIdx].subjectId) || null}
                          onChange={opt => handleCellChange(rowIdx, lessonIdx, groupIdx, 'subjectId', opt ? opt.value : '')}
                          options={getAvailableSubjects(groupId).map(subject => ({ value: subject.id, label: subject.name }))}
                          placeholder="Выберите предмет"
                          isClearable
                          menuPlacement="auto"
                          styles={{ menu: base => ({ ...base, zIndex: 9999 }), container: base => ({ ...base, width: '100%' }) }}
                          classNamePrefix="react-select-subject"
                          onFocus={() => {
                            const group = allGroups.find(g => g.id === groupId);
                            if (group?.category_id) {
                              fetchCategorySubjects(group.category_id);
                            }
                          }}
                        />
                      </div>
                    </div>
                    {row.schedule[lessonIdx][groupIdx].subjectId && (
                      <>
                        <div className="teacher-room-row" style={{display: 'flex', flexDirection: 'row', gap: 4, width: '100%'}}>
                          <div className="select-container" style={{flex: 3}}>
                            <select
                              value={row.schedule[lessonIdx][groupIdx].teacherId}
                              onChange={e => handleCellChange(rowIdx, lessonIdx, groupIdx, 'teacherId', e.target.value)}
                              className={`select ${isTeacherConflict(rowIdx, lessonIdx, groupIdx, 'teacherId') ? 'select-error' : ''} ${hovered && hovered.row === rowIdx && hovered.lesson === lessonIdx && hovered.col === groupIdx && hovered.field === 'teacher' ? 'select-hover' : ''}`}
                              onMouseEnter={() => setHovered({row: rowIdx, lesson: lessonIdx, col: groupIdx, field: 'teacher'})}
                              onMouseLeave={() => setHovered(null)}
                              onFocus={() => fetchTeachers(row.schedule[lessonIdx][groupIdx].subjectId)}
                            >
                              <option value="">Преподаватель</option>
                              {(row.schedule[lessonIdx][groupIdx].subjectId
                                ? subjectTeachers[row.schedule[lessonIdx][groupIdx].subjectId] || []
                                : teachers
                              ).map(teacher => (
                                <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="select-container" style={{flex: 2}}>
                            <select
                              value={row.schedule[lessonIdx][groupIdx].roomId}
                              onChange={e => handleCellChange(rowIdx, lessonIdx, groupIdx, 'roomId', e.target.value)}
                              className={`select room-select ${isRoomConflict(rowIdx, lessonIdx, groupIdx, 'roomId') ? 'select-error' : ''} 
                              ${hovered && hovered.row === rowIdx && hovered.lesson === lessonIdx && hovered.col === groupIdx && hovered.field === 'room' 
                                ? 'select-hover' 
                                : ''}`}
                              onMouseEnter={() => setHovered({row: rowIdx, lesson: lessonIdx, col: groupIdx, field: 'room'})}
                              onMouseLeave={() => setHovered(null)}
                              style={{ color: '#000', background: '#fff' }}
                            >
                              <option value="" style={{ color: '#000', background: '#fff' }}>Кабинет</option>
                              {rooms
                                .slice()
                                .sort((a, b) => {
                                  // Сортируем по числовому номеру, если есть, иначе по имени
                                  const aNum = parseInt(a.number || a.name, 10);
                                  const bNum = parseInt(b.number || b.name, 10);
                                  if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
                                  return (a.name || a.number || '').localeCompare(b.name || b.number || '');
                                })
                                .map(room => (
                                  <option key={room.id} value={room.id} style={{ color: '#000', background: '#fff' }}>
                                    {room.name || room.number}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>
                        {showSecondTeacherCells[`${lessonIdx}-${groupIdx}`] && (
                          <>
                            <div className="teacher-room-row" style={{display: 'flex', flexDirection: 'row', gap: 4, width: '100%'}}>
                              <div className="select-container" style={{flex: 3}}>
                                <select
                                  value={row.schedule[lessonIdx][groupIdx].teacherId2 || ''}
                                  onChange={e => handleCellChange(rowIdx, lessonIdx, groupIdx, 'teacherId2', e.target.value)}
                                  className={`select ${isTeacherConflict(rowIdx, lessonIdx, groupIdx, 'teacherId2') ? 'select-error' : ''} ${hovered && hovered.row === rowIdx && hovered.lesson === lessonIdx && hovered.col === groupIdx && hovered.field === 'teacher2' ? 'select-hover' : ''}`}
                                  onMouseEnter={() => setHovered({row: rowIdx, lesson: lessonIdx, col: groupIdx, field: 'teacher2'})}
                                  onMouseLeave={() => setHovered(null)}
                                  onFocus={() => fetchTeachers(row.schedule[lessonIdx][groupIdx].subjectId)}
                                >
                                  <option value="">Преподаватель</option>
                                  {(row.schedule[lessonIdx][groupIdx].subjectId
                                    ? subjectTeachers[row.schedule[lessonIdx][groupIdx].subjectId] || []
                                    : teachers
                                  ).map(teacher => (
                                    <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="select-container" style={{flex: 2}}>
                                <select
                                  value={row.schedule[lessonIdx][groupIdx].roomId2 || ''}
                                  onChange={e => handleCellChange(rowIdx, lessonIdx, groupIdx, 'roomId2', e.target.value)}
                                  className={`select room-select ${isRoomConflict(rowIdx, lessonIdx, groupIdx, 'roomId2') ? 'select-error' : ''} ${hovered && hovered.row === rowIdx && hovered.lesson === lessonIdx && hovered.col === groupIdx && hovered.field === 'room2' ? 'select-hover' : ''}`}
                                  onMouseEnter={() => setHovered({row: rowIdx, lesson: lessonIdx, col: groupIdx, field: 'room2'})}
                                  onMouseLeave={() => setHovered(null)}
                                  style={{color: '#000', background: '#fff'}}
                                >
                                  <option value="" style={{color: '#000', background: '#fff'}}>Кабинет</option>
                                  {rooms
                                    .slice()
                                    .sort((a, b) => {
                                      // Сортируем по числовому номеру, если есть, иначе по имени
                                      const aNum = parseInt(a.number || a.name, 10);
                                      const bNum = parseInt(b.number || b.name, 10);
                                      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
                                      return (a.name || a.number || '').localeCompare(b.name || b.number || '');
                                    })
                                    .map(room => (
                                      <option key={room.id} value={room.id} style={{color: '#000', background: '#fff'}}>
                                        {room.name || room.number}
                                      </option>
                                    ))}
                                </select>
                              </div>
                            </div>
                            <div className="teacher-row-with-time" style={{display: 'flex', flexDirection: 'row', gap: 4, width: '100%', marginTop: 4}}>
                              <div style={{flex: 3, display: 'flex', alignItems: 'center'}}>
                                <span
                                  style={{color: '#d32f2f', cursor: 'pointer', fontSize: '0.85em', fontWeight: 400}}
                                  title="Удалить преподавателя"
                                  onClick={() => {
                                    setShowSecondTeacherCells(prev => ({ ...prev, [`${lessonIdx}-${groupIdx}`]: false }));
                                    setShowSecondRoomCells(prev => ({ ...prev, [`${lessonIdx}-${groupIdx}`]: false }));
                                    handleCellChange(rowIdx, lessonIdx, groupIdx, 'teacherId2', '');
                                    handleCellChange(rowIdx, lessonIdx, groupIdx, 'roomId2', '');
                                  }}
                                >
                                  - Преподаватель
                                </span>
                              </div>
                              <div style={{flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'flex-end'}}>
                                <div style={{ width: '90px' }}>
                                  <input
                                    type="time"
                                  value={row.schedule[lessonIdx][groupIdx].time || ''}
                                  onChange={e => handleCellChange(rowIdx, lessonIdx, groupIdx, 'time', e.target.value)}
                                    style={{
                                      width: '100%',
                                      fontSize: '0.85em',
                                      border: '1px solid #ddd',
                                      borderRadius: '4px',
                                      padding: '1px 2px',
                                      boxSizing: 'border-box',
                                      height: '22px',
                                      margin: 0
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                        {!showSecondTeacherCells[`${lessonIdx}-${groupIdx}`] && (
                          <div className="teacher-row-with-time" style={{display: 'flex', flexDirection: 'row', gap: 4, width: '100%', marginTop: 6}}>
                            <div style={{flex: 3, display: 'flex', alignItems: 'center'}}>
                              <span
                                style={{color: '#1976d2', cursor: 'pointer', fontSize: '0.85em', fontWeight: 400, padding: '2px 0'}}
                                onClick={() => {
                                  setShowSecondTeacherCells(prev => ({ ...prev, [`${lessonIdx}-${groupIdx}`]: true }));
                                  setShowSecondRoomCells(prev => ({ ...prev, [`${lessonIdx}-${groupIdx}`]: true }));
                                }}
                              >
                                + Преподаватель
                              </span>
                            </div>
                            <div style={{flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'flex-end'}}>
                              <div style={{ width: '90px' }}>
                                <input
                                  type="time"
                                value={row.schedule[lessonIdx][groupIdx].time || ''}
                                onChange={e => handleCellChange(rowIdx, lessonIdx, groupIdx, 'time', e.target.value)}
                                  style={{
                                    width: '100%',
                                    fontSize: '0.85em',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    padding: '1px 2px',
                                    boxSizing: 'border-box',
                                    height: '22px',
                                    margin: 0
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <span className="empty-cell">—</span>
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Компонент для управления временем звонков
const BellTimesManager: React.FC<{
  bellTimes: BellTimes;
  onBellTimeChange: (lessonNumber: number, time: string) => void;
}> = ({ bellTimes, onBellTimeChange }) => {
  return (
    <div style={{ marginBottom: 20, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
      <h3 style={{ marginBottom: 12, color: '#1976d2' }}>Время звонков</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {Object.entries(bellTimes).map(([lessonNumber, time]) => (
          <div key={lessonNumber} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ minWidth: 80 }}>{lessonNumber} пара:</span>
            <input
              type="time"
              value={time}
              onChange={(e) => onBellTimeChange(Number(lessonNumber), e.target.value)}
              style={{
                padding: '4px 8px',
                border: '1px solid #ddd',
                borderRadius: 4,
                fontSize: '0.9em'
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// Синхронизация schedule: всегда lessons x GROUPS_IN_ROW, каждая ячейка — ScheduleCell
function syncSchedule(schedule: ScheduleCell[][], lessons: number, groupsCount: number): ScheduleCell[][] {
  return Array.from({ length: lessons }, (v, lessonIdx) =>
    Array.from({ length: groupsCount }, (v, groupIdx) =>
      schedule[lessonIdx]?.[groupIdx] ? { ...schedule[lessonIdx][groupIdx] } : { ...emptyCell }
    )
  );
}

export const ScheduleTable: React.FC<ScheduleTableProps> = ({ startLessonNumber = 1, date }) => {
  const [groupRowsShift1, setGroupRowsShift1] = useState<GroupRow[]>([
    {
      groups: Array(GROUPS_IN_ROW).fill(null),
      lessons: 5,
      schedule: Array.from({ length: MIN_LESSONS }, () => Array(GROUPS_IN_ROW).fill(null).map(() => ({ ...emptyCell })))
    }
  ]);
  const [groupRowsShift2, setGroupRowsShift2] = useState<GroupRow[]>([
    {
      groups: Array(GROUPS_IN_ROW).fill(null),
      lessons: 5,
      schedule: Array.from({ length: MIN_LESSONS }, () => Array(GROUPS_IN_ROW).fill(null).map(() => ({ ...emptyCell })))
    }
  ]);
  const [hovered, setHovered] = useState<{row: number, lesson: number, col: number, field: string} | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [allGroups, setAllGroups] = useState<any[]>([]);
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [dupDate, setDupDate] = useState('');
  const [dupShift, setDupShift] = useState(1);
  const [dupLoading, setDupLoading] = useState(false);
  const [times, setTimes] = useState<any[]>([]);
  const [bellTimes, setBellTimes] = useState<BellTimes>(() => {
    const times: BellTimes = {};
    DEFAULT_BELL_TIMES.forEach((time, index) => {
      times[index + 1] = time;
    });
    return times;
  });

  useEffect(() => {
    fetch('http://localhost:4000/api/subjects').then(r => r.json()).then((data: any[]) => {
      const subjectsWithStringIds = data.map((subject: any) => ({
        ...subject,
        id: String(subject.id)
      }));
      setSubjects(subjectsWithStringIds);
    });
    fetch('http://localhost:4000/api/teachers').then(r => r.json()).then((data: any[]) => {
      const teachersWithStringIds = data.map((teacher: any) => ({
        ...teacher,
        id: String(teacher.id)
      }));
      setTeachers(teachersWithStringIds);
    });
    fetch('http://localhost:4000/api/rooms').then(r => r.json()).then((data: any[]) => {
      const roomsWithStringIds = data.map((room: any) => ({
        ...room,
        id: String(room.id)
      }));
      setRooms(roomsWithStringIds);
    });
    fetch('http://localhost:4000/api/groups').then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        // Преобразуем все ID в строки для корректного сравнения
        const groupsWithStringIds = data.map(group => ({
          ...group,
          id: String(group.id),
          category_id: group.category_id ? String(group.category_id) : undefined
        }));
        setGroups(groupsWithStringIds);
        setAllGroups(groupsWithStringIds);
      } else {
        setGroups([]);
        setAllGroups([]);
      }
    });
    fetch('http://localhost:4000/api/times').then(r => r.json()).then(setTimes);
  }, []);

  // Загрузка расписания при изменении даты
  useEffect(() => {
    if (!date) return;
    
    // Загрузка расписания для первой смены
    fetch(`http://localhost:4000/api/schedule?date=${date}&shift=1`)
      .then(r => r.json())
      .then(data => {
        if (data && Array.isArray(data)) {
          // Преобразуем ID групп в строки
          const dataWithStringIds = data.map(row => ({
            ...row,
            groups: row.groups.map((groupId: any) => groupId ? String(groupId) : null),
            schedule: row.schedule.map((lessonArr: any[]) => 
              lessonArr.map((cell: any) => ({
                ...cell,
                subjectId: cell.subjectId ? String(cell.subjectId) : '',
                teacherId: cell.teacherId ? String(cell.teacherId) : '',
                teacherId2: cell.teacherId2 ? String(cell.teacherId2) : '',
                roomId: cell.roomId ? String(cell.roomId) : '',
                roomId2: cell.roomId2 ? String(cell.roomId2) : ''
              }))
            )
          }));
          setGroupRowsShift1(dataWithStringIds);
        } else {
          setGroupRowsShift1([
            {
              groups: Array(GROUPS_IN_ROW).fill(null),
              lessons: 5,
              schedule: Array.from({ length: MIN_LESSONS }, () => Array(GROUPS_IN_ROW).fill(null).map(() => ({ ...emptyCell })))
            }
          ]);
        }
      });

    // Загрузка расписания для второй смены
    fetch(`http://localhost:4000/api/schedule?date=${date}&shift=2`)
      .then(r => r.json())
      .then(data => {
        if (data && Array.isArray(data)) {
          // Преобразуем ID групп в строки
          const dataWithStringIds = data.map(row => ({
            ...row,
            groups: row.groups.map((groupId: any) => groupId ? String(groupId) : null),
            schedule: row.schedule.map((lessonArr: any[]) => 
              lessonArr.map((cell: any) => ({
                ...cell,
                subjectId: cell.subjectId ? String(cell.subjectId) : '',
                teacherId: cell.teacherId ? String(cell.teacherId) : '',
                teacherId2: cell.teacherId2 ? String(cell.teacherId2) : '',
                roomId: cell.roomId ? String(cell.roomId) : '',
                roomId2: cell.roomId2 ? String(cell.roomId2) : ''
              }))
            )
          }));
          setGroupRowsShift2(dataWithStringIds);
        } else {
          setGroupRowsShift2([
            {
              groups: Array(GROUPS_IN_ROW).fill(null),
              lessons: 5,
              schedule: Array.from({ length: MIN_LESSONS }, () => Array(GROUPS_IN_ROW).fill(null).map(() => ({ ...emptyCell })))
            }
          ]);
        }
      });
  }, [date]);

  // Изменить количество пар в ряду
  const handleLessonsChange = (rowIdx: number, newCount: number, shift: number) => {
    const setGroupRows = shift === 1 ? setGroupRowsShift1 : setGroupRowsShift2;
    const groupRows = shift === 1 ? groupRowsShift1 : groupRowsShift2;
    
    setGroupRows(prev => prev.map((row, idx) => {
      if (idx !== rowIdx) return row;
      const newSchedule = syncSchedule(row.schedule, newCount, GROUPS_IN_ROW);
      return { ...row, lessons: newCount, schedule: newSchedule };
    }));
  };

  // Обработчик выбора группы
  const handleGroupChange = (rowIdx: number, groupIdx: number, groupId: string | null, shift: number) => {
    const setGroupRows = shift === 1 ? setGroupRowsShift1 : setGroupRowsShift2;
    const groupRows = shift === 1 ? groupRowsShift1 : groupRowsShift2;
    
    setGroupRows(prev => prev.map((row, rIdx) => {
      if (rIdx !== rowIdx) return row;
      const updatedGroups = [...row.groups];
      updatedGroups[groupIdx] = groupId;
      const newSchedule = syncSchedule(row.schedule, row.lessons, GROUPS_IN_ROW);
      return { ...row, groups: updatedGroups, schedule: newSchedule };
    }));
  };

  // Обработчик изменения ячейки расписания
  const handleCellChange = (rowIdx: number, lessonIdx: number, groupIdx: number, field: keyof ScheduleCell, value: string, shift: number) => {
    const setGroupRows = shift === 1 ? setGroupRowsShift1 : setGroupRowsShift2;
    const groupRows = shift === 1 ? groupRowsShift1 : groupRowsShift2;
    
    setGroupRows(prev => prev.map((row, rIdx) => {
      if (rIdx !== rowIdx) return row;
      const newSchedule = row.schedule.map(lesson => lesson.map(cell => ({ ...cell })));
      newSchedule[lessonIdx][groupIdx][field] = value;
      if (field === 'subjectId') {
        newSchedule[lessonIdx][groupIdx]['teacherId'] = '';
      }
      return { ...row, schedule: newSchedule };
    }));
  };

  // Обработчик изменения времени звонка
  const handleBellTimeChange = (lessonNumber: number, time: string) => {
    setBellTimes(prev => ({
      ...prev,
      [lessonNumber]: time
    }));
  };

  // Функция для проверки конфликтов в одной смене
  const checkShiftConflicts = (
    groupRows: GroupRow[],
    isCurrentShift: boolean,
    currentTimeRange: BellTimeRanges,
    currentResourceId: string,
    field: 'roomId' | 'roomId2' | 'teacherId' | 'teacherId2',
    _rowIdx: number,
    lessonIdx: number,
    groupIdx: number
  ): boolean => {
    for (const row of groupRows) {
      for (let currentLessonIdx = 0; currentLessonIdx < row.schedule.length; currentLessonIdx++) {
        for (let idx = 0; idx < row.schedule[currentLessonIdx].length; idx++) {
          if (!row.groups[idx]) continue; // Пропускаем пустые ячейки групп
          const cell = row.schedule[currentLessonIdx][idx];
          const cellLessonNumber = currentLessonIdx + (isCurrentShift ? startLessonNumber : 5); // Для второй смены начинаем с 5 пары
          const cellTimeRange = getLessonTimeRange(
            cell.time,
            cellLessonNumber,
            bellTimes
          );
          // Проверяем конфликт только если это не та же самая ячейка
          if (!(row === groupRows[_rowIdx] && currentLessonIdx === lessonIdx && idx === groupIdx)) {
            // Для преподавателей и кабинетов сравниваем оба поля
            if ((cell.teacherId === currentResourceId || cell.teacherId2 === currentResourceId) && (field === 'teacherId' || field === 'teacherId2') && isTimeRangesOverlap(currentTimeRange, cellTimeRange)) return true;
            if ((cell.roomId === currentResourceId || cell.roomId2 === currentResourceId) && (field === 'roomId' || field === 'roomId2') && isTimeRangesOverlap(currentTimeRange, cellTimeRange)) return true;
          }
        }
      }
    }
    // Проверка на совпадение в одной ячейке (teacherId === teacherId2 или roomId === roomId2)
    if (groupRows[_rowIdx] && groupRows[_rowIdx].schedule[lessonIdx] && groupRows[_rowIdx].schedule[lessonIdx][groupIdx]) {
      const cell = groupRows[_rowIdx].schedule[lessonIdx][groupIdx];
      if ((field === 'teacherId' || field === 'teacherId2') && cell.teacherId && cell.teacherId2 && cell.teacherId === cell.teacherId2) return true;
      if ((field === 'roomId' || field === 'roomId2') && cell.roomId && cell.roomId2 && cell.roomId === cell.roomId2) return true;
    }
    return false;
  };

  // Модифицированная функция проверки конфликта по кабинету
  const isRoomConflict = (
    _rowIdx: number,
    lessonIdx: number,
    groupIdx: number,
    field: 'roomId' | 'roomId2' = 'roomId',
    shift: number
  ): boolean => {
    const groupRows = shift === 1 ? groupRowsShift1 : groupRowsShift2;
    const currentCell = groupRows[_rowIdx].schedule[lessonIdx][groupIdx];
    const currentRoomId = currentCell[field];
    if (!currentRoomId) return false;
    // Получаем номер пары с учетом смены
    const currentLessonNumber = lessonIdx + (shift === 1 ? startLessonNumber : 5);
    const currentTimeRange = getLessonTimeRange(
      currentCell.time,
      currentLessonNumber,
      bellTimes
    );
    // Проверяем конфликты в обеих сменах
    const check = (rows: GroupRow[]) => {
      for (const row of rows) {
        for (let lIdx = 0; lIdx < row.schedule.length; lIdx++) {
          for (let gIdx = 0; gIdx < row.schedule[lIdx].length; gIdx++) {
            if (!row.groups[gIdx]) continue;
            // Пропускаем текущую ячейку
            if (row === groupRows[_rowIdx] && lIdx === lessonIdx && gIdx === groupIdx) continue;
            const cell = row.schedule[lIdx][gIdx];
            const lessonNumber = lIdx + (shift === 1 ? startLessonNumber : 5);
            const timeRange = getLessonTimeRange(cell.time, lessonNumber, bellTimes);
            // Проверяем оба поля кабинета
            if ((cell.roomId === currentRoomId || cell.roomId2 === currentRoomId) && isTimeRangesOverlap(currentTimeRange, timeRange)) {
              return true;
            }
          }
        }
      }
      return false;
    };
    return check(groupRowsShift1) || check(groupRowsShift2);
  };

  // Модифицированная функция проверки конфликта по преподавателю
  const isTeacherConflict = (
    _rowIdx: number,
    lessonIdx: number,
    groupIdx: number,
    field: 'teacherId' | 'teacherId2' = 'teacherId',
    shift: number
  ): boolean => {
    const currentCell = (shift === 1 ? groupRowsShift1 : groupRowsShift2)[_rowIdx].schedule[lessonIdx][groupIdx];
    const currentTeacherId = currentCell[field];
    
    if (!currentTeacherId) return false;

    // Получаем номер пары с учетом смены
    const currentLessonNumber = lessonIdx + (shift === 1 ? startLessonNumber : 5);
    const currentTimeRange = getLessonTimeRange(
      currentCell.time,
      currentLessonNumber,
      bellTimes
    );

    // Проверяем конфликты в обеих сменах
    return checkShiftConflicts(groupRowsShift1, true, currentTimeRange, currentTeacherId, field, _rowIdx, lessonIdx, groupIdx) ||
           checkShiftConflicts(groupRowsShift2, false, currentTimeRange, currentTeacherId, field, _rowIdx, lessonIdx, groupIdx);
  };

  // Удалить ряд по индексу с подтверждением
  const handleRemoveRow = (rowIdx: number, shift: number) => {
    if (window.confirm('Удалить ряд?')) {
      const setGroupRows = shift === 1 ? setGroupRowsShift1 : setGroupRowsShift2;
      setGroupRows(prev => prev.filter((_, idx) => idx !== rowIdx));
    }
  };

  // Сохранение расписания
  const handleSave = async () => {
    await fetch('http://localhost:4000/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, shift: 1, data: groupRowsShift1 }),
    });
    await fetch('http://localhost:4000/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, shift: 2, data: groupRowsShift2 }),
    });
    alert('Расписание сохранено!');
  };

  // Дублирование расписания
  const handleDuplicate = async () => {
    setDupLoading(true);
    const res = await fetch(`http://localhost:4000/api/schedule?date=${dupDate}&shift=${dupShift}`);
    const data = await res.json();
    setDupLoading(false);
    setShowDuplicate(false);
    if (data && Array.isArray(data)) {
      // Проверка: есть ли заполненные ячейки в текущем расписании выбранной смены
      const currentRows = dupShift === 1 ? groupRowsShift1 : groupRowsShift2;
      const hasFilled = currentRows.some(row =>
        row.groups.some(g => g) ||
        row.schedule.some(lessonArr => lessonArr.some(cell => cell.subjectId || cell.teacherId || cell.roomId || cell.teacherId2 || cell.roomId2 || cell.time))
      );
      if (hasFilled) {
        const confirmed = window.confirm('В текущем расписании уже есть данные. Заменить их новым расписанием?');
        if (!confirmed) return;
      }
      // Преобразуем данные, как при загрузке расписания
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataWithStringIds = data.map((row: any) => ({
        ...row,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        groups: (row.groups as (string | number | null)[]).map((groupId: any) => groupId ? String(groupId) : null),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        schedule: (row.schedule as any[][]).map((lessonArr: any[]) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          lessonArr.map((cell: any) => ({
            ...cell,
            subjectId: cell.subjectId ? String(cell.subjectId) : '',
            teacherId: cell.teacherId ? String(cell.teacherId) : '',
            teacherId2: cell.teacherId2 ? String(cell.teacherId2) : '',
            roomId: cell.roomId ? String(cell.roomId) : '',
            roomId2: cell.roomId2 ? String(cell.roomId2) : ''
          }))
        )
      }));
      if (dupShift === 1) {
        setGroupRowsShift1(dataWithStringIds);
      } else {
        setGroupRowsShift2(dataWithStringIds);
      }
    } else {
      alert('Расписание не найдено!');
    }
  };

  // Экспорт расписания и переход на страницу
  const handleExport = () => {
    // Проверка загрузки справочников
    if (!subjects.length || !teachers.length || !rooms.length || !allGroups.length) {
      alert('Данные справочников ещё загружаются. Пожалуйста, подождите.');
      return;
    }

    // Вспомогательные функции для получения названий
    const getGroupName = (id: string | null) => {
      const found = allGroups.find(g => g.id === id);
      return found ? found.name : id || '';
    };
    const getSubjectName = (id: string) => {
      const found = subjects.find(s => s.id === id);
      return found ? found.name : id || '';
    };
    const getTeacherName = (id: string) => {
      const teacherFound = teachers.find(t => t.id === id);
      if (!teacherFound) {
        console.warn('Teacher not found for id:', id, 'All teacher ids:', teachers.map(t => t.id));
      }
      return teacherFound ? teacherFound.name : '(не найдено)';
    };
    const getRoomName = (id: string) => {
      const roomFound = rooms.find(r => r.id === id);
      if (!roomFound) {
        console.warn('Room not found for id:', id, 'All room ids:', rooms.map(r => r.id));
      }
      return roomFound ? (roomFound.name || roomFound.number || '(не найдено)') : '(не найдено)';
    };

    // Формируем ячейки для смены
    const formatShift = (groupRows: GroupRow[]) => {
      const cells = [];
      let cellId = 1;
      for (let rowIdx = 0; rowIdx < groupRows.length; rowIdx++) {
        const row = groupRows[rowIdx];
        for (let groupIdx = 0; groupIdx < row.groups.length; groupIdx++) {
          const groupId = row.groups[groupIdx];
          if (!groupId) continue;
          const groupNames = [getGroupName(groupId)];
          const pairs = row.schedule.map((lessonCells: ScheduleCell[], lessonIdx) => {
            const cell = lessonCells[groupIdx];
            return {
              номер: lessonIdx + 1,
              предмет: cell.subjectId ? getSubjectName(cell.subjectId) : '',
              "преподаватель 1": cell.teacherId ? getTeacherName(cell.teacherId) : '',
              "преподаватель 2": cell.teacherId2 ? getTeacherName(cell.teacherId2) : '',
              "кабинет 1": cell.roomId ? getRoomName(cell.roomId) : '',
              "кабинет 2": cell.roomId2 ? getRoomName(cell.roomId2) : '',
              "время": cell.time || ''
            };
          });
          cells.push({
            "id ячейки": cellId,
            группы: groupNames,
            пары: pairs
          });
          cellId++;
        }
      }
      return cells;
    };

    const exportData = {
      расписание: {
        '1 смена': formatShift(groupRowsShift1),
        '2 смена': formatShift(groupRowsShift2)
      },
      дата: date
    };

    localStorage.setItem('scheduleExportJSON', JSON.stringify(exportData, null, 2));
    window.location.href = '/json-export';
  };

  const renderShiftSchedule = (shift: number) => {
    const groupRows = shift === 1 ? groupRowsShift1 : groupRowsShift2;
    const setGroupRows = shift === 1 ? setGroupRowsShift1 : setGroupRowsShift2;
    // Получаем все группы из другой смены
    const otherShiftGroups = (shift === 1 ? groupRowsShift2 : groupRowsShift1)
      .flatMap(row => row.groups)
      .filter(Boolean) as string[];

    // Определяем параметры для каждой смены
    const shiftParams = shift === 1 
      ? { startLesson: startLessonNumber, maxLessons: 6 }
      : { startLesson: 5, maxLessons: 9 };

    return (
      <div>
        <h2 style={{ margin: '20px 0', color: '#1976d2' }}>{shift} СМЕНА</h2>
        {groupRows.map((row, rowIdx) => {
          const allSelectedGroups = groupRows
            .flatMap((r, idx) => idx !== rowIdx ? r.groups.filter(Boolean) : []) as string[];
          return (
            <div key={rowIdx} style={{position: 'relative'}}>
              <GroupRowTable
                row={row}
                rowIdx={rowIdx}
                hovered={hovered}
                setHovered={setHovered}
                handleGroupChange={(r: number, g: number, v: string | null) => handleGroupChange(r, g, v, shift)}
                handleLessonsChange={(r: number, v: number) => handleLessonsChange(r, v, shift)}
                handleCellChange={(r: number, l: number, g: number, f: keyof ScheduleCell, v: string) => handleCellChange(r, l, g, f, v, shift)}
                isTeacherConflict={(r: number, l: number, g: number, f: 'teacherId' | 'teacherId2') => isTeacherConflict(r, l, g, f, shift)}
                isRoomConflict={(r: number, l: number, g: number, f: 'roomId' | 'roomId2') => isRoomConflict(r, l, g, f, shift)}
                allSelectedGroups={allSelectedGroups}
                startLessonNumber={shiftParams.startLesson}
                subjects={subjects}
                teachers={teachers}
                rooms={rooms}
                groups={groups}
                allGroupRows={groupRows}
                allGroups={allGroups}
                times={times}
                currentShift={shift}
                otherShiftGroups={otherShiftGroups}
              />
              {groupRows.length > 1 && (
                <button
                  style={{position: 'absolute', top: 60, right: 8, zIndex: 2, background: '#fff', color: '#d32f2f', border: '1px solid #d32f2f', borderRadius: 6, padding: '2px 10px', fontSize: '0.95em', cursor: 'pointer'}}
                  onClick={() => handleRemoveRow(rowIdx, shift)}
                  title="Удалить ряд"
                >
                  Удалить ряд
                </button>
              )}
            </div>
          );
        })}
        <div className="add-row-button">
          <button
            style={{width: '95%'}}
            onClick={() => {
              setGroupRows(prev => [
                ...prev,
                {
                  groups: Array(GROUPS_IN_ROW).fill(null),
                  lessons: 5,
                  schedule: Array.from({ length: MIN_LESSONS }, () => Array(GROUPS_IN_ROW).fill(null).map(() => ({ ...emptyCell })))
                }
              ]);
            }}
          >
            Добавить ряд
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="schedule-container">
      <BellTimesManager bellTimes={bellTimes} onBellTimeChange={handleBellTimeChange} />
      {renderShiftSchedule(1)}
      {renderShiftSchedule(2)}
      <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 24, alignItems: 'center'}}>
        <button
          style={{width: '32%', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', fontWeight: 600, fontSize: 17, cursor: 'pointer', boxShadow: '0 2px 8px rgba(25,118,210,0.08)'}}
          onClick={handleSave}
        >
          Сохранить расписание
        </button>
        <button
          style={{width: '32%', background: '#f5f5f5', color: '#1976d2', border: '1.5px solid #1976d2', borderRadius: 8, padding: '10px 0', fontWeight: 600, fontSize: 17, cursor: 'pointer', boxShadow: '0 2px 8px rgba(25,118,210,0.04)'}}
          onClick={() => setShowDuplicate(true)}
        >
          Дублировать
        </button>
        <button
          style={{width: '32%', background: '#ff9800', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', fontWeight: 600, fontSize: 17, cursor: 'pointer', boxShadow: '0 2px 8px rgba(255,152,0,0.08)'}}
          onClick={handleExport}
        >
          Экспорт
        </button>
      </div>
      {showDuplicate && (
        <div style={{position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div style={{background: '#fff', borderRadius: 12, padding: 32, minWidth: 320, boxShadow: '0 4px 24px rgba(25,118,210,0.12)'}}>
            <h3 style={{marginBottom: 18, color: '#1976d2'}}>Дублировать расписание</h3>
            <div style={{marginBottom: 16}}>
              <label>Дата:
                <input type="date" value={dupDate} onChange={e => setDupDate(e.target.value)} style={{marginLeft: 8}} />
              </label>
            </div>
            <div style={{marginBottom: 24}}>
              <label>Смена:
                <select value={dupShift} onChange={e => setDupShift(Number(e.target.value))} style={{marginLeft: 8}}>
                  <option value={1}>Первая</option>
                  <option value={2}>Вторая</option>
                </select>
              </label>
            </div>
            <div style={{display: 'flex', gap: 12}}>
              <button
                onClick={handleDuplicate}
                disabled={!dupDate || dupLoading}
                style={{background: '#1976d2', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, fontSize: 16, cursor: dupLoading ? 'not-allowed' : 'pointer', opacity: dupLoading ? 0.7 : 1}}
              >
                {dupLoading ? 'Загрузка...' : 'Дублировать'}
              </button>
              <button
                onClick={() => setShowDuplicate(false)}
                style={{background: '#f5f5f5', color: '#1976d2', border: '1.5px solid #1976d2', borderRadius: 8, padding: '10px 24px', fontWeight: 600, fontSize: 16, cursor: 'pointer'}}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleTable; 