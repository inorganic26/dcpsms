// src/store/subjectStore.js

let subjects = [];

export const SUBJECT_EVENTS = {
  UPDATED: 'subject-store-updated'
};

export const getSubjects = () => [...subjects];

export const setSubjects = (newSubjects) => {
  subjects = newSubjects;
  document.dispatchEvent(new CustomEvent(SUBJECT_EVENTS.UPDATED));
};

export const getSubjectById = (id) => subjects.find(s => s.id === id);