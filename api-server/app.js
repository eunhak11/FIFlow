const express = require('express');
const app = express();
const PORT = 3000;
const db = require('./models'); // models/index.js를 로드
const { spawn } = require('child_process'); // Python 스크립트 실행을 위한 모듈

// CORS 설정 추가
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json()); // JSON 요청 본문을 파싱하기 위한 미들웨어

// 간단한 헬스체크 엔드포인트
app.get('/', (req, res) => {
  res.send('Vive API Server is running!');
});

// 모든 주식 정보 가져오기 API 엔드포인트
app.get('/stocks', async (req, res) => {
  try {
    console.log('Available models:', Object.keys(db));
    console.log('db.stock:', db.stock);
    const stocks = await db.stock.findAll();
    res.status(200).json(stocks);
  } catch (error) {
    console.error('Error fetching stocks:', error);
    res.status(500).json({ message: '주식 정보를 가져오는 데 실패했습니다.' });
  }
});

// 종목 추가 API 엔드포인트
app.post('/stock/add', async (req, res) => {
  const { symbol } = req.body;

  if (!symbol) {
    return res.status(400).json({ message: '종목 코드를 입력해주세요.' });
  }

  try {
    // Python 크롤러 실행 (Docker 컨테이너 내에서 가상환경 사용)
    const pythonProcess = spawn('/opt/venv/bin/python', ['crawler/get_stock_info.py', symbol], {
      cwd: __dirname // 현재 디렉토리를 기준으로 경로 설정
    });

    let stockName = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      stockName += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', async (code) => {
      if (code === 0) {
        try {
          const parsedData = JSON.parse(stockName);
          const fetchedStockName = parsedData.stockName;

          if (fetchedStockName) {
            // stocks 테이블에 저장
            const [stock, created] = await db.stock.findOrCreate({
              where: { symbol: symbol },
              defaults: {
                symbol: symbol,
                name: fetchedStockName,
                // userId는 현재 로그인 기능이 없으므로 임시로 1로 설정
                userId: 1 
              }
            });

            if (created) {
              res.status(200).json({ message: '주식 정보가 성공적으로 추가되었습니다.', stockName: stock.name, symbol: stock.symbol });
            } else {
              res.status(200).json({ message: '이미 존재하는 종목입니다.', stockName: stock.name, symbol: stock.symbol });
            }
          } else {
            res.status(500).json({ message: '주식명을 가져오지 못했습니다.', error: errorOutput });
          }
        } catch (parseError) {
          console.error('JSON 파싱 오류:', parseError);
          res.status(500).json({ message: '크롤러 응답 파싱 오류', error: errorOutput });
        }
      } else {
        console.error(`Python 스크립트 종료 코드: ${code}, 오류: ${errorOutput}`);
        res.status(500).json({ message: '주식 정보를 가져오는 데 실패했습니다.', error: errorOutput });
      }
    });
  } catch (error) {
    console.error('API 서버 오류:', error);
    res.status(500).json({ message: '서버 내부 오류가 발생했습니다.' });
  }
});

// 예시: 관심 주식 외국인 매매량 조회 (더미 데이터 대신 DB 연동)
app.get('/stock/:symbol/foreign', async (req, res) => {
  const { symbol } = req.params;
  try {
    const marketData = await db.MarketData.findOne({
      where: { symbol: symbol },
      order: [['date', 'DESC']] // 최신 데이터를 가져오기 위해 날짜 기준으로 정렬
    });

    if (marketData) {
      res.json({
        symbol: marketData.symbol,
        date: marketData.date,
        price: marketData.price,
        change: marketData.change,
        changeRate: marketData.changeRate,
        stockName: marketData.stockName,
        foreignerNetBuy: [
          { date: marketData.foreignerNetBuyDate1, net_buy: marketData.foreignerNetBuy1 },
          { date: marketData.foreignerNetBuyDate2, net_buy: marketData.foreignerNetBuy2 },
          { date: marketData.foreignerNetBuyDate3, net_buy: marketData.foreignerNetBuy3 },
          { date: marketData.foreignerNetBuyDate4, net_buy: marketData.foreignerNetBuy4 },
          { date: marketData.foreignerNetBuyDate5, net_buy: marketData.foreignerNetBuy5 },
          { date: marketData.foreignerNetBuyDate6, net_buy: marketData.foreignerNetBuy6 },
          { date: marketData.foreignerNetBuyDate7, net_buy: marketData.foreignerNetBuy7 },
          { date: marketData.foreignerNetBuyDate8, net_buy: marketData.foreignerNetBuy8 }
        ].filter(item => item.date) // 날짜가 있는 데이터만 필터링
      });
    } else {
      res.status(404).json({ message: 'Market data not found for this symbol.' });
    }
  } catch (error) {
    console.error('Error fetching market data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 주식 삭제 API 엔드포인트
app.delete('/stock/:symbol', async (req, res) => {
  console.log('=== 주식 삭제 요청 시작 ===');
  const { symbol } = req.params;
  console.log('삭제할 종목 코드:', symbol);

  try {
    const deletedCount = await db.stock.destroy({
      where: { symbol: symbol }
    });

    if (deletedCount > 0) {
      console.log('주식 삭제 성공:', symbol);
      res.status(200).json({ 
        message: '주식이 성공적으로 삭제되었습니다.',
        symbol: symbol 
      });
    } else {
      console.log('삭제할 주식을 찾을 수 없음:', symbol);
      res.status(404).json({ 
        message: '삭제할 주식을 찾을 수 없습니다.',
        symbol: symbol 
      });
    }
  } catch (error) {
    console.error('주식 삭제 오류:', error);
    res.status(500).json({ 
      message: '주식 삭제 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

// 데이터베이스 연결 테스트 및 동기화 (재시도 로직 추가)
const connectWithRetry = async () => {
  try {
    await db.sequelize.sync();
    console.log('Database connected successfully');
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Unable to connect to the database:', err);
    console.log('Retrying in 5 seconds...');
    setTimeout(connectWithRetry, 5000);
  }
};

connectWithRetry();