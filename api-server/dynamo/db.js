// api-server/db/db.js
const AWS = require('aws-sdk');

// DynamoDB 클라이언트 초기화 (서울 리전)
const dynamoDb = new AWS.DynamoDB.DocumentClient({ region: 'ap-northeast-2' });

async function createUser(data) {
  // User 데이터 저장: kakaoId 또는 email로 고유 PK 생성, unique 보장
  // User hasMany Stock 관계를 위해 PK 공유
  const params = {
    TableName: process.env.DYNAMODB_TABLE || 'fiflow-users', // 테이블 이름 (환경 변수로 설정 가능)
    Item: {
      PK: `USER#${data.kakaoId || data.email}`, // PK: USER#<kakaoId or email> (고유 사용자 식별자)
      SK: 'PROFILE', // SK: 사용자 프로필 데이터 구분
      kakaoId: data.kakaoId || null, // 카카오 ID (nullable)
      email: data.email || null, // 이메일 (nullable, GSI로 조회)
      nickname: data.nickname || '사용자', // 닉네임 (기본값 '사용자')
      loginType: data.loginType || 'kakao', // 로그인 타입 (kakao/email, 기본 kakao)
      isActive: data.isActive !== undefined ? data.isActive : true, // 계정 활성화 상태 (기본 true)
      lastLoginAt: data.lastLoginAt || null, // 마지막 로그인 시간 (nullable)
      createdAt: new Date().toISOString(), // 생성 시간 (ISO 포맷)
      updatedAt: new Date().toISOString() // 업데이트 시간
    },
    ConditionExpression: 'attribute_not_exists(PK)', // PK 중복 방지 (unique 제약)
  };
  try {
    await dynamoDb.put(params).promise();
    console.log(`User 저장 성공: ${data.kakaoId || data.email}`);
    return { status: 'success', kakaoId: data.kakaoId, email: data.email };
  } catch (error) {
    console.error('User 저장 오류:', error);
    throw error;
  }
}

async function createStock(userId, symbol, name) {
  // Stock 데이터 저장: User와의 1:N 관계를 PK로 연결
  const params = {
    TableName: process.env.DYNAMODB_TABLE || 'fiflow-users',
    Item: {
      PK: `USER#${userId}`, // PK: USER#<kakaoId or email> (User와 동일)
      SK: `STOCK#${symbol}`, // SK: STOCK#<symbol> (주식 고유 식별)
      symbol: symbol, // 종목 코드 (예: 005930)
      name: name, // 종목명 (예: 삼성전자)
      userId: userId, // 사용자 ID 참조 (kakaoId or email)
      createdAt: new Date().toISOString() // 생성 시간
    }
  };
  try {
    await dynamoDb.put(params).promise();
    console.log(`Stock 저장 성공: ${symbol}`);
    return { status: 'success', symbol };
  } catch (error) {
    console.error('Stock 저장 오류:', error);
    throw error;
  }
}

async function createMarketData(data) {
  // MarketData 저장: Stock과의 1:N 관계, foreignerNetBuy/Date를 List로 통합
  const params = {
    TableName: process.env.DYNAMODB_TABLE || 'fiflow-users',
    Item: {
      PK: `STOCK#${data.symbol}`, // PK: STOCK#<symbol> (Stock과의 관계)
      SK: `MARKETDATA#${data.date}`, // SK: MARKETDATA#<date> (날짜별 데이터 구분)
      symbol_date: `${data.symbol}_${data.date}`, // GSI용: symbol_date (예: 005930_2025-08-05)
      symbol: data.symbol, // 종목 코드
      date: data.date, // 데이터 날짜 (예: 2025-08-05)
      price: data.price, // 종가 (integer)
      change: data.change, // 전일 대비 변화량 (integer)
      changeRate: data.changeRate, // 등락률 (float, 문자열로 저장)
      stockName: data.stockName, // 종목명
      foreignerNetBuy: data.foreignerNetBuy || [0, 0, 0, 0, 0, 0, 0, 0], // List: 8일치 외국인 순매매량 (기본 0)
      foreignerNetBuyDate: data.foreignerNetBuyDate || ['', '', '', '', '', '', '', ''], // List: 8일치 날짜 (기본 빈 문자열)
      createdAt: new Date().toISOString(), // 생성 시간
      updatedAt: new Date().toISOString() // 업데이트 시간
    }
  };
  try {
    await dynamoDb.put(params).promise();
    console.log(`MarketData 저장 성공: ${data.symbol}_${data.date}`);
    return { status: 'success', symbol: data.symbol, date: data.date };
  } catch (error) {
    console.error('MarketData 저장 오류:', error);
    throw error;
  }
}

async function createIndexData(data) {
  // IndexData 저장: 독립적인 지수 데이터 (KOSPI 등)
  const params = {
    TableName: process.env.DYNAMODB_TABLE || 'fiflow-users',
    Item: {
      PK: `INDEX#${data.name}`, // PK: INDEX#<name> (예: INDEX#KOSPI)
      SK: `DATA#${data.date}`, // SK: DATA#<date> (날짜별 데이터)
      index_name_date: `${data.name}_${data.date}`, // GSI용: index_name_date (예: KOSPI_2025-08-05)
      name: data.name, // 지수명 (예: KOSPI)
      value: data.value, // 지수 값 (decimal)
      change: data.change, // 변화량 (decimal)
      changeRate: data.changeRate, // 변화율 (decimal)
      date: data.date, // 데이터 날짜
      createdAt: new Date().toISOString(), // 생성 시간
      updatedAt: new Date().toISOString() // 업데이트 시간
    }
  };
  try {
    await dynamoDb.put(params).promise();
    console.log(`IndexData 저장 성공: ${data.name}_${data.date}`);
    return { status: 'success', name: data.name, date: data.date };
  } catch (error) {
    console.error('IndexData 저장 오류:', error);
    throw error;
  }
}

async function getUserWithStocks(userId) {
  // User와 관련 Stocks 조회: PK로 User와 Stocks를 한 번에 반환
  const params = {
    TableName: process.env.DYNAMODB_TABLE || 'fiflow-users',
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}` // PK: USER#<kakaoId or email>
    }
  };
  try {
    const result = await dynamoDb.query(params).promise();
    console.log(`User 조회 성공: ${userId}`);
    return result.Items; // User (SK=PROFILE)와 Stocks (SK=STOCK#<symbol>)
  } catch (error) {
    console.error('User 조회 오류:', error);
    throw error;
  }
}

async function getMarketData(symbol, date) {
  // MarketData 조회: 특정 symbol과 date로 조회
  const params = {
    TableName: process.env.DYNAMODB_TABLE || 'fiflow-users',
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    ExpressionAttributeValues: {
      ':pk': `STOCK#${symbol}`, // PK: STOCK#<symbol>
      ':sk': `MARKETDATA#${date}` // SK: MARKETDATA#<date>
    }
  };
  try {
    const result = await dynamoDb.query(params).promise();
    console.log(`MarketData 조회 성공: ${symbol}_${date}`);
    return result.Items; // foreignerNetBuy/Date는 List로 반환
  } catch (error) {
    console.error('MarketData 조회 오류:', error);
    throw error;
  }
}

async function getIndexData(name, date) {
  // IndexData 조회: 특정 name과 date로 조회
  const params = {
    TableName: process.env.DYNAMODB_TABLE || 'fiflow-users',
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    ExpressionAttributeValues: {
      ':pk': `INDEX#${name}`, // PK: INDEX#<name>
      ':sk': `DATA#${date}` // SK: DATA#<date>
    }
  };
  try {
    const result = await dynamoDb.query(params).promise();
    console.log(`IndexData 조회 성공: ${name}_${date}`);
    return result.Items;
  } catch (error) {
    console.error('IndexData 조회 오류:', error);
    throw error;
  }
}

async function getUserByEmail(email) {
  // GSI를 사용해 email로 User 조회
  const params = {
    TableName: process.env.DYNAMODB_TABLE || 'fiflow-users',
    IndexName: 'email-index',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':email': email
    }
  };
  try {
    const result = await dynamoDb.query(params).promise();
    console.log(`User 조회 성공 (email): ${email}`);
    return result.Items;
  } catch (error) {
    console.error('User 조회 오류 (email):', error);
    throw error;
  }
}

async function getUserByKakaoId(kakaoId) {
  // GSI를 사용해 kakaoId로 User 조회
  const params = {
    TableName: process.env.DYNAMODB_TABLE || 'fiflow-users',
    IndexName: 'kakaoId-index',
    KeyConditionExpression: 'kakaoId = :kakaoId',
    ExpressionAttributeValues: {
      ':kakaoId': kakaoId
    }
  };
  try {
    const result = await dynamoDb.query(params).promise();
    console.log(`User 조회 성공 (kakaoId): ${kakaoId}`);
    return result.Items;
  } catch (error) {
    console.error('User 조회 오류 (kakaoId):', error);
    throw error;
  }
}

module.exports = {
  dynamoDb,
  createUser,
  createStock,
  createMarketData,
  createIndexData,
  getUserWithStocks,
  getMarketData,
  getIndexData,
  getUserByEmail,
  getUserByKakaoId
};