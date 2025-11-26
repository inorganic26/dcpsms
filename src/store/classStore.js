// src/store/classStore.js

let classes = [];

export const CLASS_EVENTS = {
  UPDATED: 'class-store-updated'
};

export const getClasses = () => [...classes];

export const setClasses = (newClasses) => {
  classes = newClasses;
  document.dispatchEvent(new CustomEvent(CLASS_EVENTS.UPDATED));
};

export const getClassById = (id) => classes.find(c => c.id === id);