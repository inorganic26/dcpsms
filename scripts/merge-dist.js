import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function mergeDist() {
  console.log('🧹 Cleaning dist folder...');
  await fs.remove(path.join(rootDir, 'dist'));
  await fs.ensureDir(path.join(rootDir, 'dist'));

  console.log('📦 Copying portal files...');
  // dist-portal의 모든 파일을 dist로 복사
  await fs.copy(
    path.join(rootDir, 'dist-portal'),
    path.join(rootDir, 'dist')
  );

  console.log('🔧 Reorganizing admin folder...');
  // dist/src/admin -> dist/admin으로 이동
  const adminSrcPath = path.join(rootDir, 'dist/src/admin');
  const adminDestPath = path.join(rootDir, 'dist/admin');
  
  if (await fs.pathExists(adminSrcPath)) {
    await fs.move(adminSrcPath, adminDestPath, { overwrite: true });
    console.log('✅ Admin folder moved to /admin');
  }

  // dist/src 폴더 삭제
  const srcPath = path.join(rootDir, 'dist/src');
  if (await fs.pathExists(srcPath)) {
    await fs.remove(srcPath);
    console.log('✅ Removed /dist/src folder');
  }

  console.log('👨‍🏫 Copying teacher files...');
  // dist-teacher -> dist/teacher
  await fs.copy(
    path.join(rootDir, 'dist-teacher'),
    path.join(rootDir, 'dist/teacher')
  );

  console.log('🧑‍🎓 Copying student files...');
  // dist-student -> dist/student
  await fs.copy(
    path.join(rootDir, 'dist-student'),
    path.join(rootDir, 'dist/student')
  );

  console.log('✨ Merge complete!');
  console.log('\nFinal structure:');
  console.log('  dist/');
  console.log('  ├── index.html (portal)');
  console.log('  ├── admin/index.html');
  console.log('  ├── teacher/index.html');
  console.log('  └── student/index.html');
}

mergeDist().catch(err => {
  console.error('❌ Error during merge:', err);
  process.exit(1);
});