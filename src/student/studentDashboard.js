// src/student/studentDashboard.js
import { classVideoManager } from "./classVideoManager.js";
import { studentLesson } from "./studentLesson.js"; // 일일 테스트 초기화용

export const studentDashboard = {
    app: null,

    init(app) {
        this.app = app;
    },

    // 대시보드 화면 그리기
    render() {
        const container = document.getElementById(this.app.elements.dashboardContainer);
        if (!container) return;
        
        container.innerHTML = '';
        const subjects = this.app.state.subjects || [];
        
        // 1. 과목 카드 생성 (영상 학습용)
        if (subjects.length > 0) {
            subjects.forEach(subject => {
                container.appendChild(this.createCard(
                    'menu_book', 
                    subject.name, 
                    'bg-purple-50 text-purple-600 group-hover:bg-purple-100', 
                    () => this.app.showLessonSelectionScreen(subject.id)
                ));
            });
        } else {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = "col-span-full text-center text-slate-400 py-4";
            emptyMsg.textContent = "등록된 학습 과목이 없습니다.";
            container.appendChild(emptyMsg);
        }

        // 2. 시스템 기능 카드 생성
        this.addSystemCards(container);
    },

    addSystemCards(container) {
        // [숙제 확인]
        container.appendChild(this.createCard(
            'assignment', '숙제 확인', 'bg-yellow-50 text-yellow-600 group-hover:bg-yellow-100',
            () => this.app.showHomeworkScreen()
        ));

        // [일일 테스트]
        container.appendChild(this.createCard(
            'edit_note', '일일 테스트', 'bg-orange-50 text-orange-600 group-hover:bg-orange-100',
            () => {
                this.app.showScreen(this.app.elements.dailyTestScreen);
                // studentLesson 모듈의 기능 활용
                if(studentLesson.initDailyTestScreen) studentLesson.initDailyTestScreen();
            }
        ));

        // [주간 테스트] (추가된 부분)
        container.appendChild(this.createCard(
            'event_available', '주간 테스트', 'bg-rose-50 text-rose-600 group-hover:bg-rose-100',
            () => this.app.showWeeklyTestScreen()
        ));

        // [수업 영상]
        container.appendChild(this.createCard(
            'ondemand_video', '수업 영상', 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100',
            () => classVideoManager.showDateSelectionScreen('class')
        ));

        // [질문 영상]
        container.appendChild(this.createCard(
            'question_answer', '질문 영상', 'bg-cyan-50 text-cyan-600 group-hover:bg-cyan-100',
            () => classVideoManager.showDateSelectionScreen('qna')
        ));

        // [성적표 확인]
        container.appendChild(this.createCard(
            'assessment', '성적표 확인', 'bg-lime-50 text-lime-600 group-hover:bg-lime-100',
            () => this.app.showReportListScreen()
        ));
    },

    createCard(iconName, title, colorClass, onClickHandler) {
        const div = document.createElement('div');
        div.className = "cursor-pointer bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition border border-slate-100 flex flex-col items-center justify-center gap-3 group active:scale-95 duration-200";
        div.innerHTML = `
            <div class="w-14 h-14 rounded-2xl flex items-center justify-center transition ${colorClass}">
                <span class="material-icons-round text-3xl">${iconName}</span>
            </div>
            <h3 class="font-bold text-slate-700 text-base">${title}</h3>
        `;
        div.addEventListener('click', onClickHandler);
        return div;
    }
};