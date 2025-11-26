// src/store/studentStore.js

// 1. 상태(Data) - 외부에서 직접 접근 불가
let students = [];

// 2. 이벤트 이름 정의
export const STUDENT_EVENTS = {
  UPDATED: 'student-store-updated'
};

// 3. Getter - 데이터 조회 (복사본 반환으로 안전성 확보)
export const getStudents = () => [...students];

// 4. Setter - 데이터 변경 및 알림 발송
export const setStudents = (newStudents) => {
  students = newStudents;
  // 데이터가 변경되었다고 방송(Dispatch Event)
  document.dispatchEvent(new CustomEvent(STUDENT_EVENTS.UPDATED));
};

// 특정 학생 찾기 헬퍼
export const getStudentById = (id) => students.find(s => s.id === id);