// src/student/views/DashboardView.js
import { studentState } from "../studentState.js";
import { classVideoManager } from "../classVideoManager.js"; // 필요한 매니저 import

export const DashboardView = {
    container: null,

    init(containerId, navigateTo) {
        this.container = document.getElementById(containerId);
        this.navigateTo = navigateTo; // 화면 전환 함수 주입
    },

    render() {
        if (!this.container) return;
        this.container.innerHTML = '';
        const subjects = studentState.data.subjects;

        // 1. 과목 카드 생성
        if (subjects && subjects.length > 0) {
            subjects.forEach(subject => {
                this.container.appendChild(this.createCard(
                    'menu_book', 
                    subject.name, 
                    'bg-purple-50 text-purple-600', 
                    () => this.navigateTo('lessonSelection', subject)
                ));
            });
        } else {
            this.container.innerHTML += `<div class="col-span-full text-center text-slate-400">학습 과목 없음</div>`;
        }

        // 2. 기능 카드 생성 (코드가 훨씬 간결해짐)
        this.addSystemCards();
    },

    addSystemCards() {
        this.container.appendChild(this.createCard(
            'assignment', '숙제 확인', 'bg-yellow-50 text-yellow-600',
            () => this.navigateTo('homework')
        ));
        // ... 나머지 카드들도 동일하게 추가
    },

    createCard(icon, title, colorClass, onClick) {
        const div = document.createElement('div');
        div.className = `cursor-pointer bg-white p-6 rounded-2xl ... ${colorClass}`; // (스타일 생략)
        div.innerHTML = `
            <div class="w-14 h-14 rounded-2xl flex items-center justify-center ${colorClass}">
                <span class="material-icons-round text-3xl">${icon}</span>
            </div>
            <h3 class="font-bold text-slate-700">${title}</h3>
        `;
        div.addEventListener('click', onClick);
        return div;
    }
};