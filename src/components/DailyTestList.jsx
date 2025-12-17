import React, { useState, useEffect } from 'react';
import { db } from '../shared/firebase'; // firebase 경로 수정 (shared 폴더 안)
import { collection, addDoc, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';

const DailyTestList = ({ studentId, studentName }) => {
  // 상태 관리
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // 입력 폼 상태 (날짜, 점수, 비고)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [score, setScore] = useState('');
  const [memo, setMemo] = useState('');

  // 1. 데이터 불러오기 함수
  const fetchTests = async () => {
    if (!studentId) return;

    setLoading(true);
    try {
      const q = query(
        collection(db, "daily_tests"),
        where("studentId", "==", studentId),
        orderBy("date", "desc")
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

  // 컴포넌트가 로드되거나 학생이 바뀌면 실행
  useEffect(() => {
    fetchTests();
  }, [studentId]);

  // 2. 점수 저장 함수 (사라졌던 입력 기능 복구)
  const handleAddTest = async () => {
    if (!score) return alert("점수를 입력해주세요!");
    if (!window.confirm(`${date} 일자 테스트 점수(${score}점)를 등록하시겠습니까?`)) return;

    try {
      await addDoc(collection(db, "daily_tests"), {
        studentId,
        studentName: studentName || "이름 없음",
        date,
        score: Number(score),
        memo,
        createdAt: new Date()
      });

      alert("등록되었습니다.");
      setScore('');
      setMemo('');
      fetchTests(); // 목록 새로고침
    } catch (error) {
      console.error("저장 에러:", error);
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  // 3. 삭제 함수
  const handleDelete = async (id) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, "daily_tests", id));
      fetchTests();
    } catch (error) {
      console.error("삭제 실패:", error);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mt-4">
      <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">📝 일일테스트 관리</h3>

      {/* --- [복구된 부분] 점수 입력 폼 --- */}
      <div className="flex flex-wrap gap-2 items-end mb-6 bg-blue-50 p-3 rounded-md">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600">날짜</label>
          <input 
            type="date" 
            className="border border-gray-300 p-2 rounded text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1 w-24">
          <label className="text-xs font-semibold text-gray-600">점수</label>
          <input 
            type="number" 
            placeholder="점수" 
            className="border border-gray-300 p-2 rounded text-sm w-full"
            value={score}
            onChange={(e) => setScore(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
          <label className="text-xs font-semibold text-gray-600">비고 (단원명 등)</label>
          <input 
            type="text" 
            placeholder="내용 입력" 
            className="border border-gray-300 p-2 rounded text-sm w-full"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </div>

        <button 
          onClick={handleAddTest}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700 h-[38px]"
        >
          입력
        </button>
      </div>

      {/* --- 누적 기록 리스트 --- */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="p-2">날짜</th>
              <th className="p-2">점수</th>
              <th className="p-2">내용</th>
              <th className="p-2 text-right">삭제</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="4" className="p-4 text-center">로딩 중...</td></tr>
            ) : tests.length === 0 ? (
              <tr><td colSpan="4" className="p-4 text-center text-gray-400">기록이 없습니다.</td></tr>
            ) : (
              tests.map((test) => (
                <tr key={test.id} className="hover:bg-gray-50">
                  <td className="p-2 text-gray-800">{test.date}</td>
                  <td className="p-2 font-bold text-blue-600">{test.score}점</td>
                  <td className="p-2 text-gray-500">{test.memo}</td>
                  <td className="p-2 text-right">
                    <button 
                      onClick={() => handleDelete(test.id)}
                      className="text-red-500 hover:text-red-700 underline text-xs"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DailyTestList;