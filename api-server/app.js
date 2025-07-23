const express = require('express');
const app = express();
const PORT = 3000;

// 간단한 헬스체크 엔드포인트
app.get('/', (req, res) => {
  res.send('Vive API Server is running!');
});

// 예시: 관심 주식 외국인 매매량 조회 (더미 데이터)
app.get('/stock/:symbol/foreign', (req, res) => {
  const { symbol } = req.params;
  // 실제 크롤링/DB 연동 대신 더미 데이터 반환
  res.json({
    symbol,
    foreignBuy: 12345,
    foreignSell: 6789,
    date: new Date().toISOString().slice(0, 10)
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});