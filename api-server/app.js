// api-server/app.js
const express = require('express');
const serverlessHttp = require('serverless-http');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const { 
  createUser, 
  createStock, 
  createMarketData, 
  createIndexData, 
  getUserWithStocks, 
  getMarketData, 
  getIndexData, 
  getUserByKakaoId 
} = require('./dynamo/db');

const app = express();
app.use(express.json());

// 환경 변수
const JWT_SECRET = process.env.JWT_SECRET;
const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID;
const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET;
const KAKAO_REDIRECT_URI = process.env.KAKAO_REDIRECT_URI;
const CORS_ORIGIN = process.env.CORS_ORIGIN;

// CORS 설정
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});



// 시장 시간 체크 (평일 09:00~16:00 KST)
const isMarketOpen = () => {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const day = now.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentTime = hour * 100 + minute; // HHMM 형식
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
app.get('/', (req, res) => {
  res.send('Vive API Server is running!');
});

// 사용자별 주식 조회
app.get('/stocks', async (req, res) => {
  try {
    console.log('사용자별 주식 조회:', req.requestContext.authorizer.principalId);
    const items = await getUserWithStocks(req.requestContext.authorizer.principalId);
    const stocks = items.filter(item => item.SK.startsWith('STOCK#')).map(item => ({
      symbol: item.symbol,
      name: item.name,
      userId: item.userId
    }));
    res.status(200).json(stocks);
  } catch (error) {
    console.error('Error fetching stocks:', error);
    res.status(500).json({ message: '주식 정보를 가져오는 데 실패했습니다.' });
  }
});

// 주식 및 최신 MarketData 조회
app.get('/stocks/marketdata', async (req, res) => {
  try {
    console.log('사용자별 Stocks MarketData 요청:', req.requestContext.authorizer.principalId);
    const items = await getUserWithStocks(req.requestContext.authorizer.principalId);
    const stocks = items.filter(item => item.SK.startsWith('STOCK#'));
    const result = [];
    for (const stock of stocks) {
      const marketData = await getMarketData(stock.symbol, new Date().toISOString().split('T')[0]);
      result.push({
        symbol: stock.symbol,
        name: stock.name,
        userId: stock.userId,
        marketData: marketData[0] ? {
          price: parseInt(marketData[0].price),
          change: parseInt(marketData[0].change),
          changeRate: parseFloat(marketData[0].changeRate),
          date: marketData[0].date,
          foreignerNetBuy: marketData[0].foreignerNetBuy.map((netBuy, i) => ({
            date: marketData[0].foreignerNetBuyDate[i],
            net_buy: parseInt(netBuy)
          })).filter(item => item.date)
        } : null
      });
    }
    console.log('Stocks MarketData 조회 성공:', result.length, '개 주식');
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching stocks market data:', error);
    res.status(500).json({ message: '주식 시장 데이터를 가져오는 데 실패했습니다.' });
  }
});

// 종목 추가
app.post('/stock/add', async (req, res) => {
  const { symbol } = req.body;
  if (!symbol) {
    return res.status(400).json({ message: '종목 코드를 입력해주세요.' });
  }
  try {
    const response = await axios.get(`https://finance.naver.com/item/main.naver?code=${symbol}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124' }
    });
    const cheerio = require('cheerio');
    const $ = cheerio.load(response.data);
    const stockName = $('#middle > div.h_company > div.wrap_company > h2 > a').text().trim() || 'Unknown';

    const existingStock = await getMarketData(symbol, new Date().toISOString().split('T')[0]);
    if (existingStock.length > 0) {
      return res.status(200).json({ message: '이미 존재하는 종목입니다.', stockName, symbol });
    }
    const stockResult = await createStock(req.requestContext.authorizer.principalId, symbol, stockName);

    // 시장 시간 내에서만 크롤러 트리거
    if (isMarketOpen()) {
      const lambda = new AWS.Lambda({ region: 'ap-northeast-2' });
      await lambda.invoke({
        FunctionName: 'stock-crawler-dev-crawler',
        InvocationType: 'Event',
        Payload: JSON.stringify({ symbols: [symbol] })
      }).promise();
      console.log(`크롤러 트리거: ${symbol}`);
    } else {
      console.log('시장 시간 외, 크롤러 실행 건너뜀');
    }

    console.log(`주식 추가 성공: ${symbol} (${stockName})`);
    res.status(201).json({ 
      message: '주식 정보가 성공적으로 추가되었습니다.',
      stockName,
      symbol
    });
  } catch (error) {
    console.error('주식 추가 오류:', error);
    res.status(500).json({ message: '주식 정보를 가져오는 데 실패했습니다.' });
  }
});

// 외국인 매매량 조회
app.get('/stock/:symbol/foreign', async (req, res) => {
  const { symbol } = req.params;
  try {
    const marketData = await getMarketData(symbol, new Date().toISOString().split('T')[0]);
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
          net_buy: parseInt(netBuy)
        })).filter(item => item.date)
      });
    } else {
      res.status(404).json({ message: 'Market data not found for this symbol.' });
    }
  } catch (error) {
    console.error('Error fetching market data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 주식 삭제
app.delete('/stock/:symbol', async (req, res) => {
  const { symbol } = req.params;
  try {
    const deleteStockParams = {
      TableName: process.env.DYNAMODB_TABLE || 'fiflow-users',
      Key: {
        PK: `USER#${req.requestContext.authorizer.principalId}`,
        SK: `STOCK#${symbol}`
      }
    };
    await dynamoDb.delete(deleteStockParams).promise();

    const marketDataParams = {
      TableName: process.env.DYNAMODB_TABLE || 'fiflow-users',
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `STOCK#${symbol}`
      }
    };
    const marketData = await dynamoDb.query(marketDataParams).promise();
    for (const item of marketData.Items) {
      await dynamoDb.delete({
        TableName: process.env.DYNAMODB_TABLE || 'fiflow-users',
        Key: {
          PK: item.PK,
          SK: item.SK
        }
      }).promise();
    }

    console.log('주식 및 관련 데이터 삭제 성공:', symbol);
    res.status(200).json({ 
      message: '주식과 관련된 모든 데이터가 성공적으로 삭제되었습니다.',
      symbol
    });
  } catch (error) {
    console.error('주식 삭제 오류:', error);
    res.status(500).json({ message: '주식 삭제 중 오류가 발생했습니다.' });
  }
});

// 지수 데이터 조회
app.get('/indices', async (req, res) => {
  try {
    console.log('지수 데이터 요청 시작');
    const today = new Date().toISOString().split('T')[0];
    const indices = await getIndexData('KOSPI', today);
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

// 카카오 로그인 콜백 (웹)
app.get('/auth/kakao/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ message: '인증 코드가 필요합니다.' });
    }
    const tokenResponse = await axios.post('https://kauth.kakao.com/oauth/token', {
      grant_type: 'authorization_code',
      client_id: KAKAO_CLIENT_ID,
      client_secret: KAKAO_CLIENT_SECRET,
      code,
      redirect_uri: KAKAO_REDIRECT_URI
    }, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const { access_token } = tokenResponse.data;
    const userResponse = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    const kakaoUser = userResponse.data;
    console.log('카카오 사용자 정보:', kakaoUser);

    let user = await getUserByKakaoId(kakaoUser.id.toString());
    let created = false;
    if (user.length > 0) {
      user = user[0];
      const updateParams = {
        TableName: process.env.DYNAMODB_TABLE || 'fiflow-users',
        Key: { PK: `USER#${kakaoUser.id}`, SK: 'PROFILE' },
        UpdateExpression: 'SET nickname = :nickname, email = :email, lastLoginAt = :lastLoginAt, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':nickname': kakaoUser.properties?.nickname || user.nickname,
          ':email': kakaoUser.kakao_account?.email || user.email,
          ':lastLoginAt': new Date().toISOString(),
          ':updatedAt': new Date().toISOString()
        }
      };
      await dynamoDb.update(updateParams).promise();
    } else {
      user = await createUser({
        kakaoId: kakaoUser.id.toString(),
        nickname: kakaoUser.properties?.nickname || '사용자',
        email: kakaoUser.kakao_account?.email || null,
        loginType: 'kakao',
        isActive: true,
        lastLoginAt: new Date().toISOString()
      });
      created = true;
    }

    const token = jwt.sign(
      { userId: kakaoUser.id, kakaoId: kakaoUser.id.toString(), nickname: user.nickname || kakaoUser.properties?.nickname },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log('JWT 토큰 생성 완료');
    res.json({ token, user: { kakaoId: user.kakaoId, nickname: user.nickname, email: user.email } });
  } catch (error) {
    console.error('카카오 로그인 처리 오류:', error);
    res.status(500).json({ message: '카카오 로그인 처리 중 오류가 발생했습니다.' });
  }
});

// 카카오 로그인 콜백 (Flutter)
app.post('/auth/kakao/callback', async (req, res) => {
  try {
    const { kakaoId, nickname, email } = req.body;
    if (!kakaoId) {
      return res.status(400).json({ message: '카카오 ID가 필요합니다.' });
    }
    console.log('Flutter에서 받은 카카오 사용자 정보:', { kakaoId, nickname, email });

    let user = await getUserByKakaoId(kakaoId.toString());
    let created = false;
    if (user.length > 0) {
      user = user[0];
      const updateParams = {
        TableName: process.env.DYNAMODB_TABLE || 'fiflow-users',
        Key: { PK: `USER#${kakaoId}`, SK: 'PROFILE' },
        UpdateExpression: 'SET nickname = :nickname, email = :email, lastLoginAt = :lastLoginAt, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':nickname': nickname || user.nickname,
          ':email': email || user.email,
          ':lastLoginAt': new Date().toISOString(),
          ':updatedAt': new Date().toISOString()
        }
      };
      await dynamoDb.update(updateParams).promise();
    } else {
      user = await createUser({
        kakaoId: kakaoId.toString(),
        nickname: nickname || '사용자',
        email: email || null,
        loginType: 'kakao',
        isActive: true,
        lastLoginAt: new Date().toISOString()
      });
      created = true;
    }

    const token = jwt.sign(
      { userId: kakaoId, kakaoId: kakaoId.toString(), nickname: user.nickname },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log('JWT 토큰 생성 완료');
    res.json({ token, user: { kakaoId: user.kakaoId, nickname: user.nickname, email: user.email } });
  } catch (error) {
    console.error('카카오 로그인 처리 오류:', error);
    res.status(500).json({ message: '카카오 로그인 처리 중 오류가 발생했습니다.' });
  }
});

// 인증된 사용자 정보 조회
app.get('/auth/me', async (req, res) => {
  try {
    const user = await getUserByKakaoId(req.requestContext.authorizer.principalId);
    if (!user[0]) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    res.json({ user: { kakaoId: user[0].kakaoId, nickname: user[0].nickname, email: user[0].email } });
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    res.status(500).json({ message: '사용자 정보 조회 중 오류가 발생했습니다.' });
  }
});

// 크롤러 트리거
app.post('/crawler/trigger', async (req, res) => {
  try {
    if (!isMarketOpen()) {
      return res.status(400).json({ message: '주식 시장 시간(평일 09:00~16:00 KST) 외에는 크롤러를 실행할 수 없습니다.' });
    }
    const lambda = new AWS.Lambda({ region: 'ap-northeast-2' });
    await lambda.invoke({
      FunctionName: 'stock-crawler-dev-crawler',
      InvocationType: 'Event',
      Payload: JSON.stringify(req.body.symbols ? { symbols: req.body.symbols } : {})
    }).promise();
    console.log('크롤러 트리거 성공');
    res.status(200).json({ message: '크롤러 실행 요청됨' });
  } catch (error) {
    console.error('크롤러 트리거 오류:', error);
    res.status(500).json({ message: '크롤러 실행 실패' });
  }
});

// Lambda 핸들러
module.exports.handler = serverlessHttp(app);