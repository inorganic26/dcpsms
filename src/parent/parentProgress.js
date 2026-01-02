// src/parent/parentProgress.js
import { collection, query, where, getDocs, orderBy, doc, getDoc, onSnapshot } from "firebase/firestore";

export const parentProgress = {
    db: null,
    student: null,
    classId: null,      
    classType: null,
    classSubjects: {},  
    unsubscribeLive: null,

    init(db, student, classData) {
        this.db = db;
        this.student = student;
        this.classData = classData;
        
        this.classId = classData?.id;
        this.classType = classData?.classType || 'self-directed';
        this.classSubjects = classData?.subjects || {}; 

        const liveView = document.getElementById('progress-live');
        const selfView = document.getElementById('progress-self');
        const datePicker = document.getElementById('progress-date-picker');

        // 기존 리스너 해제
        if(this.unsubscribeLive) {
            this.unsubscribeLive();
            this.unsubscribeLive = null;
        }

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

    // 현강반 로직 (실시간)
    loadLiveProgress() {
        const datePicker = document.getElementById('progress-date-picker');
        if(!datePicker) return;

        const date = datePicker.value;
        const listEl = document.getElementById('progress-live-list');
        listEl.innerHTML = '<div class="loader-small mx-auto"></div>';

        if(this.unsubscribeLive) {
            this.unsubscribeLive();
        }

        const q = query(
            collection(this.db, 'classLectures'),
            where('classId', '==', this.classId), 
            where('lectureDate', '==', date)
        );

        this.unsubscribeLive = onSnapshot(q, (snap) => {
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
        });
    },

    // 자기주도반 로직 (기존 유지)
    async loadSelfProgress() {
        const listEl = document.getElementById('progress-self-list');
        listEl.innerHTML = '<div class="loader-small mx-auto"></div>';

        try {
            let allLessons = [];
            const subjectIds = Object.keys(this.classSubjects);

            if (subjectIds.length === 0) {
                listEl.innerHTML = '<div class="text-center py-10 text-slate-400">이 반에 설정된 학습 과목이 없습니다.</div>';
                return;
            }

            for(const subjectId of subjectIds) {
                const lessonsSnap = await getDocs(collection(this.db, 'subjects', subjectId, 'lessons'));
                
                for(const lDoc of lessonsSnap.docs) {
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