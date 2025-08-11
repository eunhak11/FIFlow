// api-server/app.js
const express = require('express');
const serverlessHttp = require('serverless-http');
const https = require('https');
const jwt = require('jsonwebtoken');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda'); // 추가
const cheerio = require('cheerio');
const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'ap-northeast-2' }));
const {
  createUser,
  createStock,
  createMarketData,
  createIndexData,
  getUserWithStocks,
  getMarketData,
  getIndexData,
  getUserByKakaoId,
} = require('./dynamo/db');

const app = express();

// JSON 본문 파싱
app.use(express.json({ strict: true, limit: '50kb' }));

// 디버깅 미들웨어 (헤더만 로깅)
app.use((req, res, next) => {
  console.log('Received request:', req.method, req.path, req.headers);
  console.log('Request method and path:', req.method, req.path);
  console.log('Parsed req.body:', req.body);
  next();
});

// 환경 변수
const JWT_SECRET = process.env.JWT_SECRET;
const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID;
const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET;
const KAKAO_REDIRECT_URI = process.env.KAKAO_REDIRECT_URI;
const CORS_ORIGIN = process.env.CORS_ORIGIN;
const DYNAMODB_TABLE = process.env.DYNAMODB_TABLE || 'fiflow-users';

// 환경 변수 로깅
console.log('Environment variables:', {
  JWT_SECRET: !!JWT_SECRET,
  KAKAO_CLIENT_ID: !!KAKAO_CLIENT_ID,
  KAKAO_CLIENT_SECRET: !!KAKAO_CLIENT_SECRET,
  KAKAO_REDIRECT_URI: KAKAO_REDIRECT_URI,
  CORS_ORIGIN: CORS_ORIGIN,
  DYNAMODB_TABLE: DYNAMODB_TABLE,
});

// CORS 설정
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', CORS_ORIGIN || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// JWT 인증 미들웨어
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    console.log('No token provided in request');
    return res.status(401).json({ message: '액세스 토큰이 필요합니다.' });
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('Invalid token:', err.message);
      return res.status(403).json({ message: '유효하지 않은 토큰입니다.', error: err.message });
    }
    req.user = user;
    next();
  });
};

// 시장 시간 체크 (평일 09:00~16:00 KST)
const isMarketOpen = () => {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const day = now.getDay();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentTime = hour * 100 + minute;
  if (day === 0 || day === 6) {
    console.log('주말입니다. 크롤러 실행 불가.');
    return false;
  }
  if (currentTime < 900 || currentTime > 1600) {
    console.log('시장 시간 외입니다 (09:00~16:00 KST). 크롤러 실행 불가.');
    return false;
  }
  return true;
};

// 헬스체크
app.get('/dev/', (req, res) => {
  console.log('Health check requested');
  res.send('Vive API Server is running!');
});

// 사용자별 주식 조회
app.get('/dev/stocks', authenticateToken, async (req, res) => {
  try {
    console.log('사용자별 주식 조회:', req.user.kakaoId);
    const items = await getUserWithStocks(req.user.kakaoId).catch((err) => {
      console.error('getUserWithStocks error:', err.message, err.stack);
      throw new Error('DynamoDB 조회 실패');
    });
    console.log('DynamoDB getUserWithStocks result:', items);
    const stocks = items.filter((item) => item.SK.startsWith('STOCK#')).map((item) => ({
      symbol: item.symbol,
      name: item.name,
      userId: item.userId,
    }));
    console.log('Filtered stocks:', stocks);
    console.log('Response to client:', JSON.stringify(stocks));
    res.status(200).json(stocks);
  } catch (error) {
    console.error('Error fetching stocks:', error.message, error.stack);
    res.status(500).json({ message: '주식 정보를 가져오는 데 실패했습니다.', error: error.message });
  }
});

// 네이버 금융 데이터 가져오기 함수
const fetchNaverFinance = (symbol) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'finance.naver.com',
      path: `/item/main.naver?code=${symbol}`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    };

    https.get(options, (resp) => {
      let data = '';
      resp.on('data', (chunk) => {
        data += chunk;
      });
      resp.on('end', () => {
        console.log('Naver Finance response status:', resp.statusCode);
        resolve(data);
      });
    }).on('error', (err) => {
      console.error('HTTPS get error:', err.message, err.stack);
      reject(new Error('네이버 금융 데이터 조회 실패'));
    });
  });
};

// 종목 추가
app.post('/dev/stock/add', authenticateToken, async (req, res) => {
  const { symbol } = req.body || {};
  console.log('Add stock request:', { symbol, user: req.user.kakaoId });
  if (!symbol) {
    console.log('Missing symbol in request body');
    return res.status(400).json({ message: '종목 코드를 입력해주세요.' });
  }

  try {
    const html = await fetchNaverFinance(symbol);
    const $ = cheerio.load(html);
    const stockNameElement = $('#middle > div.h_company > div.wrap_company > h2 > a');
    if (!stockNameElement.length) {
      console.log('Stock name element not found for symbol:', symbol);
      return res.status(400).json({ message: '종목명을 찾을 수 없습니다.' });
    }
    const stockName = stockNameElement.text().trim();
    console.log('Fetched stock name from Naver:', stockName);

    const existingStock = await getUserWithStocks(req.user.kakaoId).catch((err) => {
      console.error('getUserWithStocks error:', err.message, err.stack);
      throw new Error('DynamoDB 조회 실패');
    });
    if (existingStock.some((item) => item.SK === `STOCK#${symbol}`)) {
      console.log('Stock already exists:', symbol);
      return res.status(200).json({ message: '이미 존재하는 종목입니다.', stockName, symbol });
    }

    const stockResult = await createStock(req.user.kakaoId, symbol, stockName).catch((err) => {
      console.error('createStock error:', err.message, err.stack);
      throw new Error('DynamoDB 저장 실패');
    });
    console.log('Stock created:', stockResult);

    const lambda = new LambdaClient({
      region: 'ap-northeast-2',
      httpOptions: {
        agent: new https.Agent({ keepAlive: true }),
      },
    });
    await lambda.send(
      new InvokeCommand({
        FunctionName: 'stock-crawler-dev-mainCrawler',
        InvocationType: 'Event',
        Payload: JSON.stringify({ symbols: [symbol] }),
      })
    ).catch((err) => {
      console.error('Lambda invoke error:', err.message, err.stack);
      throw new Error('크롤러 트리거 실패');
    });

    res.status(201).json({
      message: '주식 정보가 성공적으로 추가되었습니다.',
      stockName,
      symbol,
    });
  } catch (error) {
    console.error('주식 추가 오류:', error.message, error.stack);
    res.status(500).json({ message: '주식을 등록하는데 실패했습니다.', error: error.message });
  }
});

// 외국인 매매량 조회
app.get('/dev/stock/:symbol/foreign', async (req, res) => {
  const { symbol } = req.params;
  console.log('Fetching foreign data for symbol:', symbol);
  try {
    const marketData = await getMarketData(symbol, new Date().toISOString().split('T')[0]).catch((err) => {
      console.error('getMarketData error:', err.message, err.stack);
      throw new Error('DynamoDB 조회 실패');
    });
    console.log('Market data result:', marketData);
    if (marketData[0]) {
      res.json({
        symbol: marketData[0].symbol,
        date: marketData[0].date,
        price: parseInt(marketData[0].price),
        change: parseInt(marketData[0].change),
        changeRate: parseFloat(marketData[0].changeRate),
        stockName: marketData[0].stockName,
        foreignerNetBuy: marketData[0].foreignerNetBuy.map((netBuy, i) => ({
          date: marketData[0].foreignerNetBuyDate[i],
          net_buy: parseInt(netBuy),
        })).filter((item) => item.date),
      });
    } else {
      res.status(404).json({ message: 'Market data not found for this symbol.' });
    }
  } catch (error) {
    console.error('Error fetching market data:', error.message, error.stack);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// 주식 삭제
app.delete('/dev/stock/:symbol', authenticateToken, async (req, res) => {
  const { symbol } = req.params;
  console.log('Delete stock request:', { symbol, user: req.user.kakaoId });
  try {
    const deleteStockParams = {
      TableName: DYNAMODB_TABLE,
      Key: {
        PK: `USER#${req.user.kakaoId}`,
        SK: `STOCK#${symbol}`,
      },
    };
    await dynamoDb.send(new DeleteCommand(deleteStockParams)).catch((err) => {
      console.error('deleteStock error:', err.message, err.stack);
      throw new Error('DynamoDB 삭제 실패');
    });
    console.log('Stock deleted from DynamoDB');

    const marketDataParams = {
      TableName: DYNAMODB_TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `STOCK#${symbol}`,
      },
    };
    const marketData = await dynamoDb.send(new QueryCommand(marketDataParams)).catch((err) => {
      console.error('query marketData error:', err.message, err.stack);
      throw new Error('DynamoDB 조회 실패');
    });
    console.log('Market data query result:', marketData);
    for (const item of marketData.Items) {
      await dynamoDb.send(
        new DeleteCommand({
          TableName: DYNAMODB_TABLE,
          Key: {
            PK: item.PK,
            SK: item.SK,
          },
        })
      ).catch((err) => {
        console.error('delete marketData error:', err.message, err.stack);
        throw new Error('DynamoDB 삭제 실패');
      });
    }

    console.log('주식 및 관련 데이터 삭제 성공:', symbol);
    res.status(200).json({
      message: '주식과 관련된 모든 데이터가 성공적으로 삭제되었습니다.',
      symbol,
    });
  } catch (error) {
    console.error('주식 삭제 오류:', error.message, error.stack);
    res.status(500).json({ message: '주식 삭제 중 오류가 발생했습니다.', error: error.message });
  }
});

// 지수 데이터 조회
app.get('/dev/indices', async (req, res) => {
  try {
    console.log('지수 데이터 요청 시작');
    const today = new Date().toISOString().split('T')[0];
    const indices = await getIndexData('KOSPI', today).catch((err) => {
      console.error('getIndexData error:', err.message, err.stack);
      throw new Error('DynamoDB 조회 실패');
    });
    console.log('DynamoDB getIndexData result:', indices);
    const result = indices.map((index) => ({
      name: index.name,
      value: parseFloat(index.value).toFixed(2),
      change: parseFloat(index.change).toFixed(2),
      changeRate: parseFloat(index.changeRate).toFixed(2),
      isUp: parseFloat(index.change) > 0,
    }));
    console.log('지수 데이터 조회 성공:', result.length, '개 지수');
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching indices:', error.message, error.stack);
    res.status(500).json({ message: '지수 데이터를 가져오는 데 실패했습니다.', error: error.message });
  }
});

// 카카오 로그인 콜백 (웹)
app.get('/dev/auth/kakao/callback', async (req, res) => {
  try {
    console.log('Received request to /auth/kakao/callback (GET)', req.query);
    const { code } = req.query;
    if (!code) {
      console.log('No code provided in query');
      return res.status(400).json({ message: '인증 코드가 필요합니다.', error: 'code is missing' });
    }
    const tokenResponse = await new Promise((resolve, reject) => {
      const data = `grant_type=authorization_code&client_id=${KAKAO_CLIENT_ID}&client_secret=${KAKAO_CLIENT_SECRET}&code=${code}&redirect_uri=${KAKAO_REDIRECT_URI}`;
      const options = {
        hostname: 'kauth.kakao.com',
        path: '/oauth/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(data),
        },
      };
      const req = https.request(options, (resp) => {
        let body = '';
        resp.on('data', (chunk) => (body += chunk));
        resp.on('end', () => resolve(JSON.parse(body)));
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    }).catch((err) => {
      console.error('Kakao OAuth token error:', err.message, err.stack);
      throw new Error('카카오 토큰 요청 실패');
    });
    const { access_token } = tokenResponse;
    console.log('Kakao OAuth token received');

    const userResponse = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'kapi.kakao.com',
        path: '/v2/user/me',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      };
      https.get(options, (resp) => {
        let body = '';
        resp.on('data', (chunk) => (body += chunk));
        resp.on('end', () => resolve(JSON.parse(body)));
      }).on('error', reject);
    }).catch((err) => {
      console.error('Kakao user info error:', err.message, err.stack);
      throw new Error('카카오 사용자 정보 조회 실패');
    });
    const kakaoUser = userResponse;
    console.log('카카오 사용자 정보:', kakaoUser);

    let user = await getUserByKakaoId(kakaoUser.id.toString()).catch((err) => {
      console.error('getUserByKakaoId error:', err.message, err.stack);
      throw new Error('DynamoDB 조회 실패');
    });
    console.log('DynamoDB getUserWithStocks result:', user);
    let created = false;
    if (user.length > 0) {
      user = user[0];
      console.log('Updating existing user:', user);
      const updateParams = {
        TableName: DYNAMODB_TABLE,
        Key: { PK: `USER#${kakaoUser.id}`, SK: 'PROFILE' },
        UpdateExpression: 'SET nickname = :nickname, email = :email, lastLoginAt = :lastLoginAt, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':nickname': kakaoUser.properties?.nickname || user.nickname || '사용자',
          ':email': kakaoUser.kakao_account?.email || user.email || null,
          ':lastLoginAt': new Date().toISOString(),
          ':updatedAt': new Date().toISOString(),
        },
      };
      await dynamoDb.send(new UpdateCommand(updateParams)).catch((err) => {
        console.error('update user error:', err.message, err.stack);
        throw new Error('DynamoDB 업데이트 실패');
      });
      console.log('User updated');
    } else {
      console.log('Creating new user');
      user = await createUser({
        kakaoId: kakaoUser.id.toString(),
        nickname: kakaoUser.properties?.nickname || '사용자',
        email: kakaoUser.kakao_account?.email || null,
        loginType: 'kakao',
        isActive: true,
        lastLoginAt: new Date().toISOString(),
      }).catch((err) => {
        console.error('createUser error:', err.message, err.stack);
        throw new Error('DynamoDB 사용자 생성 실패');
      });
      console.log('User created:', user);
      created = true;
    }

    const token = jwt.sign(
      { userId: kakaoUser.id, kakaoId: kakaoUser.id.toString(), nickname: user.nickname },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log('JWT 토큰 생성 완료:', token.substring(0, 20) + '...');
    res.json({ token, user: { kakaoId: user.kakaoId, nickname: user.nickname, email: user.email } });
  } catch (error) {
    console.error('카카오 로그인 처리 오류:', error.message, error.stack);
    res.status(500).json({ message: '카카오 로그인 처리 중 오류가 발생했습니다.', error: error.message });
  }
});

// 카카오 로그인 콜백 (Flutter)
app.post('/dev/auth/kakao/callback', async (req, res) => {
  console.log('Received request to /auth/kakao/callback (POST)');
  try {
    const { kakaoId, nickname, email } = req.body || {};
    console.log('Parsed request body:', { kakaoId, nickname, email });
    if (!kakaoId) {
      console.log('Missing kakaoId in request body');
      return res.status(400).json({ message: '카카오 ID가 필요합니다.', error: 'kakaoId is undefined or null' });
    }
    console.log('Flutter에서 받은 카카오 사용자 정보:', { kakaoId, nickname, email });

    // kakaoId를 문자열로 보장
    const kakaoIdStr = kakaoId.toString();
    let user = await getUserByKakaoId(kakaoIdStr).catch((err) => {
      console.error('getUserByKakaoId error:', err.message, err.stack);
      throw new Error(`DynamoDB 조회 실패: ${err.message}`);
    });
    console.log('DynamoDB getUserByKakaoId result:', JSON.stringify(user, null, 2));

    let created = false;
    if (user.length > 0) {
      user = user[0];
      console.log('Updating existing user:', user);
      const updateParams = {
        TableName: DYNAMODB_TABLE,
        Key: { PK: `USER#${kakaoIdStr}`, SK: 'PROFILE' },
        UpdateExpression: 'SET nickname = :nickname, email = :email, lastLoginAt = :lastLoginAt, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':nickname': nickname || user.nickname || '사용자',
          ':email': email || user.email || null,
          ':lastLoginAt': new Date().toISOString(),
          ':updatedAt': new Date().toISOString(),
        },
      };
      await dynamoDb.send(new UpdateCommand(updateParams)).catch((err) => {
        console.error('update user error:', err.message, err.stack);
        throw new Error(`DynamoDB 업데이트 실패: ${err.message}`);
      });
      console.log('User updated');
    } else {
      console.log('Creating new user');
      user = await createUser({
        kakaoId: kakaoIdStr,
        nickname: nickname || '사용자',
        email: email || null,
        loginType: 'kakao',
        isActive: true,
        lastLoginAt: new Date().toISOString(),
      }).catch((err) => {
        console.error('createUser error:', err.message, err.stack);
        throw new Error(`DynamoDB 사용자 생성 실패: ${err.message}`);
      });
      console.log('User created:', user);
      created = true;
    }

    const token = jwt.sign(
      { userId: kakaoIdStr, kakaoId: kakaoIdStr, nickname: user.nickname },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log('JWT 토큰 생성 완료:', token.substring(0, 20) + '...');
    res.json({ token, user: { kakaoId: user.kakaoId, nickname: user.nickname, email: user.email } });
  } catch (error) {
    console.error('카카오 로그인 처리 오류:', error.message, error.stack);
    res.status(500).json({ message: '카카오 로그인 처리 중 오류가 발생했습니다.', error: error.message });
  }
});

// 인증된 사용자 정보 조회
app.get('/dev/auth/me', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching user info for:', req.user.kakaoId);
    const user = await getUserByKakaoId(req.user.kakaoId).catch((err) => {
      console.error('getUserByKakaoId error:', err.message, err.stack);
      throw new Error('DynamoDB 조회 실패');
    });
    console.log('DynamoDB getUserByKakaoId result:', user);
    if (!user[0]) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    res.json({ user: { kakaoId: user[0].kakaoId, nickname: user[0].nickname, email: user[0].email } });
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error.message, error.stack);
    res.status(500).json({ message: '사용자 정보 조회 중 오류가 발생했습니다.', error: error.message });
  }
});

// 크롤러 트리거
app.post('/dev/crawler/trigger', authenticateToken, async (req, res) => {
  try {
    console.log('Crawler trigger requested:', req.body);
    if (!isMarketOpen()) {
      return res.status(400).json({ message: '주식 시장 시간(평일 09:00~16:00 KST) 외에는 크롤러를 실행할 수 없습니다.' });
    }
    const lambda = new LambdaClient({
      region: 'ap-northeast-2',
      httpOptions: {
        agent: new https.Agent({ keepAlive: true }),
      },
    });
    await lambda.send(
      new InvokeCommand({
        FunctionName: 'stock-crawler-dev-mainCrawler',
        InvocationType: 'Event',
        Payload: JSON.stringify(req.body.symbols ? { symbols: req.body.symbols } : {}),
      })
    ).catch((err) => {
      console.error('Lambda invoke error:', err.message, err.stack);
      throw new Error('크롤러 트리거 실패');
    });
    console.log('크롤러 트리거 성공');
    res.status(200).json({ message: '크롤러 실행 요청됨' });
  } catch (error) {
    console.error('크롤러 트리거 오류:', error.message, error.stack);
    res.status(500).json({ message: '크롤러 실행 실패', error: error.message });
  }
});

// 지수 크롤러 트리거
app.post('/dev/trigger-index-crawler', authenticateToken, async (req, res) => {
  try {
    console.log('Index Crawler trigger requested');
    console.log('CRAWLER_API_BASE_URL:', process.env.CRAWLER_API_BASE_URL);
    const url = new URL(`${process.env.CRAWLER_API_BASE_URL}/trigger-index-crawl`);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers['authorization'] // 인증 헤더 전달
      }
    };

    const triggerResponse = await new Promise((resolve, reject) => {
      const req = https.request(options, (resp) => {
        let data = '';
        resp.on('data', (chunk) => data += chunk);
        resp.on('end', () => resolve({ statusCode: resp.statusCode, body: data }));
      });
      req.on('error', (err) => reject(err));
      req.end();
    });

    if (triggerResponse.statusCode === 200) {
      console.log('지수 크롤러 트리거 성공');
      res.status(200).json({ message: '지수 크롤러 실행 요청됨' });
    } else {
      console.error('지수 크롤러 트리거 실패: ', triggerResponse.statusCode, triggerResponse.body);
      res.status(triggerResponse.statusCode).json({ message: '지수 크롤러 실행 실패', error: triggerResponse.body });
    }
  } catch (error) {
    console.error('지수 크롤러 트리거 오류:', error.message, error.stack);
    res.status(500).json({ message: '지수 크롤러 실행 실패', error: error.message });
  }
});

// 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
  console.error('Server error:', err.message, err.stack);
  res.status(500).json({ message: '서버 오류가 발생했습니다.', error: err.message });
});

// Lambda 핸들러
module.exports.handler = serverlessHttp(app);