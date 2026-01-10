import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

async function reorganizeDist() {
  console.log('🔧 Dist 폴더 구조 정리 중...');

  // 이동할 대상 목록 (소스 경로 -> 목적지 경로)
  const moves = [
    { src: 'src/admin', dest: 'admin' },
    { src: 'src/teacher', dest: 'teacher' },
    { src: 'src/student', dest: 'student' },
    // ▼▼▼ [필수 추가] 학부모 앱 폴더 이동 ▼▼▼
    { src: 'src/parent', dest: 'parent' } 
  ];

  for (const move of moves) {
    const srcPath = path.join(distDir, move.src);
    const destPath = path.join(distDir, move.dest);

    // 소스 폴더가 존재하면 이동
    if (await fs.pathExists(srcPath)) {
      await fs.move(srcPath, destPath, { overwrite: true });
      console.log(`✅ Moved ${move.src} to /${move.dest}`);
    } else {
      console.log(`ℹ️  ${move.src} 폴더가 없어서 건너뜁니다.`);
    }
  }

  // 빈 src 폴더 삭제 (이제 안전하게 삭제 가능)
  const srcDir = path.join(distDir, 'src');
  if (await fs.pathExists(srcDir)) {
    await fs.remove(srcDir);
    console.log('🗑️  불필요한 /dist/src 폴더 삭제 완료');
  }

  console.log('✨ 빌드 폴더 정리가 완료되었습니다!');
}

reorganizeDist().catch(err => {
  console.error('❌ 정리 중 오류 발생:', err);
  process.exit(1);
});