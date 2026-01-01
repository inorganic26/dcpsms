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
// 1. 학생 계정 생성 함수 (관리자용)
// =====================================================
export const createStudentAccount = onCall({ region }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }

  const { name, phone, parentPhone } = request.data;

  if (!phone || phone.length < 4) {
    throw new HttpsError("invalid-argument", "전화번호 형식이 올바르지 않습니다.");
  }

  // 초기 비밀번호 규칙: 전화번호 뒷4자리 + 솔트
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
// 2. 사용자 역할 설정 함수들
// =====================================================
export const setCustomUserRole = onCall({ region }, async (req) => {
  const { email, role } = req.data;
  const caller = req.auth;

  if (!caller?.token?.role || caller.token.role !== "admin") {
    throw new HttpsError("permission-denied", "관리자 권한이 필요합니다.");
  }
  if (!email || !role) {
    throw new HttpsError("invalid-argument", "이메일과 역할이 필요합니다.");
  }

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
  if (!caller || caller.token.role !== "admin") {
    throw new HttpsError("permission-denied", "관리자만 역할을 부여할 수 있습니다.");
  }

  if (!uid || !role) {
    throw new HttpsError("invalid-argument", "UID와 역할이 필요합니다.");
  }

  try {
    await auth.setCustomUserClaims(uid, { role });
    return { message: `UID ${uid} → '${role}' 역할 부여 완료` };
  } catch (err) {
    throw new HttpsError("internal", err.message);
  }
});

// =====================================================
// 3. [자동 청소] 숙제 삭제 시 관련 파일 자동 삭제
// =====================================================
export const onHomeworkDeleted = onDocumentDeleted({ region, document: "homeworks/{homeworkId}" }, async (event) => {
    const homeworkId = event.params.homeworkId;
    const bucket = getStorage().bucket();
    const folderPath = `homeworks/${homeworkId}/`;

    try {
        await bucket.deleteFiles({ prefix: folderPath });
        console.log(`🧹 [CleanUp] 숙제(${homeworkId}) 관련 파일들이 스토리지에서 삭제되었습니다.`);
    } catch (error) {
        console.error(`❌ [CleanUp Error] 숙제 파일 삭제 실패 (${homeworkId}):`, error);
    }
});


// =====================================================
// 4. [자동 청소] 학생 삭제 시 관련 파일 자동 삭제
// =====================================================
export const onStudentDeleted = onDocumentDeleted({ region, document: "students/{studentId}" }, async (event) => {
    const studentId = event.params.studentId;
    const bucket = getStorage().bucket();
    const folderPath = `students/${studentId}/`;

    try {
         await bucket.deleteFiles({ prefix: folderPath });
         console.log(`🧹 [CleanUp] 학생(${studentId}) 관련 파일 삭제 완료.`);
         
         try {
             await auth.deleteUser(studentId);
             console.log(`👤 [Auth] 학생(${studentId}) 인증 계정도 삭제되었습니다.`);
         } catch (authErr) {
             console.log(`ℹ️ [Auth] 인증 계정 삭제 건너뜀: ${authErr.message}`);
         }

    } catch (error) {
        console.error(`❌ [CleanUp Error] 학생 정리 실패:`, error);
    }
});

// =====================================================
// 5. 교사 계정 생성 및 권한 부여 함수
// =====================================================
export const createTeacherAccount = onCall({ region }, async (request) => {
  const caller = request.auth;
  if (!caller || caller.token.role !== "admin") {
    throw new HttpsError("permission-denied", "관리자만 교사를 등록할 수 있습니다.");
  }

  const { name, phone } = request.data;

  if (!phone || phone.length < 4) {
    throw new HttpsError("invalid-argument", "전화번호 형식이 올바르지 않습니다.");
  }

  const passwordInit = phone.slice(-4);
  const salt = "dcpsms_secure_key"; // [중요] 이 키가 teacherAuth.js와 일치해야 로그인 가능
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

    return { success: true, message: "교사 계정 생성 및 권한 부여 완료" };

  } catch (error) {
    console.error("교사 생성 실패:", error);
    throw new HttpsError("internal", "교사 계정 생성 중 오류가 발생했습니다.");
  }
});

// =====================================================
// 6. [수정됨] 관리자 비밀번호 검증 (.env 사용)
// =====================================================
export const verifyAdminPassword = onCall({ region }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "로그인 세션이 필요합니다.");
  }

  const { password } = request.data;
  
  // [보안] 환경 변수에서 비밀번호를 가져와 비교합니다.
  if (password !== process.env.ADMIN_PASSWORD) {
    throw new HttpsError("permission-denied", "비밀번호가 일치하지 않습니다.");
  }

  try {
    await auth.setCustomUserClaims(request.auth.uid, { role: "admin" });
    return { success: true, message: "관리자 권한이 부여되었습니다." };
  } catch (error) {
    console.error("권한 부여 실패:", error);
    throw new HttpsError("internal", "권한 부여 중 오류가 발생했습니다.");
  }
});

// =====================================================
// 7. 선생님 로그인 처리 (구버전 - 클라이언트 Auth로 대체 권장)
// =====================================================
// 주의: 클라이언트에서 teacherAuth.js를 통해 로그인하면 이 함수는 더 이상 쓰이지 않지만,
// 혹시 모를 호환성을 위해 남겨둡니다. (보안상 삭제하는 것이 가장 좋습니다)
export const verifyTeacherLogin = onCall({ region }, async (request) => {
  const { name, password } = request.data;

  try {
    const snapshot = await db.collection("teachers").where("name", "==", name).get();
    if (snapshot.empty) {
        return { success: false, message: "존재하지 않는 선생님입니다." };
    }

    const teacherDoc = snapshot.docs[0];
    const teacherData = teacherDoc.data();
    const teacherId = teacherDoc.id;

    // 이 부분은 DB의 평문 비밀번호를 비교하는 취약점이 있습니다.
    // 클라이언트 사이드 로그인을 사용하시길 바랍니다.
    let isMatch = false;
    if (teacherData.password === password) isMatch = true;
    else if (teacherData.phone && teacherData.phone.slice(-4) === password) isMatch = true;

    if (!isMatch) {
        return { success: false, message: "비밀번호가 일치하지 않습니다." };
    }

    const customToken = await auth.createCustomToken(teacherId, { role: "teacher" });
    return { success: true, token: customToken, teacherId, teacherData };

  } catch (error) {
    console.error("Teacher Login Error:", error);
    throw new HttpsError("internal", "로그인 처리 중 오류 발생");
  }
});

// =====================================================
// 8. 학생 로그인용 반 목록 (그대로 유지)
// =====================================================
export const getClassesForStudentLogin = onCall({ region }, async () => {
    try {
        const snapshot = await db.collection("classes").orderBy("name").get();
        const classes = snapshot.docs.map(d => ({ id: d.id, name: d.data().name }));
        return classes;
    } catch(e) {
        throw new HttpsError("internal", "반 목록 로드 실패");
    }
});

// =====================================================
// 9. 학생 로그인용 학생 목록 (그대로 유지)
// =====================================================
export const getStudentsInClassForLogin = onCall({ region }, async (request) => {
    const { classId } = request.data;
    if(!classId) throw new HttpsError("invalid-argument", "반 정보가 필요합니다.");

    try {
        const q1 = db.collection("students").where("classId", "==", classId).get();
        const q2 = db.collection("students").where("classIds", "array-contains", classId).get();
        
        const [s1, s2] = await Promise.all([q1, q2]);
        const studentsMap = new Map();

        s1.forEach(d => studentsMap.set(d.id, { id: d.id, name: d.data().name }));
        s2.forEach(d => studentsMap.set(d.id, { id: d.id, name: d.data().name }));

        return Array.from(studentsMap.values()).sort((a,b) => a.name.localeCompare(b.name));
    } catch(e) {
        throw new HttpsError("internal", "학생 목록 로드 실패");
    }
});

// =====================================================
// 10. 학생 로그인 검증 (구버전 - 클라이언트 Auth 권장)
// =====================================================
export const verifyStudentLogin = onCall({ region }, async (request) => {
    const { studentId, password } = request.data;
    
    try {
        const docSnap = await db.collection("students").doc(studentId).get();
        if(!docSnap.exists) return { success: false, message: "학생 정보가 없습니다." };
        
        const data = docSnap.data();
        const phone = data.phone || "";
        const targetPw = phone.length >= 4 ? phone.slice(-4) : phone;
        
        if(password !== targetPw) {
            return { success: false, message: "비밀번호가 일치하지 않습니다." };
        }
        
        const token = await auth.createCustomToken(studentId, { role: "student" });
        return { success: true, token, studentData: data };
    } catch(e) {
        console.error(e);
        throw new HttpsError("internal", "로그인 처리 실패");
    }
});