// src/parent/parentProgress.js
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore";

export const parentProgress = {
    db: null,
    student: null,
    classId: null,      // [추가] 선택된 반 ID
    classType: null,
    classSubjects: {},  // [추가] 선택된 반의 과목 목록

    init(db, student, classData) {
        this.db = db;
        this.student = student;
        this.classData = classData;
        
        // [핵심] 로그인한 반 정보 기준으로 설정
        this.classId = classData?.id;
        this.classType = classData?.classType || 'self-directed';
        this.classSubjects = classData?.subjects || {}; // 해당 반에 설정된 과목들

        const liveView = document.getElementById('progress-live');
        const selfView = document.getElementById('progress-self');
        const datePicker = document.getElementById('progress-date-picker');

        if(this.classType === 'live-lecture') {
            if(liveView) liveView.classList.remove('hidden');
            if(selfView) selfView.classList.add('hidden');
            
            if(datePicker) {
                const today = new Date().toISOString().split('T')[0];
                datePicker.value = today;
                datePicker.onchange = () => this.loadLiveProgress();
            }
        } else {
            if(liveView) liveView.classList.add('hidden');
            if(selfView) selfView.classList.remove('hidden');
        }
    },

    render() {
        if (this.classType === 'live-lecture') {
            this.loadLiveProgress();
        } else {
            this.loadSelfProgress();
        }
    },

    // 현강반 로직
    async loadLiveProgress() {
        const datePicker = document.getElementById('progress-date-picker');
        if(!datePicker) return;

        const date = datePicker.value;
        const listEl = document.getElementById('progress-live-list');
        listEl.innerHTML = '<div class="loader-small mx-auto"></div>';

        try {
            // [수정] this.student.classId 대신 this.classId(선택된 반) 사용
            const q = query(
                collection(this.db, 'classLectures'),
                where('classId', '==', this.classId), 
                where('lectureDate', '==', date)
            );
            const snap = await getDocs(q);

            if(snap.empty) {
                listEl.innerHTML = '<div class="text-center py-6 text-slate-400">해당 날짜의 수업 기록이 없습니다.</div>';
                return;
            }

            const data = snap.docs[0].data();
            const videos = data.videos || [];

            if(videos.length === 0) {
                listEl.innerHTML = '<div class="text-center py-6 text-slate-400">등록된 영상 제목이 없습니다.</div>';
                return;
            }

            listEl.innerHTML = videos.map(v => `
                <div class="bg-white p-4 border border-slate-100 rounded-xl shadow-sm flex items-center gap-3">
                    <span class="material-icons-round text-indigo-500">play_circle</span>
                    <span class="font-bold text-slate-700">${v.title}</span>
                </div>
            `).join('');

        } catch(e) { console.error(e); }
    },

    // 자기주도반 로직
    async loadSelfProgress() {
        const listEl = document.getElementById('progress-self-list');
        listEl.innerHTML = '<div class="loader-small mx-auto"></div>';

        try {
            let allLessons = [];
            
            // [수정] 전체 과목이 아니라, "현재 반에 설정된 과목"만 조회
            const subjectIds = Object.keys(this.classSubjects);

            if (subjectIds.length === 0) {
                listEl.innerHTML = '<div class="text-center py-10 text-slate-400">이 반에 설정된 학습 과목이 없습니다.</div>';
                return;
            }

            // 해당 반의 과목들만 순회하며 내 진도 체크
            for(const subjectId of subjectIds) {
                // 과목 내 레슨 목록 조회
                const lessonsSnap = await getDocs(collection(this.db, 'subjects', subjectId, 'lessons'));
                
                for(const lDoc of lessonsSnap.docs) {
                    // 각 레슨에 대한 내 기록(submission) 확인
                    const subRef = doc(this.db, 'subjects', subjectId, 'lessons', lDoc.id, 'submissions', this.student.id);
                    const subSnap = await getDoc(subRef);
                    
                    if(subSnap.exists()) {
                        const subData = subSnap.data();
                        const isCompleted = subData.status === 'passed' || subData.status === 'completed';
                        
                        allLessons.push({
                            title: lDoc.data().title,
                            status: isCompleted ? '수업완료' : '진행중',
                            date: subData.submittedAt ? subData.submittedAt.toDate() : new Date()
                        });
                    }
                }
            }

            // 최신순 정렬
            allLessons.sort((a,b) => b.date - a.date);

            if(!allLessons.length) {
                listEl.innerHTML = '<div class="text-center py-10 text-slate-400">아직 진행된 학습이 없습니다.</div>';
                return;
            }

            listEl.innerHTML = allLessons.map(item => `
                <div class="mobile-card flex justify-between items-center">
                    <div>
                        <h3 class="font-bold text-slate-800">${item.title}</h3>
                        <p class="text-xs text-slate-400 mt-1">${item.date.toLocaleDateString()}</p>
                    </div>
                    <div>
                        ${item.status === '수업완료' 
                            ? '<span class="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">수업완료</span>'
                            : '<span class="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold">진행중</span>'}
                    </div>
                </div>
            `).join('');

        } catch(e) { console.error(e); }
    }
};