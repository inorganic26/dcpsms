// src/shared/commonStudentManager.js

import { 
    collection, getDocs, query, where, writeBatch 
} from "firebase/firestore";
// shared 폴더 내부에 firebase.js가 있다고 가정합니다.
import { db } from "./firebase.js"; 

export const commonStudentManager = {
    /**
     * 학생의 '자기주도 학습 현황(영상 시청 + 퀴즈 통과)'을 초기화하는 공용 함수
     * @param {string} studentId - 초기화할 학생의 문서 ID
     */
    async resetLearningStatus(studentId) {
        if (!confirm("🚨 이 학생의 '자기주도 학습 현황'을 초기화하시겠습니까?\n\n1. 영상 시청 기록 삭제\n2. 퀴즈(일일테스트) 통과 기록 삭제\n\n이 작업 후 학생은 처음부터 다시 학습해야 하며, 되돌릴 수 없습니다.")) {
            return;
        }

        try {
            const batch = writeBatch(db);
            let deleteCount = 0;

            // 1. 영상 시청 기록 삭제 (class_video_logs)
            // classVideoManager.js가 저장하는 컬렉션
            const videoQ = query(collection(db, "class_video_logs"), where("studentId", "==", studentId));
            const videoSnap = await getDocs(videoQ);
            videoSnap.forEach(doc => {
                batch.delete(doc.ref);
                deleteCount++;
            });

            // 2. 퀴즈(일일테스트) 통과 기록 삭제 (daily_test_results)
            // 이걸 지워야 통과 상태가 해제되어 퀴즈를 다시 풀 수 있음
            const quizQ = query(collection(db, "daily_test_results"), where("studentId", "==", studentId));
            const quizSnap = await getDocs(quizQ);
            quizSnap.forEach(doc => {
                batch.delete(doc.ref);
                deleteCount++;
            });

            if (deleteCount > 0) {
                await batch.commit();
                alert(`✅ 초기화 완료!\n총 ${deleteCount}건의 학습 기록(영상+퀴즈)이 삭제되었습니다.`);
            } else {
                alert("삭제할 학습 기록이 없습니다 (이미 초기화 상태).");
            }

        } catch (error) {
            console.error("학습 현황 초기화 실패:", error);
            alert(`오류 발생: ${error.message}`);
        }
    }
};