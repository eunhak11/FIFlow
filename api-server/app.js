// 환경변수 로드
require('dotenv').config();

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const db = require('./models'); // models/index.js를 로드
const { spawn } = require('child_process'); // Python 스크립트 실행을 위한 모듈
const axios = require('axios');
const jwt = require('jsonwebtoken');

// 환경변수에서 민감한 정보 로드
const JWT_SECRET = process.env.JWT_SECRET;
const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID;
const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET;
const KAKAO_REDIRECT_URI = process.env.KAKAO_REDIRECT_URI;
const KAKAO_ANDROID_REDIRECT_URI = process.env.KAKAO_ANDROID_REDIRECT_URI;

// 주식 크롤러 실행 함수
function runCrawler() {
  console.log('=== 주식 크롤러 실행 시작 ===');
  isStockCrawlerRunning = true;
  
  // Docker 컨테이너 내에서 가상환경의 Python으로 main.py 실행
  const crawlerProcess = spawn('/opt/venv/bin/python', ['crawler/main.py'], {
    cwd: __dirname,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let output = '';
  let errorOutput = '';

  crawlerProcess.stdout.on('data', (data) => {
    const message = data.toString();
    output += message;
    console.log('크롤러 출력:', message.trim());
  });

  crawlerProcess.stderr.on('data', (data) => {
    const error = data.toString();
    errorOutput += error;
    console.error('크롤러 오류:', error.trim());
  });

  crawlerProcess.on('close', (code) => {
    isStockCrawlerRunning = false;
    if (code === 0) {
      console.log('=== 주식 크롤러 실행 완료 ===');
      console.log('크롤링 결과:', output);
    } else {
      console.error('=== 주식 크롤러 실행 실패 ===');
      console.error('종료 코드:', code);
      console.error('오류 출력:', errorOutput);
    }
  });

  crawlerProcess.on('error', (error) => {
    isStockCrawlerRunning = false;
    console.error('크롤러 실행 오류:', error);
  });
}

// 지수 크롤러 실행 함수
function runIndexCrawler() {
  console.log('=== 지수 크롤러 실행 시작 ===');
  isIndexCrawlerRunning = true;
  
  // Docker 컨테이너 내에서 가상환경의 Python으로 index_crawler.py 실행
  const crawlerProcess = spawn('/opt/venv/bin/python', ['crawler/index_crawler.py'], {
    cwd: __dirname,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let output = '';
  let errorOutput = '';

  crawlerProcess.stdout.on('data', (data) => {
    const message = data.toString();
    output += message;
    console.log('지수 크롤러 출력:', message.trim());
  });

  crawlerProcess.stderr.on('data', (data) => {
    const error = data.toString();
    errorOutput += error;
    console.error('지수 크롤러 오류:', error.trim());
  });

  crawlerProcess.on('close', (code) => {
    isIndexCrawlerRunning = false;
    if (code === 0) {
      console.log('=== 지수 크롤러 실행 완료 ===');
      console.log('지수 크롤링 결과:', output);
    } else {
      console.error('=== 지수 크롤러 실행 실패 ===');
      console.error('종료 코드:', code);
      console.error('오류 출력:', errorOutput);
    }
  });

  crawlerProcess.on('error', (error) => {
    isIndexCrawlerRunning = false;
    console.error('지수 크롤러 실행 오류:', error);
  });
}

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
app.get('/stocks', authenticateToken, async (req, res) => {
  try {
    console.log('사용자별 주식 조회:', req.user.userId);
    const stocks = await db.stock.findAll({
      where: { userId: req.user.userId }
    });
    res.status(200).json(stocks);
  } catch (error) {
    console.error('Error fetching stocks:', error);
    res.status(500).json({ message: '주식 정보를 가져오는 데 실패했습니다.' });
  }
});

// Stocks와 MarketData를 조인해서 가져오는 API 엔드포인트
app.get('/stocks/marketdata', authenticateToken, async (req, res) => {
  try {
    console.log('=== 사용자별 Stocks MarketData 요청 시작 ===');
    console.log('사용자 ID:', req.user.userId);
    
    const stocksWithMarketData = await db.stock.findAll({
      where: { userId: req.user.userId },
      include: [{
        model: db.MarketData,
        as: 'marketData',
        required: false, // LEFT JOIN
        order: [['date', 'DESC']], // 최신 데이터부터
        limit: 1 // 각 주식당 최신 데이터 1개만
      }]
    });

    // 결과 데이터 가공
    const result = stocksWithMarketData.map(stock => {
      const marketData = stock.marketData && stock.marketData.length > 0 
        ? stock.marketData[0] 
        : null;

      return {
        id: stock.id,
        symbol: stock.symbol,
        name: stock.name,
        userId: stock.userId,
        marketData: marketData ? {
          price: marketData.price,
          change: marketData.change,
          changeRate: marketData.changeRate,
          date: marketData.date,
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
        } : null
      };
    });

    console.log('Stocks MarketData 조회 성공:', result.length, '개 주식');
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching stocks market data:', error);
    res.status(500).json({ message: '주식 시장 데이터를 가져오는 데 실패했습니다.' });
  }
});

// 종목 추가 API 엔드포인트
app.post('/stock/add', authenticateToken, async (req, res) => {
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
                // userId는 요청에서 받은 사용자 ID 사용
                userId: req.user ? req.user.userId : 1 
              }
            });

            if (created) {
              // 주식 추가 성공 후 자동으로 크롤러 실행
              console.log(`새 주식 추가됨: ${symbol} (${fetchedStockName}). 크롤러를 실행합니다...`);
              
              // 비동기로 크롤러 실행 (API 응답 지연 방지)
              setTimeout(() => {
                runCrawler();
              }, 1000); // 1초 후 실행
              
              res.status(200).json({ 
                message: '주식 정보가 성공적으로 추가되었습니다. 크롤러가 실행되어 시장 데이터를 수집합니다.', 
                stockName: stock.name, 
                symbol: stock.symbol 
              });
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
    // 트랜잭션 시작
    const transaction = await db.sequelize.transaction();

    try {
      // 1. 먼저 관련된 MarketData 삭제
      const deletedMarketDataCount = await db.MarketData.destroy({
        where: { symbol: symbol },
        transaction: transaction
      });
      console.log(`관련 MarketData 삭제: ${deletedMarketDataCount}개 레코드`);

      // 2. 그 다음 Stocks 삭제
      const deletedStockCount = await db.stock.destroy({
        where: { symbol: symbol },
        transaction: transaction
      });

      if (deletedStockCount > 0) {
        // 트랜잭션 커밋
        await transaction.commit();
        
        console.log('주식 및 관련 데이터 삭제 성공:', symbol);
        res.status(200).json({ 
          message: '주식과 관련된 모든 데이터가 성공적으로 삭제되었습니다.',
          symbol: symbol,
          deletedStockCount: deletedStockCount,
          deletedMarketDataCount: deletedMarketDataCount
        });
      } else {
        // 트랜잭션 롤백
        await transaction.rollback();
        
        console.log('삭제할 주식을 찾을 수 없음:', symbol);
        res.status(404).json({ 
          message: '삭제할 주식을 찾을 수 없습니다.',
          symbol: symbol 
        });
      }
    } catch (error) {
      // 트랜잭션 롤백
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('주식 삭제 오류:', error);
    res.status(500).json({ 
      message: '주식 삭제 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

// 지수 데이터 가져오기 API 엔드포인트
app.get('/indices', async (req, res) => {
  try {
    console.log('=== 지수 데이터 요청 시작 ===');
    
    // 최신 지수 데이터를 가져옴 (오늘 날짜 기준)
    const today = new Date().toISOString().split('T')[0];
    const indices = await db.IndexData.findAll({
      where: { date: today },
      order: [['name', 'ASC']]
    });

    // 결과 데이터 가공
    const result = indices.map(index => ({
      name: index.name,
      value: parseFloat(index.value).toFixed(2),
      change: parseFloat(index.change).toFixed(2),
      changeRate: parseFloat(index.changeRate).toFixed(2),
      isUp: parseFloat(index.change) > 0
    }));

    console.log('지수 데이터 조회 성공:', result.length, '개 지수');
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching indices:', error);
    res.status(500).json({ message: '지수 데이터를 가져오는 데 실패했습니다.' });
  }
});

// 크롤러 상태 변수
let isStockCrawlerRunning = false;
let isIndexCrawlerRunning = false;

// 크롤러 상태 확인 API 엔드포인트
app.get('/crawler/status', (req, res) => {
  res.status(200).json({
    stockCrawler: isStockCrawlerRunning,
    indexCrawler: isIndexCrawlerRunning
  });
});

// 카카오 로그인 콜백 처리 (웹용)
app.get('/auth/kakao/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ message: '인증 코드가 필요합니다.' });
    }

    // 카카오 액세스 토큰 요청
    const tokenResponse = await axios.post('https://kauth.kakao.com/oauth/token', {
      grant_type: 'authorization_code',
      client_id: KAKAO_CLIENT_ID,
      client_secret: KAKAO_CLIENT_SECRET,
      code: code,
      redirect_uri: KAKAO_REDIRECT_URI
    }, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const { access_token } = tokenResponse.data;

    // 카카오 사용자 정보 요청
    const userResponse = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });

    const kakaoUser = userResponse.data;
    console.log('카카오 사용자 정보:', kakaoUser);

    // 사용자 정보 저장/업데이트
    let user;
    let created = false;
    try {
      user = await db.user.findOne({ where: { kakaoId: kakaoUser.id.toString() } });
      if (user) {
        await user.update({
          nickname: kakaoUser.properties?.nickname || user.nickname,
          email: kakaoUser.kakao_account?.email || user.email,
          lastLoginAt: new Date()
        });
      } else {
        user = await db.user.create({
          kakaoId: kakaoUser.id.toString(),
          nickname: kakaoUser.properties?.nickname || '사용자',
          email: kakaoUser.kakao_account?.email || null,
          loginType: 'kakao',
          isActive: true,
          lastLoginAt: new Date()
        });
        created = true;
      }
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError' && error.fields && error.fields.email) {
        user = await db.user.create({
          kakaoId: kakaoUser.id.toString(),
          nickname: kakaoUser.properties?.nickname || '사용자',
          email: null,
          loginType: 'kakao',
          isActive: true,
          lastLoginAt: new Date()
        });
        created = true;
      } else {
        throw error;
      }
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      { userId: user.id, kakaoId: user.kakaoId, nickname: user.nickname },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('JWT 토큰 생성 완료');
    res.json({ token: token, user: { id: user.id, kakaoId: user.kakaoId, nickname: user.nickname, email: user.email } });
  } catch (error) {
    console.error('카카오 로그인 처리 오류:', error);
    res.status(500).json({ message: '카카오 로그인 처리 중 오류가 발생했습니다.' });
  }
});

// Flutter 앱에서 카카오 로그인 후 사용자 정보를 받아 JWT 토큰 생성
app.post('/auth/kakao/callback', async (req, res) => {
  try {
    const { kakaoId, nickname, email } = req.body;
    if (!kakaoId) {
      return res.status(400).json({ message: '카카오 ID가 필요합니다.' });
    }
    console.log('Flutter에서 받은 카카오 사용자 정보:', { kakaoId, nickname, email });

    let user;
    let created = false;
    try {
      user = await db.user.findOne({ where: { kakaoId: kakaoId.toString() } });
      if (user) {
        await user.update({
          nickname: nickname || user.nickname,
          email: email || user.email,
          lastLoginAt: new Date()
        });
      } else {
        user = await db.user.create({
          kakaoId: kakaoId.toString(),
          nickname: nickname || '사용자',
          email: email || null,
          loginType: 'kakao',
          isActive: true,
          lastLoginAt: new Date()
        });
        created = true;
      }
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError' && error.fields && error.fields.email) {
        user = await db.user.create({
          kakaoId: kakaoId.toString(),
          nickname: nickname || '사용자',
          email: null,
          loginType: 'kakao',
          isActive: true,
          lastLoginAt: new Date()
        });
        created = true;
      } else {
        throw error;
      }
    }

    const token = jwt.sign(
      { userId: user.id, kakaoId: user.kakaoId, nickname: user.nickname },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log('JWT 토큰 생성 완료');
    res.json({ token: token, user: { id: user.id, kakaoId: user.kakaoId, nickname: user.nickname, email: user.email } });
  } catch (error) {
    console.error('카카오 로그인 처리 오류:', error);
    res.status(500).json({ message: '카카오 로그인 처리 중 오류가 발생했습니다.' });
  }
});

// JWT 토큰 검증 미들웨어
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: '액세스 토큰이 필요합니다.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: '유효하지 않은 토큰입니다.' });
    }
    req.user = user;
    next();
  });
};

// 인증된 사용자 정보 조회
app.get('/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.user.findByPk(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    res.json({ user: { id: user.id, kakaoId: user.kakaoId, nickname: user.nickname, email: user.email } });
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    res.status(500).json({ message: '사용자 정보 조회 중 오류가 발생했습니다.' });
  }
});

// 지수 크롤러 실행 API 엔드포인트
app.post('/indices/crawl', async (req, res) => {
  try {
    console.log('=== 지수 크롤러 실행 요청 ===');
    
    // 비동기로 지수 크롤러 실행 (API 응답 지연 방지)
    setTimeout(() => {
      runIndexCrawler();
    }, 100);
    
    res.status(200).json({ 
      message: '지수 크롤러가 실행되었습니다. 잠시 후 /indices API로 최신 데이터를 확인하세요.' 
    });
  } catch (error) {
    console.error('지수 크롤러 실행 오류:', error);
    res.status(500).json({ message: '지수 크롤러 실행 중 오류가 발생했습니다.' });
  }
});

// 데이터베이스 연결 테스트 및 동기화 (재시도 로직 추가)
const connectWithRetry = async () => {
  try {
    await db.sequelize.sync();
    console.log('Database connected successfully');
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
      
      // 서버 시작 후 자동으로 크롤러 실행
      console.log('=== 서버 시작: 자동 크롤러 실행 ===');
      setTimeout(() => {
        console.log('주식 크롤러 자동 실행...');
        runCrawler();
        
        setTimeout(() => {
          console.log('지수 크롤러 자동 실행...');
          runIndexCrawler();
        }, 1000); // 주식 크롤러 완료 후 1초 뒤 지수 크롤러 실행
      }, 2000); // 서버 시작 후 2초 뒤 크롤러 실행
    });
  } catch (err) {
    console.error('Unable to connect to the database:', err);
    console.log('Retrying in 5 seconds...');
    setTimeout(connectWithRetry, 5000);
  }
};

connectWithRetry();