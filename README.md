# Vive Stock App

주식정보 확인을 위한 Flutter 앱과 Node.js API 서버입니다.

## 🚀 주요 기능

- **주식 추가**: 종목 코드를 입력하여 관심 주식 추가
- **실시간 크롤링**: 네이버 금융에서 최신 종목명 및 주가, 외국인 순매매량 크롤링
- **주식 목록 관리**: 추가된 주식들의 목록 조회
- **크로스 플랫폼**: Flutter로 iOS/Android 지원

## 🏗️ 아키텍처

```
┌─────────────────┐    HTTP    ┌─────────────────┐    Python  ┌─────────────────┐
│   Flutter App   │ ────────── │   Node.js API   │ ────────── │   Web Crawler   │
│                 │            │                 │            │                 │
│ - UI Components │            │ - Express.js    │            │ - BeautifulSoup │
│ - HTTP Client   │            │ - Sequelize ORM │            │ - Requests      │
│ - State Mgmt    │            │ - MySQL DB      │            │ - 네이버 금융      │
└─────────────────┘            └─────────────────┘            └─────────────────┘
```

## 🛠️ 기술 스택

### Frontend
- **Flutter**: 크로스 플랫폼 모바일 앱
- **HTTP**: API 통신

### Backend
- **Node.js**: API 서버
- **Express.js**: 웹 프레임워크
- **Sequelize**: ORM
- **MySQL**: 데이터베이스

### Crawler
- **Python**: 웹 크롤링
- **BeautifulSoup**: HTML 파싱
- **Requests**: HTTP 요청

### Infrastructure
- **Docker**: 컨테이너화
- **Docker Compose**: 멀티 컨테이너 관리

## 📁 프로젝트 구조

```
viveWeb/
├── api-server/              # Node.js API 서버
│   ├── app.js               # 메인 서버 파일
│   ├── models/              # 데이터베이스 모델
│   ├── migrations/          # DB 마이그레이션
│   └── config/              # 설정 파일
├── crawler/                 # Python 크롤러
│   ├── get_stock_info.py    # 주식 정보 크롤링
│   └── requirements.txt     # Python 의존성
├── fiflow_app/              # Flutter 앱
│   └── lib/
│       ├── pages/           # 페이지 컴포넌트
│       └── widgets/         # 재사용 위젯
└── docker-compose.yml       # Docker 설정
```

## 🚀 시작하기

### 1. 저장소 클론
```bash
git clone <repository-url>
cd viveWeb
```

### 2. Docker로 실행
```bash
# 모든 서비스 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

### 3. Flutter 앱 실행
```bash
cd fiflow_app
flutter run
```

## 📱 사용법

1. **주식 추가**: 종목 코드 입력 후 Add 버튼 클릭
2. **주식 목록**: 현재 추가된 주식들 확인
3. **실시간 크롤링**: 네이버 금융에서 최신 종목명 자동 가져오기

## 🔧 개발 환경 설정

### API 서버 개발
```bash
cd api-server
npm install
npm start
```

### 크롤러 개발
```bash
cd crawler
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python get_stock_info.py 005930
```

### Flutter 앱 개발
```bash
cd fiflow_app
flutter pub get
flutter run
```

## 📊 API 엔드포인트

- `GET /stocks`: 주식 목록 조회
- `POST /stock/add`: 주식 추가
- `GET /stock/:symbol/foreign`: 외국인 매매량 조회
