// src/admin/subjectManager.js

import { collection, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, query, getDocs, writeBatch } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

export const subjectManager = {
    // adminApp.js로부터 전체 앱 컨텍스트(state, elements 등)를 전달받습니다.
    init(app) {
        this.app = app;

        // 과목 관리 관련 이벤트 리스너를 여기서 설정합니다.
        this.app.elements.addSubjectBtn.addEventListener('click', () => this.addNewSubject());
        
        // 초기 과목 데이터를 불러옵니다.
        this.listenForSubjects();
    },

    async addNewSubject() {
        const subjectName = this.app.elements.newSubjectNameInput.value.trim();
        if (!subjectName) { 
            showToast("과목 이름을 입력해주세요."); 
            return; 
        }
        try {
            await addDoc(collection(db, 'subjects'), { name: subjectName, createdAt: serverTimestamp() });
            showToast("새로운 공통 과목이 추가되었습니다.", false);
            this.app.elements.newSubjectNameInput.value = '';
        } catch (error) { 
            console.error("과목 추가 실패:", error); 
            showToast("과목 추가에 실패했습니다."); 
        }
    },

    listenForSubjects() {
        const q = query(collection(db, 'subjects'));
        onSnapshot(q, (snapshot) => {
            const subjects = [];
            snapshot.forEach(doc => subjects.push({ id: doc.id, ...doc.data() }));
            subjects.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
            
            // adminApp의 공통 state를 업데이트합니다.
            this.app.state.subjects = subjects; 
            
            this.renderSubjectList();

            // 과목 목록이 업데이트되었다는 신호를 앱 전체에 보냅니다.
            document.dispatchEvent(new CustomEvent('subjectsUpdated'));
        });
    },

    renderSubjectList() {
        const { subjectsList, subjects } = this.app.elements;
        subjectsList.innerHTML = '';
        if (this.app.state.subjects.length === 0) {
            subjectsList.innerHTML = '<p class="text-sm text-slate-400">생성된 과목이 없습니다.</p>';
            return;
        }
        this.app.state.subjects.forEach(sub => {
            const subjectDiv = document.createElement('div');
            subjectDiv.className = "p-3 border rounded-lg flex items-center justify-between";
            subjectDiv.innerHTML = `<span class="font-medium text-slate-700">${sub.name}</span> <button data-id="${sub.id}" class="delete-subject-btn text-red-500 hover:text-red-700 text-sm font-semibold">삭제</button>`;
            subjectsList.appendChild(subjectDiv);
            subjectDiv.querySelector('.delete-subject-btn').addEventListener('click', (e) => this.deleteSubject(e.target.dataset.id));
        });
    },

    async deleteSubject(subjectId) {
        if (!confirm("정말로 이 과목을 삭제하시겠습니까? 과목에 속한 모든 학습, 교재 정보가 사라지고, 각 반에서 이 과목이 제외됩니다.")) return;
        
        try {
            const batch = writeBatch(db);
            const lessonsRef = collection(db, 'subjects', subjectId, 'lessons');
            const lessonsSnapshot = await getDocs(lessonsRef);
            lessonsSnapshot.forEach(doc => batch.delete(doc.ref));

            const textbooksRef = collection(db, 'subjects', subjectId, 'textbooks');
            const textbooksSnapshot = await getDocs(textbooksRef);
            textbooksSnapshot.forEach(doc => batch.delete(doc.ref));

            const classesQuery = query(collection(db, 'classes'));
            const classesSnapshot = await getDocs(classesQuery);
            classesSnapshot.forEach(classDoc => {
                const classData = classDoc.data();
                if (classData.subjects && classData.subjects[subjectId]) {
                    const updatedSubjects = { ...classData.subjects };
                    delete updatedSubjects[subjectId];
                    batch.update(classDoc.ref, { subjects: updatedSubjects });
                }
            });

            const subjectRef = doc(db, 'subjects', subjectId);
            batch.delete(subjectRef);

            await batch.commit();
            showToast("과목과 관련된 모든 데이터가 정리되었습니다.", false);
        } catch (error) {
            console.error("과목 삭제 실패:", error);
            showToast("과목 삭제에 실패했습니다.");
        }
    },
};