import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig'; // 경로가 틀리면 ../firebase 등으로 수정해주세요
import { collection, addDoc, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';

const DailyTestList = ({ studentId, studentName }) => {
  // 상태 관리
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // 입력 폼 상태
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // 오늘 날짜
  const [score, setScore] = useState('');
  const [memo, setMemo] = useState('');

  // 1. 데이터 불러오기 함수 (카드 들어갔을 때 목록이 안 뜨는 문제 해결)
  const fetchTests = async () => {
    if (!studentId) return;

    setLoading(true);
    try {
      const q = query(
        collection(db, "daily_tests"),
        where("studentId", "==", studentId),
        orderBy("date", "desc") // 날짜 최신순 정렬
      );

      const querySnapshot = await getDocs(q);
      const testData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setTests(testData);
    } catch (error) {
      console.error("데이터 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트가 화면에 나올 때 자동으로 실행
  useEffect(() => {
    fetchTests();
  }, [studentId]);

  // 2. 점수 저장 함수 (입력 카드가 작동하도록 복구)
  const handleAddTest = async () => {
    if (!score) return alert("점수를 입력해주세요!");

    if (!window.confirm(`${date} 날짜로 ${score}점을 저장하시겠습니까?`)) return;

    try {
      await addDoc(collection(db, "daily_tests"), {
        studentId,
        studentName: studentName || "이름 없음",
        date,
        score: Number(score),
        memo,
        createdAt: new Date()
      });

      alert("저장되었습니다.");
      setScore('');
      setMemo('');
      fetchTests(); // 저장 후 목록 새로고침
    } catch (error) {
      console.error("저장 에러:", error);
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  // 3. 삭제 함수
  const handleDelete = async (id) => {
    if (!window.confirm("정말 이 기록을 삭제하시겠습니까?")) return;
    
    try {
      await deleteDoc(doc(db, "daily_tests", id));
      fetchTests(); // 삭제 후 목록 새로고침
    } catch (error) {
      console.error("삭제 실패:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* --------------------------------------------- */}
      {/* [문제 1 해결] 일일테스트 입력 카드 (UI 복구) */}
      {/* --------------------------------------------- */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-4">✏️ 일일테스트 점수 입력</h3>
        
        <div className="flex flex-col md:flex-row gap-4 items-end">
          {/* 날짜 입력 */}
          <div className="flex flex-col gap-1 w-full md:w-auto">
            <label className="text-sm font-semibold text-gray-600">날짜</label>
            <input 
              type="date" 
              className="border border-gray-300 p-2 rounded-md focus:outline-blue-500"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* 점수 입력 */}
          <div className="flex flex-col gap-1 w-full md:w-32">
            <label className="text-sm font-semibold text-gray-600">점수</label>
            <input 
              type="number" 
              placeholder="점수" 
              className="border border-gray-300 p-2 rounded-md focus:outline-blue-500"
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
          </div>

          {/* 메모 입력 */}
          <div className="flex flex-col gap-1 flex-1 w-full">
            <label className="text-sm font-semibold text-gray-600">비고 (선택)</label>
            <input 
              type="text" 
              placeholder="예: 지수로그 단원평가" 
              className="border border-gray-300 p-2 rounded-md focus:outline-blue-500 w-full"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>

          {/* 저장 버튼 */}
          <button 
            onClick={handleAddTest}
            className="bg-blue-600 text-white px-6 py-2 rounded-md font-bold hover:bg-blue-700 transition-colors h-[42px] w-full md:w-auto"
          >
            입력
          </button>
        </div>
      </div>

      {/* --------------------------------------------- */}
      {/* [문제 2 해결] 누적 기록 리스트 (데이터 로딩) */}
      {/* --------------------------------------------- */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-4">📊 누적 기록</h3>
        
        {loading ? (
          <p className="text-center text-gray-500 py-4">데이터를 불러오는 중입니다...</p>
        ) : tests.length === 0 ? (
          <p className="text-center text-gray-400 py-10 bg-gray-50 rounded-lg">
            아직 등록된 테스트가 없습니다. <br/>위에서 점수를 입력해주세요.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-left bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-sm font-bold text-gray-600">날짜</th>
                  <th className="p-3 text-sm font-bold text-gray-600">점수</th>
                  <th className="p-3 text-sm font-bold text-gray-600">비고</th>
                  <th className="p-3 text-sm font-bold text-gray-600 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tests.map((test) => (
                  <tr key={test.id} className="hover:bg-gray-50">
                    <td className="p-3 text-gray-800 text-sm">{test.date}</td>
                    <td className="p-3 font-bold text-blue-600">{test.score}점</td>
                    <td className="p-3 text-gray-500 text-sm">{test.memo}</td>
                    <td className="p-3 text-right">
                      <button 
                        onClick={() => handleDelete(test.id)}
                        className="text-red-400 text-xs hover:text-red-600 border border-red-200 px-2 py-1 rounded hover:bg-red-50"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyTestList;