// src/shared/dateUtils.js

// 1. 선택한 날짜가 속한 주의 '일요일' 날짜 구하기 (DB 저장용 ID)
export const getWeeklyTestTargetDate = (dateString) => {
    const date = dateString ? new Date(dateString) : new Date();
    const day = date.getDay(); // 0:일, 1:월 ... 5:금, 6:토
    
    // 금/토/일 입력 시 -> 다가오는 일요일 날짜로 변환
    // (예: 금요일(+2), 토요일(+1), 일요일(+0))
    const diff = day === 0 ? 0 : 7 - day;
    
    const targetDate = new Date(date);
    targetDate.setDate(date.getDate() + diff);
    targetDate.setHours(0, 0, 0, 0); // 시간 초기화
    
    return targetDate;
};

// 2. 날짜를 YYYY-MM-DD 형태로 변환 (input 태그용)
export const formatDateString = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (`0${d.getMonth() + 1}`).slice(-2);
    const day = (`0${d.getDate()}`).slice(-2);
    return `${year}-${month}-${day}`;
};

// 3. 기준 날짜(일요일)를 받아서 "N월 M주차" 라벨 만들기
export const getWeekLabel = (targetDate) => {
    const d = new Date(targetDate);
    const month = d.getMonth() + 1;
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
    const dayOfWeek = firstDay.getDay();
    
    // 해당 월의 몇 번째 주인지 계산
    const weekNumber = Math.ceil((d.getDate() + dayOfWeek) / 7);
    
    return `${month}월 ${weekNumber}주차`;
};

// 4. 학생 수정 가능 여부 체크 (목요일 밤 12시까지만 가능)
export const isEditAllowedForStudent = () => {
    const now = new Date();
    const day = now.getDay();
    // 월(1) ~ 목(4) 수정 가능 / 금,토,일 수정 불가
    return (day >= 1 && day <= 4);
};