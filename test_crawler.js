const { spawn } = require('child_process');

console.log('크롤러 테스트를 시작합니다...');

// 크롤러 실행 테스트
const pythonProcess = spawn('../crawler/venv/bin/python', ['../crawler/get_stock_info.py', '005930'], {
  cwd: __dirname
});

let output = '';
let errorOutput = '';

pythonProcess.stdout.on('data', (data) => {
  output += data.toString();
  console.log('출력:', data.toString());
});

pythonProcess.stderr.on('data', (data) => {
  errorOutput += data.toString();
  console.error('오류:', data.toString());
});

pythonProcess.on('close', (code) => {
  console.log(`프로세스 종료 코드: ${code}`);
  console.log('최종 출력:', output);
  console.log('최종 오류:', errorOutput);
  
  if (code === 0) {
    try {
      const result = JSON.parse(output);
      console.log('파싱된 결과:', result);
    } catch (e) {
      console.error('JSON 파싱 오류:', e);
    }
  }
}); 