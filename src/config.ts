// Конфигурация API
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '' // В продакшене API и фронтенд на одном домене
  : 'http://localhost:4000';

export const API = {
  subjects: `${API_BASE_URL}/api/subjects`,
  teachers: `${API_BASE_URL}/api/teachers`,
  rooms: `${API_BASE_URL}/api/rooms`,
  groups: `${API_BASE_URL}/api/groups`,
  categories: `${API_BASE_URL}/api/group-categories`,
  times: `${API_BASE_URL}/api/times`,
  schedule: `${API_BASE_URL}/api/schedule`,
  teacherSubjects: (teacherId: string) => `${API_BASE_URL}/api/teacher-subjects/${teacherId}`,
  teachersBySubject: (subjectId: string) => `${API_BASE_URL}/api/teachers/by-subject/${subjectId}`,
  categorySubjects: (categoryId: string) => `${API_BASE_URL}/api/category-subject/category/${categoryId}`,
  categorySubject: `${API_BASE_URL}/api/category-subject`,
};
