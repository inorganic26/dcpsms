// src/store/studentStore.js

import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../shared/firebase.js";

let students = [];
let isInitialized = false;

// 다른 파일에서 "학생 목록이 바꼈다!"라는 신호를 알기 위한 이름
export const STUDENT_EVENTS = {
    UPDATED: 'studentsUpdated'
};

// 학생 데이터 실시간 구독 함수
function initStudentStore() {
    if (isInitialized) return;
    
    // 이름순 정렬
    const q = query(collection(db, "students"), orderBy("name"));
    
    // DB가 바뀔 때마다 실행됨
    onSnapshot(q, (snapshot) => {
        students = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log(`[StudentStore] 학생 데이터 업데이트됨: ${students.length}명`);

        // 화면들에게 "데이터 바꼈으니 새로고침해!" 라고 방송함
        document.dispatchEvent(new CustomEvent(STUDENT_EVENTS.UPDATED, { 
            detail: { students } 
        }));
    });
    
    isInitialized = true;
}

// 학생 목록 가져오기
export const getStudents = () => {
    if (!isInitialized) initStudentStore(); 
    return students;
};