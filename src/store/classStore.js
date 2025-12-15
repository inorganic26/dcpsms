// src/store/classStore.js

import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../shared/firebase.js";

let classes = [];
let isInitialized = false;

// ✨ [추가됨] 이 부분이 없어서 오류가 났습니다. 외부에서 쓸 수 있게 내보냅니다.
export const CLASS_EVENTS = {
    UPDATED: 'classesUpdated'
};

function initClassStore() {
    if (isInitialized) return;
    
    // 이름순 정렬
    const q = query(collection(db, "classes"), orderBy("name"));
    
    onSnapshot(q, (snapshot) => {
        classes = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log(`[ClassStore] 반 데이터 업데이트됨: ${classes.length}개`);

        // 데이터 변경 알림 발송 (상수 사용)
        document.dispatchEvent(new CustomEvent(CLASS_EVENTS.UPDATED, { 
            detail: { classes } 
        }));
    });
    
    isInitialized = true;
}

export const getClasses = () => {
    if (!isInitialized) initClassStore(); 
    return classes;
};