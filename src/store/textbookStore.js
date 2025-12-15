// src/store/textbookStore.js

import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../shared/firebase.js";

let textbooks = [];
let isInitialized = false;

export const TEXTBOOK_EVENTS = {
    UPDATED: 'textbooks-updated'
};

// 스토어 초기화 (데이터 구독 시작)
function initTextbookStore() {
    if (isInitialized) return;
    
    const q = query(collection(db, "textbooks"), orderBy("name"));
    
    onSnapshot(q, (snapshot) => {
        textbooks = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // 데이터 변경 알림 발송
        document.dispatchEvent(new CustomEvent(TEXTBOOK_EVENTS.UPDATED, { 
            detail: { textbooks } 
        }));
    });
    
    isInitialized = true;
}

// 교재 목록 가져오기 getter
export const getTextbooks = () => {
    if (!isInitialized) initTextbookStore(); // 필요할 때 자동 초기화
    return textbooks;
};