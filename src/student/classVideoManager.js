// src/student/classVideoManager.js

import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const classVideoManager = {
    app: null,
    elements: {
        dateScreen: 'student-class-video-date-screen',
        qnaDateScreen: 'student-qna-video-date-screen',
        videoListScreen: 'student-video-titles-screen',
        classDateList: 'student-class-video-date-list',
        qnaDateList: 'student-qna-video-date-list',
        videoTitleList: 'student-video-titles-list',
        videoTitleHeader: 'student-video-titles-date',
        backToSubjectsFromClass: 'student-back-to-subjects-from-class-video-btn',
        backToSubjectsFromQna: 'student-back-to-subjects-from-qna-btn',
        backToDates: 'student-back-to-video-dates-btn'
    },
    state: { currentType: 'class', selectedDate: null, videos: [] },

    init(app) {
        this.app = app;
        this.addEventListeners();
    },

    addEventListeners() {
        const el = (id) => document.getElementById(this.elements[id]);
        
        el('backToSubjectsFromClass')?.addEventListener('click', () => this.app.showSubjectSelectionScreen());
        el('backToSubjectsFromQna')?.addEventListener('click', () => this.app.showSubjectSelectionScreen());
        
        // ✨ [수정됨] 뒤로가기 시 영상 목록을 비워서 재생 중단
        el('backToDates')?.addEventListener('click', () => {
            // 1. 영상 목록 컨테이너 비우기 (iframe 삭제 -> 재생 중단)
            const videoContainer = document.getElementById(this.elements.videoTitleList);
            if (videoContainer) videoContainer.innerHTML = "";

            // 2. 화면 전환
            this.app.showScreen(this.state.currentType === 'class' ? this.elements.dateScreen : this.elements.qnaDateScreen);
        });
    },

    async showDateSelectionScreen(type) {
        this.state.currentType = type;
        const classId = this.app.state.studentData?.classId;
        if (!classId) { showToast("반 정보가 없습니다.", true); return; }

        const targetScreen = type === 'class' ? this.elements.dateScreen : this.elements.qnaDateScreen;
        const listContainer = type === 'class' ? this.elements.classDateList : this.elements.qnaDateList;
        const collectionName = type === 'class' ? 'classLectures' : 'classVideos';
        const dateField = type === 'class' ? 'lectureDate' : 'videoDate';

        this.app.showScreen(targetScreen);
        const container = document.getElementById(listContainer);
        if(!container) return;
        
        container.innerHTML = '<div class="text-center py-10 text-slate-400">날짜를 불러오는 중...</div>';

        try {
            const q = query(collection(db, collectionName), where('classId', '==', classId), orderBy(dateField, 'desc'));
            const snapshot = await getDocs(q);
            container.innerHTML = '';
            
            if (snapshot.empty) { container.innerHTML = '<div class="text-center py-10 text-slate-400">등록된 영상이 없습니다.</div>'; return; }

            const dateSet = new Set();
            snapshot.forEach(doc => {
                const date = doc.data()[dateField];
                if (date && !dateSet.has(date)) {
                    dateSet.add(date);
                    const btn = document.createElement('button');
                    btn.className = "w-full p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:bg-indigo-50 transition text-left mb-3 flex justify-between items-center";
                    btn.innerHTML = `<span class="font-bold text-slate-700 text-lg">${date}</span><span class="material-icons text-slate-300">chevron_right</span>`;
                    btn.onclick = () => this.showVideoList(date);
                    container.appendChild(btn);
                }
            });
        } catch (e) { container.innerHTML = '<div class="text-center py-10 text-red-400">목록 로드 실패</div>'; }
    },

    async showVideoList(date) {
        this.state.selectedDate = date;
        this.app.showScreen(this.elements.videoListScreen);
        const container = document.getElementById(this.elements.videoTitleList);
        const header = document.getElementById(this.elements.videoTitleHeader);
        header.textContent = `${date} 영상 목록`;
        container.innerHTML = '<div class="text-center py-10 text-slate-400">로딩 중...</div>';

        const type = this.state.currentType;
        const collectionName = type === 'class' ? 'classLectures' : 'classVideos';
        const dateField = type === 'class' ? 'lectureDate' : 'videoDate';

        try {
            const q = query(collection(db, collectionName), where('classId', '==', this.app.state.studentData.classId), where(dateField, '==', date));
            const snapshot = await getDocs(q);
            container.innerHTML = '';
            
            const videos = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if (type === 'qna') videos.push({ title: data.title, url: data.youtubeUrl });
                else if (data.videos) data.videos.forEach(v => videos.push(v));
            });

            if (videos.length === 0) { container.innerHTML = '<div class="text-center py-10 text-slate-400">영상이 없습니다.</div>'; return; }

            videos.forEach(video => {
                const div = document.createElement('div');
                div.className = "bg-white p-4 rounded-xl border border-slate-100 shadow-sm mb-3";
                div.innerHTML = `<h3 class="font-bold text-slate-800 mb-2">${video.title}</h3><div class="aspect-video bg-black rounded-lg overflow-hidden"><iframe class="w-full h-full" src="${this.convertYoutubeUrl(video.url)}" allow="autoplay; encrypted-media" allowfullscreen></iframe></div>`;
                container.appendChild(div);
            });
        } catch (e) { container.innerHTML = '<div class="text-center py-10 text-red-400">로드 실패</div>'; }
    },

    convertYoutubeUrl(url) {
        if (!url) return "";
        const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        return match ? `https://www.youtube.com/embed/${match[1]}?rel=0` : url;
    }
};