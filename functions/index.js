// functions/index.js

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentDeleted } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

initializeApp();

const auth = getAuth();
const db = getFirestore();
const region = "asia-northeast3"; // 서울 리전

// =====================================================
// [핵심] 슈퍼 관리자 판별 헬퍼 함수
// =====================================================
const isSuperAdmin = (authContext) => {
  return authContext && authContext.token && authContext.token.email === "inorganic26@gmail.com";
};

// =====================================================
// 1. 학생 계정 생성 (관리자용)
// =====================================================
export const createStudentAccount = onCall({ region }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }

  const { name, phone, parentPhone } = request.data;
  if (!phone || phone.length < 4) {
    throw new HttpsError("invalid-argument", "전화번호 형식이 올바르지 않습니다.");
  }

  const passwordInit = phone.slice(-4); 
  const salt = "dcpsms_secure_key";
  const shadowPassword = `${passwordInit}${salt}`;

  try {
    const studentRef = db.collection("students").doc();
    const studentId = studentRef.id;
    const shadowEmail = `${studentId}@dcpsms.student`;

    await auth.createUser({
      uid: studentId,
      email: shadowEmail,
      password: shadowPassword,
      displayName: name,
    });

    await studentRef.set({
      name: name,
      phone: phone,
      parentPhone: parentPhone || null,
      classId: null,
      createdAt: new Date(),
      isInitialPassword: true
    });

    return { success: true, message: "학생 계정 생성 완료" };
  } catch (error) {
    console.error("학생 생성 실패:", error);
    if (error.code === 'auth/email-already-exists' || error.code === 'auth/uid-already-exists') {
        throw new HttpsError("already-exists", "이미 등록된 학생이거나 계정 생성 중 충돌이 발생했습니다.");
    }
    throw new HttpsError("internal", "계정 생성 중 알 수 없는 오류가 발생했습니다.");
  }
});

// =====================================================
// 2. 사용자 역할 설정
// =====================================================
export const setCustomUserRole = onCall({ region }, async (req) => {
  const { email, role } = req.data;
  const caller = req.auth;

  if (!caller || (caller.token.role !== "admin" && !isSuperAdmin(caller))) {
    throw new HttpsError("permission-denied", "관리자 권한이 필요합니다.");
  }
  if (!email || !role) throw new HttpsError("invalid-argument", "정보 부족");

  try {
    const user = await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(user.uid, { role });
    return { message: `${email} → '${role}' 역할 부여 완료` };
  } catch (err) {
    throw new HttpsError("internal", err.message);
  }
});

export const setCustomUserRoleByUid = onCall({ region }, async (req) => {
  const { uid, role } = req.data;
  const caller = req.auth;
  
  if (!caller || (caller.token.role !== "admin" && !isSuperAdmin(caller))) {
    throw new HttpsError("permission-denied", "관리자만 역할을 부여할 수 있습니다.");
  }
  if (!uid || !role) throw new HttpsError("invalid-argument", "정보 부족");

  try {
    await auth.setCustomUserClaims(uid, { role });
    return { message: `UID ${uid} → '${role}' 역할 부여 완료` };
  } catch (err) {
    throw new HttpsError("internal", err.message);
  }
});

// =====================================================
// 3. [자동 청소] 숙제 삭제 시 파일 삭제
// =====================================================
export const onHomeworkDeleted = onDocumentDeleted({ region, document: "homeworks/{homeworkId}" }, async (event) => {
    const homeworkId = event.params.homeworkId;
    const bucket = getStorage().bucket();
    const folderPath = `homeworks/${homeworkId}/`;
    try {
        await bucket.deleteFiles({ prefix: folderPath });
    } catch (error) {
        console.error(`숙제 파일 삭제 실패 (${homeworkId}):`, error);
    }
});

// =====================================================
// 4. [자동 청소] 학생 삭제 시 파일/계정 삭제
// =====================================================
export const onStudentDeleted = onDocumentDeleted({ region, document: "students/{studentId}" }, async (event) => {
    const studentId = event.params.studentId;
    const bucket = getStorage().bucket();
    const folderPath = `students/${studentId}/`;
    try {
         await bucket.deleteFiles({ prefix: folderPath });
         try {
             await auth.deleteUser(studentId);
         } catch (authErr) { /* 이미 삭제됨 등 */ }
    } catch (error) {
        console.error(`학생 정리 실패:`, error);
    }
});

// =====================================================
// 5. 교사 계정 생성
// =====================================================
export const createTeacherAccount = onCall({ region }, async (request) => {
  const caller = request.auth;
  if (!caller || (caller.token.role !== "admin" && !isSuperAdmin(caller))) {
    throw new HttpsError("permission-denied", "권한 부족");
  }

  const { name, phone } = request.data;
  if (!phone || phone.length < 4) throw new HttpsError("invalid-argument", "전화번호 오류");

  const passwordInit = phone.slice(-4);
  const salt = "dcpsms_secure_key"; 
  const shadowPassword = `${passwordInit}${salt}`;

  try {
    const teacherRef = db.collection("teachers").doc();
    const teacherId = teacherRef.id;
    const shadowEmail = `${teacherId}@dcpsms.teacher`;

    await auth.createUser({
      uid: teacherId,
      email: shadowEmail,
      password: shadowPassword,
      displayName: name,
    });
    await auth.setCustomUserClaims(teacherId, { role: "teacher" });
    await teacherRef.set({
      name: name,
      phone: phone,
      createdAt: new Date(),
      isInitialPassword: true
    });
    return { success: true, message: "교사 생성 완료" };
  } catch (error) {
    throw new HttpsError("internal", "교사 생성 실패");
  }
});

// =====================================================
// 6. 관리자 비밀번호 검증
// =====================================================
export const verifyAdminPassword = onCall({ region }, async (request) => {
  if (isSuperAdmin(request.auth)) {
      await auth.setCustomUserClaims(request.auth.uid, { role: "admin" });
      return { success: true };
  }
  if (!request.auth) throw new HttpsError("unauthenticated", "세션 필요");
  if (request.data.password !== process.env.ADMIN_PASSWORD) {
    throw new HttpsError("permission-denied", "비밀번호 불일치");
  }
  await auth.setCustomUserClaims(request.auth.uid, { role: "admin" });
  return { success: true };
});

// =====================================================
// 7. 선생님 로그인
// =====================================================
export const verifyTeacherLogin = onCall({ region }, async (request) => {
  const { name, password } = request.data;
  try {
    const snapshot = await db.collection("teachers").where("name", "==", name).get();
    if (snapshot.empty) return { success: false, message: "선생님 정보 없음" };

    const teacherDoc = snapshot.docs[0];
    const teacherData = teacherDoc.data();
    let isMatch = (teacherData.password === password) || (teacherData.phone && teacherData.phone.slice(-4) === password);
    
    if (!isMatch) return { success: false, message: "비밀번호 불일치" };

    const customToken = await auth.createCustomToken(teacherDoc.id, { role: "teacher" });
    return { success: true, token: customToken, teacherId: teacherDoc.id, teacherData };
  } catch (error) {
    throw new HttpsError("internal", "로그인 오류");
  }
});

// =====================================================
// 8. 학생 로그인용 반 목록
// =====================================================
export const getClassesForStudentLogin = onCall({ region }, async () => {
    try {
        const snapshot = await db.collection("classes").orderBy("name").get();
        return snapshot.docs.map(d => ({ id: d.id, name: d.data().name }));
    } catch(e) { throw new HttpsError("internal", "반 목록 로드 실패"); }
});

// =====================================================
// 9. 학생 로그인용 학생 목록 (직접 입력으로 변경되어 사용 안 할 수도 있지만 호환성 위해 유지)
// =====================================================
export const getStudentsInClassForLogin = onCall({ region }, async (request) => {
    const { classId } = request.data;
    if(!classId) throw new HttpsError("invalid-argument", "반 정보 필요");
    try {
        const q1 = db.collection("students").where("classId", "==", classId).get();
        const q2 = db.collection("students").where("classIds", "array-contains", classId).get();
        const [s1, s2] = await Promise.all([q1, q2]);
        const studentsMap = new Map();
        s1.forEach(d => studentsMap.set(d.id, { id: d.id, name: d.data().name }));
        s2.forEach(d => studentsMap.set(d.id, { id: d.id, name: d.data().name }));
        return Array.from(studentsMap.values()).sort((a,b) => a.name.localeCompare(b.name));
    } catch(e) { throw new HttpsError("internal", "학생 목록 로드 실패"); }
});

// =====================================================
// 10. [핵심 수정] 학생 로그인 검증 (이름 직접 입력 지원)
// =====================================================
export const verifyStudentLogin = onCall({ region }, async (request) => {
    const { classId, studentName, password } = request.data; // studentId 대신 studentName 사용
    
    if (!classId || !studentName || !password) {
        throw new HttpsError("invalid-argument", "정보 부족");
    }

    try {
        const studentsRef = db.collection("students");
        // 1. 해당 반에서 이름이 같은 학생 모두 검색 (메인 반)
        let querySnapshot = await studentsRef.where("classId", "==", classId).where("name", "==", studentName).get();
        
        // 2. 없으면 멀티 반(classIds)에서도 검색
        if (querySnapshot.empty) {
            querySnapshot = await studentsRef.where("classIds", "array-contains", classId).where("name", "==", studentName).get();
        }

        if (querySnapshot.empty) return { success: false, message: "학생 정보가 없습니다." };

        let targetStudent = null;

        // 3. 검색된 학생들 중 비밀번호(전화번호 뒷자리)가 일치하는 사람 찾기
        querySnapshot.forEach(doc => {
            const data = doc.data();
            const phone = data.phone || "";
            const targetPw = phone.length >= 4 ? phone.slice(-4) : phone;
            
            // 비밀번호 비교
            if (String(password) === String(targetPw)) {
                targetStudent = { id: doc.id, ...data };
            }
        });

        if (!targetStudent) return { success: false, message: "비밀번호가 일치하지 않습니다." };
        
        // 4. 로그인 토큰 발급
        const token = await auth.createCustomToken(targetStudent.id, { role: "student" });
        return { success: true, token, studentData: targetStudent };

    } catch(e) { 
        console.error("Student Login Error:", e);
        throw new HttpsError("internal", "로그인 처리 중 오류 발생"); 
    }
});

// =====================================================
// 11. 학부모 로그인 검증
// =====================================================
export const verifyParentLogin = onCall({ region }, async (request) => {
    const { classId, studentName, phoneSuffix } = request.data;
    if (!classId || !studentName || !phoneSuffix) throw new HttpsError('invalid-argument', '정보 부족');
  
    try {
      const studentsRef = db.collection('students');
      let querySnapshot = await studentsRef.where('classId', '==', classId).where('name', '==', studentName).get();
      if (querySnapshot.empty) {
          querySnapshot = await studentsRef.where('classIds', 'array-contains', classId).where('name', '==', studentName).get();
      }
      if (querySnapshot.empty) return { success: false, message: '학생 없음' };
  
      let targetStudent = null;
      querySnapshot.forEach(doc => {
          const sData = doc.data();
          const phone = (sData.phone || sData.parentPhone || '').replace(/-/g, '').trim();
          if (phone.slice(-4) === phoneSuffix) targetStudent = { id: doc.id, ...sData };
      });
  
      if (!targetStudent) return { success: false, message: '비밀번호 불일치' };
  
      const parentUid = `parent_${targetStudent.id}`;
      const customToken = await auth.createCustomToken(parentUid, {
          role: 'parent',
          studentId: targetStudent.id 
      });
      return { success: true, token: customToken, studentData: targetStudent };
    } catch (error) { throw new HttpsError('internal', '로그인 오류'); }
});

// =====================================================
// 12. 일일 테스트 반 평균 계산
// =====================================================
export const getDailyTestAverages = onCall({ region }, async (request) => {
    const { classId } = request.data;
    if (!classId) return {};

    try {
        const q1 = db.collection("students").where("classId", "==", classId).get();
        const q2 = db.collection("students").where("classIds", "array-contains", classId).get();
        const [s1, s2] = await Promise.all([q1, q2]);
        
        const studentIds = new Set();
        s1.forEach(d => studentIds.add(d.id));
        s2.forEach(d => studentIds.add(d.id));

        if (studentIds.size === 0) return {};

        const snapshot = await db.collection("daily_tests")
            .orderBy("date", "desc")
            .limit(500)
            .get();

        const grouped = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            if (!studentIds.has(data.studentId)) return;

            const key = `${data.date}_${data.subjectName}`;
            const score = data.score;
            if (score !== null && score !== undefined && score !== '') {
                if (!grouped[key]) grouped[key] = { sum: 0, count: 0 };
                grouped[key].sum += Number(score);
                grouped[key].count += 1;
            }
        });

        const averages = {};
        for (const [key, val] of Object.entries(grouped)) {
            averages[key] = Math.round(val.sum / val.count);
        }
        return averages;
    } catch (e) {
        console.error("Daily Avg Error:", e);
        return {};
    }
});

// =====================================================
// 13. 주간 테스트 반 평균 계산
// =====================================================
export const getWeeklyTestAverages = onCall({ region }, async (request) => {
    const { classId } = request.data;
    if (!classId) return {};

    try {
        const q1 = db.collection("students").where("classId", "==", classId).get();
        const q2 = db.collection("students").where("classIds", "array-contains", classId).get();
        const [s1, s2] = await Promise.all([q1, q2]);
        
        const studentIds = new Set();
        s1.forEach(d => studentIds.add(d.id));
        s2.forEach(d => studentIds.add(d.id));

        if (studentIds.size === 0) return {};

        const snapshot = await db.collection("weekly_tests")
            .orderBy("targetDate", "desc")
            .limit(300) 
            .get();

        const grouped = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            if (!studentIds.has(data.uid)) return;

            const key = data.targetDate || data.weekLabel; 
            const score = data.score;
            if (score !== null && score !== undefined && score !== '') {
                if (!grouped[key]) grouped[key] = { sum: 0, count: 0 };
                grouped[key].sum += Number(score);
                grouped[key].count += 1;
            }
        });

        const averages = {};
        for (const [key, val] of Object.entries(grouped)) {
            averages[key] = Math.round(val.sum / val.count);
        }
        return averages;
    } catch (e) {
        console.error("Weekly Avg Error:", e);
        return {};
    }
});