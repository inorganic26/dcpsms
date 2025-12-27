// src/student/studentState.js

export const studentState = {
    // 모든 데이터는 이 data 객체 안에 모읍니다.
    // studentApp.js에서 this.state로 연결되어 다른 모듈과 호환됩니다.
    data: {
        studentData: null,
        studentDocId: null,
        studentName: null,
        classType: null, // 'live-lecture' | 'self-directed'
        
        subjects: [],
        selectedSubject: null,
        
        lessons: [],
        activeLesson: null,
        
        quizQuestions: [],
        currentQuestionIndex: 0,
        score: 0,
        passScore: 4,
        totalQuizQuestions: 5,
        
        homeworks: [],
        selectedHomework: null
    },

    // 데이터를 쉽게 초기화하거나 변경하는 헬퍼 함수들
    reset() {
        this.data.selectedSubject = null;
        this.data.lessons = [];
        this.data.activeLesson = null;
    }
};