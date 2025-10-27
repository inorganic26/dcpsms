// src/admin/adminApp.js
import { auth } from "../shared/firebase.js";
import { signInAnonymously } from "firebase/auth"; //
import { teacherManager } from "./teacherManager.js";
import { studentManager } from "./studentManager.js";
import { subjectManager } from "./subjectManager.js";

export const adminApp = {
  elements: {},
  state: { teachers: [], students: [], subjects: [] },

  async init() {
    await signInAnonymously(auth);
    this.cacheElements();
    teacherManager.init(this);
    studentManager.init(this);
    subjectManager.init(this);
  },

  cacheElements() {
    this.elements = {
      // 과목/학생/교사 관련 HTML 요소들 캐싱
      addTeacherBtn: document.getElementById("admin-add-teacher-btn"),
      teachersList: document.getElementById("admin-teachers-list"),
      addStudentBtn: document.getElementById("admin-add-student-btn"),
      studentsList: document.getElementById("admin-students-list"),
      addSubjectBtn: document.getElementById("admin-add-subject-btn"),
      subjectsList: document.getElementById("admin-subjects-list"),
    };
  },
};