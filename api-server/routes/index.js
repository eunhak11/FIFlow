// api-server/routes/index.js
const express = require('express');
const router = express.Router();
const {
  createUser,
  createStock,
  createMarketData,
  createIndexData,
  getUserWithStocks,
  getMarketData,
  getIndexData,
  getUserByEmail,
  getUserByKakaoId
} = require('../dynamo/db');
const { verifyToken } = require('../authorizer');
const { getStockInfo } = require('../crawler/get_stock_info'); // 크롤러 함수 임포트

// 사용자 생성 (POST /users)
router.post('/users', async (req, res) => {
  try {
    const { kakaoId, email, nickname, loginType, isActive, lastLoginAt } = req.body;
    const data = {
      kakaoId: kakaoId ? String(kakaoId) : null,
      email: email ? String(email) : null,
      nickname: nickname ? String(nickname) : '사용자',
      loginType: loginType ? String(loginType) : 'kakao',
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      lastLoginAt: lastLoginAt ? String(lastLoginAt) : null
    };
    console.log('User 입력 데이터:', data);
    const result = await createUser(data);
    res.status(201).json(result);
  } catch (error) {
    console.error('User 생성 오류:', error);
    res.status(500).json({ error: 'User 생성 실패' });
  }
});

// 사용자와 관련 주식 조회 (GET /users/:userId)
router.get('/users/:userId', async (req, res) => {
  try {
    const userId = String(req.params.userId);
    console.log(`User 조회 요청: ${userId}`);
    const items = await getUserWithStocks(userId);
    res.json(items);
  } catch (error) {
    console.error('User 조회 오류:', error);
    res.status(500).json({ error: 'User 조회 실패' });
  }
});

// 주식 추가 (POST /stock/add)
router.post('/stock/add', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId; // verifyToken에서 추가된 사용자 정보
    const { symbol } = req.body;

    if (!symbol) {
      return res.status(400).json({ message: '종목 코드를 입력해주세요.' });
    }

    // 크롤러를 사용하여 주식 이름 가져오기
    const stockName = await getStockInfo(symbol);
    if (!stockName) {
      return res.status(404).json({ message: '존재하지 않는 종목 코드입니다.' });
    }

    const data = {
      userId: String(userId),
      symbol: String(symbol),
      name: String(stockName)
    };
    console.log('Stock 입력 데이터:', data);
    const result = await createStock(data.userId, data.symbol, data.name);
    res.status(201).json(result);
  } catch (error) {
    console.error('Stock 생성 오류:', error);
    res.status(500).json({ error: 'Stock 생성 실패' });
  }
});

// 시장 데이터 저장 (POST /market-data)
router.post('/market-data', async (req, res) => {
  try {
    const { symbol, date, price, change, changeRate, stockName, foreignerNetBuy, foreignerNetBuyDate } = req.body;
    const data = {
      symbol: String(symbol),
      date: String(date),
      price: parseInt(price),
      change: parseInt(change),
      changeRate: parseFloat(changeRate),
      stockName: String(stockName),
      foreignerNetBuy: (foreignerNetBuy || [0, 0, 0, 0, 0, 0, 0, 0]).map(num => parseInt(num)),
      foreignerNetBuyDate: foreignerNetBuyDate || ['', '', '', '', '', '', '', '']
    };
    console.log('MarketData 입력 데이터:', data);
    const result = await createMarketData(data);
    res.status(201).json(result);
  } catch (error) {
    console.error('MarketData 저장 오류:', error);
    res.status(500).json({ error: 'MarketData 저장 실패' });
  }
});

// 시장 데이터 조회 (GET /market-data/:symbol/:date)
router.get('/market-data/:symbol/:date', async (req, res) => {
  try {
    const { symbol, date } = req.params;
    console.log(`MarketData 조회 요청: ${symbol}_${date}`);
    const items = await getMarketData(String(symbol), String(date));
    res.json(items);
  } catch (error) {
    console.error('MarketData 조회 오류:', error);
    res.status(500).json({ error: 'MarketData 조회 실패' });
  }
});

// 지수 데이터 저장 (POST /index-data)
router.post('/index-data', async (req, res) => {
  try {
    const { name, date, value, change, changeRate } = req.body;
    const data = {
      name: String(name),
      date: String(date),
      value: parseFloat(value),
      change: parseFloat(change),
      changeRate: parseFloat(changeRate)
    };
    console.log('IndexData 입력 데이터:', data);
    const result = await createIndexData(data);
    res.status(201).json(result);
  } catch (error) {
    console.error('IndexData 저장 오류:', error);
    res.status(500).json({ error: 'IndexData 저장 실패' });
  }
});

// 지수 데이터 조회 (GET /index-data/:name/:date)
router.get('/index-data/:name/:date', async (req, res) => {
  try {
    const { name, date } = req.params;
    console.log(`IndexData 조회 요청: ${name}_${date}`);
    const items = await getIndexData(String(name), String(date));
    res.json(items);
  } catch (error) {
    console.error('IndexData 조회 오류:', error);
    res.status(500).json({ error: 'IndexData 조회 실패' });
  }
});

// 사용자 조회 by email (GET /users/email/:email)
router.get('/users/email/:email', async (req, res) => {
  try {
    const email = String(req.params.email);
    console.log(`User 조회 요청 (email): ${email}`);
    const items = await getUserByEmail(email);
    res.json(items);
  } catch (error) {
    console.error('User 조회 오류 (email):', error);
    res.status(500).json({ error: 'User 조회 실패' });
  }
});

// 사용자 조회 by kakaoId (GET /users/kakao/:kakaoId)
router.get('/users/kakao/:kakaoId', async (req, res) => {
  try {
    const kakaoId = String(req.params.kakaoId);
    console.log(`User 조회 요청 (kakaoId): ${kakaoId}`);
    const items = await getUserByKakaoId(kakaoId);
    res.json(items);
  } catch (error) {
    console.error('User 조회 오류 (kakaoId):', error);
    res.status(500).json({ error: 'User 조회 실패' });
  }
});

// Lambda용 serverless-http 핸들러
module.exports.handler = require('serverless-http')(router);
