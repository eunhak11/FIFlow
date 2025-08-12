const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, DeleteCommand, UpdateCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

// DynamoDB 클라이언트 초기화 (서울 리전: ap-northeast-2)
const client = new DynamoDBClient({ region: 'ap-northeast-2' });
const dynamoDb = DynamoDBDocumentClient.from(client);

async function createUser(data) {
  const params = {
    TableName: process.env.DYNAMODB_TABLE || 'fiflow-users',
    Item: {
      PK: `USER#${data.kakaoId || data.email}`,
      SK: 'PROFILE',
      kakaoId: data.kakaoId || null,
      email: data.email || null,
      nickname: data.nickname || '사용자',
      loginType: data.loginType || 'kakao',
      isActive: data.isActive !== undefined ? data.isActive : true,
      lastLoginAt: data.lastLoginAt || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    ConditionExpression: 'attribute_not_exists(PK)',
  };
  try {
    await dynamoDb.send(new PutCommand(params));
    console.info(`User 저장 성공: ${data.kakaoId || data.email}`);
    return { status: 'success', kakaoId: data.kakaoId, email: data.email };
  } catch (error) {
    console.error('User 저장 오류:', error);
    throw error;
  }
}

async function createStock(userId, symbol, name) {
  const params = {
    TableName: process.env.DYNAMODB_TABLE || 'fiflow-users',
    Item: {
      PK: `USER#${userId}`,
      SK: `STOCK#${symbol}`,
      symbol: symbol,
      name: name,
      userId: userId,
      createdAt: new Date().toISOString(),
    },
  };
  try {
    await dynamoDb.send(new PutCommand(params));
    console.info(`Stock 저장 성공: ${symbol}`);
    return { status: 'success', symbol };
  } catch (error) {
    console.error('Stock 저장 오류:', error);
    throw error;
  }
}

async function createMarketData(data) {
  const params = {
    TableName: process.env.DYNAMODB_TABLE || 'fiflow-users',
    Item: {
      PK: `STOCK#${data.symbol}`,
      SK: `MARKETDATA#${data.date}`,
      symbol_date: `${data.symbol}_${data.date}`,
      symbol: data.symbol,
      date: data.date,
      price: parseInt(data.price),
      change: parseInt(data.change),
      changeRate: parseFloat(data.changeRate),
      stockName: data.stockName,
      foreignerNetBuy: (data.foreignerNetBuy || [0, 0, 0, 0, 0, 0, 0, 0]).map(num => parseInt(num)),
      foreignerNetBuyDate: data.foreignerNetBuyDate || ['', '', '', '', '', '', '', ''],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
  try {
    await dynamoDb.send(new PutCommand(params));
    console.info(`MarketData 저장 성공: ${data.symbol}_${data.date}`);
    return { status: 'success', symbol: data.symbol, date: data.date };
  } catch (error) {
    console.error('MarketData 저장 오류:', error);
    throw error;
  }
}

async function updateIndexData(data) {
  const params = {
    TableName: process.env.DYNAMODB_TABLE || 'fiflow-users',
    Key: {
      PK: `INDEX#${data.name}`,
      SK: 'LATEST_DATA',
    },
    UpdateExpression: 'SET #n = :n, #v = :v, #chg = :chg, #chgRate = :chgRate, #updatedAt = :updatedAt, #createdAt = if_not_exists(#createdAt, :createdAt)',
    ExpressionAttributeNames: {
      '#n': 'name',
      '#v': 'value',
      '#chg': 'change',
      '#chgRate': 'changeRate',
      '#createdAt': 'createdAt',
      '#updatedAt': 'updatedAt',
    },
    ExpressionAttributeValues: {
      ':n': data.name,
      ':v': parseFloat(data.value),
      ':chg': parseFloat(data.change),
      ':chgRate': parseFloat(data.changeRate),
      ':createdAt': new Date().toISOString(),
      ':updatedAt': new Date().toISOString(),
    },
    ReturnValues: 'UPDATED_NEW',
  };
  try {
    const result = await dynamoDb.send(new UpdateCommand(params));
    console.info(`IndexData 업데이트 성공: ${data.name}`);
    return { status: 'success', name: data.name };
  } catch (error) {
    console.error(`IndexData 업데이트 오류: ${data.name}`, error);
    throw error;
  }
}

async function getUserWithStocks(userId) {
  const params = {
    TableName: process.env.DYNAMODB_TABLE || 'fiflow-users',
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
    },
  };
  try {
    const result = await dynamoDb.send(new QueryCommand(params));
    console.info(`User 조회 성공: ${userId}`);
    return result.Items;
  } catch (error) {
    console.error('User 조회 오류:', error);
    throw error;
  }
}

async function getMarketData(symbol, date) {
  const params = {
    TableName: process.env.DYNAMODB_TABLE || 'fiflow-users',
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    ExpressionAttributeValues: {
      ':pk': `STOCK#${symbol}`,
      ':sk': `MARKETDATA#${date}`,
    },
  };
  try {
    const result = await dynamoDb.send(new QueryCommand(params));
    console.info(`MarketData 조회 성공: ${symbol}_${date}`);
    return result.Items;
  } catch (error) {
    console.error('MarketData 조회 오류:', error);
    throw error;
  }
}

async function getIndexData() {
  const params = {
    TableName: process.env.DYNAMODB_TABLE || 'fiflow-users',
    FilterExpression: 'SK = :sk',
    ExpressionAttributeValues: {
      ':sk': 'DATA',
    },
  };
  try {
    const result = await dynamoDb.send(new ScanCommand(params));
    console.info(`IndexData 조회 성공: ${result.Items.length} items, 데이터: ${JSON.stringify(result.Items)}`);
    return result.Items;
  } catch (error) {
    console.error('IndexData 조회 오류:', error);
    throw error;
  }
}

async function getUserByEmail(email) {
  const params = {
    TableName: process.env.DYNAMODB_TABLE || 'fiflow-users',
    IndexName: 'email-index',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':email': email,
    },
  };
  try {
    const result = await dynamoDb.send(new QueryCommand(params));
    console.info(`User 조회 성공 (email): ${email}`);
    return result.Items;
  } catch (error) {
    console.error('User 조회 오류 (email):', error);
    throw error;
  }
}

async function getUserByKakaoId(kakaoId) {
  const params = {
    TableName: process.env.DYNAMODB_TABLE || 'fiflow-users',
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    ExpressionAttributeValues: {
      ':pk': `USER#${kakaoId}`,
      ':sk': 'PROFILE',
    },
  };
  try {
    const result = await dynamoDb.send(new QueryCommand(params));
    console.info(`User 조회 성공 (kakaoId): ${kakaoId}`);
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
  updateIndexData,
  getUserWithStocks,
  getMarketData,
  getIndexData,
  getUserByEmail,
  getUserByKakaoId,
};