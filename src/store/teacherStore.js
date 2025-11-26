// src/store/teacherStore.js

let teachers = [];

export const TEACHER_EVENTS = {
  UPDATED: 'teacher-store-updated'
};

export const getTeachers = () => [...teachers];

export const setTeachers = (newTeachers) => {
  teachers = newTeachers;
  document.dispatchEvent(new CustomEvent(TEACHER_EVENTS.UPDATED));
};

export const getTeacherById = (id) => teachers.find(t => t.id === id);