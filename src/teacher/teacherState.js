// src/teacher/teacherState.js

export const teacherState = {
    // TeacherApp에서 관리하던 모든 데이터를 이곳으로 이동
    data: {
        teacherData: null, // 로그인한 선생님 정보
        currentView: "dashboard",
        
        // 데이터 목록
        classes: [],
        subjects: [],
        students: [],
        
        // 선택된 상태들
        selectedClassId: null,
        selectedSubjectId: null,
        selectedLessonId: null,
        selectedHomeworkId: null,
        
        // 기능별 임시 상태
        editingHomework: null,
        editingLesson: null,
        uploadingFiles: [],
    },

    listeners: [],

    subscribe(callback) {
        this.listeners.push(callback);
    },

    notify() {
        this.listeners.forEach(cb => cb(this.data));
    },
    
    // 편의 함수
    setCurrentView(view) {
        this.data.currentView = view;
        this.notify();
    }
};