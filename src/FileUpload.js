import React, { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

function FileUpload() {
  const [file, setFile] = useState(null);
  const [downloadURL, setDownloadURL] = useState("");

  const handleUpload = async () => {
    if (!file) {
      alert("파일을 선택하세요!");
      return;
    }

    try {
      // Storage 경로 지정 (예: uploads/파일명)
      const storageRef = ref(storage, `uploads/${file.name}`);
      await uploadBytes(storageRef, file);

      // 업로드 후 다운로드 URL 가져오기
      const url = await getDownloadURL(storageRef);
      setDownloadURL(url);
    } catch (error) {
      console.error("업로드 실패:", error);
      alert("업로드 중 오류가 발생했습니다.");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>파일 업로드 테스트</h2>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={handleUpload}>업로드</button>

      {downloadURL && (
        <div>
          <p>✅ 업로드 성공!</p>
          <a href={downloadURL} target="_blank" rel="noopener noreferrer">
            {downloadURL}
          </a>
        </div>
      )}
    </div>
  );
}

export default FileUpload;
