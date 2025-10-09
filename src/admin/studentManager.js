// src/admin/studentManager.js

import { collection, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, where, query } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

export const studentManager = {
    init(app) {
        this.app = app;

        this.app.elements.addStudentBtn.addEventListener('click', () => this.addNewStudent());
        this.listenForStudents(); 
    },

    async addNewStudent() {
        const { elements } = this.app;
        const studentName = elements.newStudentNameInput.value.trim();
        const phone = elements.newStudentPasswordInput.value.trim();

        if (!studentName || !phone) { 
            showToast("학생 이름과 전화번호를 모두 입력해주세요."); 
            return; 
        }
        if (!/^\d+$/.test(phone) || phone.length < 4) {
            showToast("전화번호는 4자리 이상의 숫자로 입력해주세요."); 
            return;
        }

        const password = phone.slice(-4);
        try {
            await addDoc(collection(db, 'students'), { 
                name: studentName, 
                password: password, 
                phone: phone,
                classId: null,
                createdAt: serverTimestamp() 
            });
            showToast(`새로운 학생이 추가되었습니다. (비밀번호: ${password})`, false);
            elements.newStudentNameInput.value = '';
            elements.newStudentPasswordInput.value = '';
        } catch (error) { 
            console.error("학생 추가 실패:", error); 
            showToast("학생 추가에 실패했습니다."); 
        }
    },

    listenForStudents() {
        const { studentsList } = this.app.elements;
        if (!studentsList) return;

        const q = query(collection(db, 'students'));
        onSnapshot(q, (snapshot) => {
            studentsList.innerHTML = '';
            if (snapshot.empty) { 
                studentsList.innerHTML = '<p class="text-sm text-slate-400">등록된 학생이 없습니다.</p>'; 
                return; 
            }
            const students = [];
            snapshot.forEach(doc => students.push({ id: doc.id, ...doc.data() }));
            students.sort((a, b) => a.name.localeCompare(b.name));
            
            const assigned = students.filter(s => s.classId);
            const unassigned = students.filter(s => !s.classId);

            studentsList.innerHTML += '<h4 class="text-md font-semibold text-slate-600 mt-4">미배정 학생</h4>';
            if (unassigned.length === 0) {
                 studentsList.innerHTML += '<p class="text-sm text-slate-400">미배정 학생이 없습니다.</p>';
            } else {
                unassigned.forEach(std => this.renderStudent(std));
            }

            studentsList.innerHTML += '<h4 class="text-md font-semibold text-slate-600 mt-6">반 배정된 학생</h4>';
            if (assigned.length === 0) {
                 studentsList.innerHTML += '<p class="text-sm text-slate-400">반 배정된 학생이 없습니다.</p>';
            } else {
                 assigned.forEach(std => this.renderStudent(std));
            }
        });
    },

    renderStudent(studentData) {
        const studentDiv = document.createElement('div');
        const className = this.app.state.classes.find(c => c.id === studentData.classId)?.name || '미배정';
        studentDiv.className = "p-3 border rounded-lg flex items-center justify-between";
        studentDiv.innerHTML = `
            <div>
                <span class="font-medium text-slate-700">${studentData.name} (${studentData.phone || '번호없음'})</span>
                <span class="text-xs text-slate-500 ml-2">[${className}]</span>
            </div>
            <div class="flex gap-2">
                <button data-id="${studentData.id}" data-name="${studentData.name}" class="reset-password-btn text-blue-500 hover:text-blue-700 text-sm font-semibold">비밀번호 초기화</button>
                <button data-id="${studentData.id}" class="delete-student-btn text-red-500 hover:red-blue-700 text-sm font-semibold">삭제</button>
            </div>
        `;
        this.app.elements.studentsList.appendChild(studentDiv);

        studentDiv.querySelector('.delete-student-btn').addEventListener('click', async (e) => {
            if (confirm(`'${studentData.name}' 학생을 정말 삭제하시겠습니까?`)) {
                await deleteDoc(doc(db, "students", e.target.dataset.id));
                showToast("학생이 삭제되었습니다.", false);
            }
        });

        studentDiv.querySelector('.reset-password-btn').addEventListener('click', (e) => {
            this.resetStudentPassword(e.target.dataset.id, e.target.dataset.name);
        });
    },

    async resetStudentPassword(studentId, studentName) {
        const newPhone = prompt(`'${studentName}' 학생의 새 전화번호를 입력하세요.\n(비밀번호는 전화번호 뒷 4자리로 자동 설정됩니다.)`);
        if (newPhone === null) return;

        if (!/^\d+$/.test(newPhone) || newPhone.length < 4) {
            showToast("전화번호는 4자리 이상의 숫자로 입력해주세요."); 
            return;
        }

        const finalPassword = newPhone.slice(-4);
        try {
            await updateDoc(doc(db, 'students', studentId), { password: finalPassword, phone: newPhone });
            showToast(`'${studentName}' 학생의 비밀번호가 '${finalPassword}'로 초기화되었습니다.`, false);
        } catch (error) { 
            console.error("비밀번호 초기화 실패:", error); 
            showToast("비밀번호 초기화에 실패했습니다."); 
        }
    },
};