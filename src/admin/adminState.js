// src/admin/adminState.js

export const adminState = {
    // AdminApp에서 사용하던 모든 상태 변수
    data: {
        currentView: "dashboard",
        teachers: [], 
        students: [], 
        subjects: [],
        classes: [],
        
        // 선택된 항목들 관리
        selectedSubjectIdForTextbook: null,
        editingClass: null,
        selectedClassIdForHomework: null,
        selectedHomeworkId: null,
        studentsInClass: new Map(),
        selectedSubjectIdForMgmt: null,
        lessons: [],
        editingLesson: null,
        generatedQuiz: null,
        selectedClassIdForQnaVideo: null,
        selectedClassIdForClassVideo: null,
        editingQnaVideoId: null,
        editingClassVideoIndex: null,
        
        // 리포트 관련 상태
        selectedReportClassId: null,
        selectedReportDate: null,
        uploadedReports: [],
    },

    // 상태 변경 알림을 위한 리스너 (필요 시 확장)
    listeners: [],

    subscribe(callback) {
        this.listeners.push(callback);
    },

    notify() {
        this.listeners.forEach(cb => cb(this.data));
    }
};