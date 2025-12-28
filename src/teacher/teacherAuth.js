// src/teacher/teacherAuth.js

import { getAuth, signInAnonymously, signOut } from "firebase/auth";
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../shared/firebase.js";

const auth = getAuth();

export const teacherAuth = {
    teacherData: null,

    // 초기화
    init(callback) {
        auth.onAuthStateChanged((user) => {
            if (user && this.teacherData) {
                callback(this.teacherData);
            } else {
                callback(null);
            }
        });
    },

    // 로그인 (이름 + 전화번호 뒷 4자리)
    async login(name, phoneLast4) {
        try {
            // 1. 선생님 정보 조회
            const teachersRef = collection(db, "teachers");
            const q = query(teachersRef, where("name", "==", name));
            const querySnapshot = await getDocs(q);
            
            let targetTeacher = null;

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.phone && data.phone.endsWith(phoneLast4)) {
                    targetTeacher = { id: doc.id, ...data };
                }
            });

            if (!targetTeacher) {
                return { success: false, message: "정보가 일치하는 선생님을 찾을 수 없습니다." };
            }

            // 2. [핵심] 익명 로그인으로 '인증 토큰(UID)' 발급
            const userCredential = await signInAnonymously(auth);
            const myUid = userCredential.user.uid;

            // 3. [핵심] 발급받은 UID를 'teachers' 컬렉션에 등록 (권한 획득용)
            // 보안 규칙(isAdminOrTeacher)을 통과하기 위해 내 UID로 된 문서를 만듭니다.
            await setDoc(doc(db, "teachers", myUid), {
                name: targetTeacher.name,
                originalId: targetTeacher.id, // 원본 ID 저장
                role: 'teacher',
                phone: targetTeacher.phone,
                lastLogin: serverTimestamp()
            }, { merge: true });

            this.teacherData = targetTeacher;
            return { success: true };

        } catch (error) {
            console.error("Login Error:", error);
            return { success: false, message: "로그인 중 오류가 발생했습니다." };
        }
    },

    async logout() {
        this.teacherData = null;
        await signOut(auth);
    }
};