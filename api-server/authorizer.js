// api-server/authorizer.js
const jwt = require('jsonwebtoken');

// 환경 변수에서 JWT_SECRET 가져오기
const JWT_SECRET = process.env.JWT_SECRET;

exports.handler = async (event, context, callback) => {
  console.log('Authorizer event:', JSON.stringify(event));

  const token = event.authorizationToken;

  if (!token) {
    console.log('No token provided');
    return callback('Unauthorized'); // Return a 401 Unauthorized response
  }

  try {
    // "Bearer " 접두사 제거
    const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token;

    const decoded = jwt.verify(actualToken, JWT_SECRET);
    console.log('Token decoded:', decoded);

    // 인증 성공 시 IAM 정책 생성
    // decoded.userId는 JWT 페이로드에 포함된 사용자 ID라고 가정합니다.
    const policy = generatePolicy(decoded.userId, 'Allow', event.methodArn);
    console.log('Generated policy:', JSON.stringify(policy));
    return callback(null, policy);
  } catch (err) {
    console.error('JWT verification error:', err);
    return callback('Unauthorized'); // Return a 401 Unauthorized response
  }
};

// IAM 정책을 생성하는 헬퍼 함수
const generatePolicy = (principalId, effect, resource) => {
  const authResponse = {};
  authResponse.principalId = principalId;
  if (effect && resource) {
    const policyDocument = {};
    policyDocument.Version = '2012-10-17';
    policyDocument.Statement = [];
    const statementOne = {};
    statementOne.Action = 'execute-api:Invoke';
    statementOne.Effect = effect;
    statementOne.Resource = resource;
    policyDocument.Statement[0] = statementOne;
    authResponse.policyDocument = policyDocument;
  }
  return authResponse;
};