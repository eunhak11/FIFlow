# FIFlow

<div align="center">
  <img src="fiflow_app/assets/ic_launcher.png" alt="FIFlow Logo" width="120" height="120">
  <h3>FIFlow - 외국인 투자 동향 분석 플랫폼</h3>
</div>

## 📋 프로젝트 개요

FIFlow는 외국인 투자 동향 및 주식 정보를 실시간으로 제공하는 플랫폼입니다. 
/Flutter로 개발된 모바일 앱과 Node.js 백엔드 API 서버, Python 크롤러로 구성되어 있습니다.

## 🏗️ 프로젝트 구조

```
viveWeb/
├── api-server/          # Node.js 백엔드 API
├── crawler/            # Python 주식 데이터 크롤러
├── fiflow_app/         # Flutter 모바일 앱
└── docker-compose.yml  # Docker 컨테이너 설정
```

## 🚀 주요 기능

### 📱 모바일 앱 (Flutter)
- **카카오 로그인**: 간편한 소셜 로그인
- **실시간 주식 데이터**: 외국인 순매매 정보 실시간 제공
- **즐겨찾기 기능**: Hive를 활용한 로컬 즐겨찾기 관리
- **반응형 UI**: 다양한 화면 크기에 최적화된 UI
- **스플래시 스크린**: 커스텀 로딩 화면

### 🔧 백엔드 API (Node.js)
- **RESTful API**: 주식 데이터 제공
- **데이터베이스**: Sequelize ORM을 활용한 데이터 관리
- **마이그레이션**: 데이터베이스 스키마 관리
- **환경 변수**: 플랫폼별 설정 관리

### 🕷️ 데이터 크롤러 (Python)
- **실시간 크롤링**: 주식 시장 데이터 수집
- **자동화**: 정기적인 데이터 업데이트
- **에러 처리**: 안정적인 데이터 수집

## 🛠️ 기술 스택

### Frontend
- **Flutter**: 크로스 플랫폼 모바일 앱 개발
- **Dart**: 프로그래밍 언어
- **Hive**: 로컬 데이터베이스
- **Kakao SDK**: 소셜 로그인

### Backend
- **Node.js**: 서버 런타임
- **Express.js**: 웹 프레임워크
- **Sequelize**: ORM
- **MySQL**: 데이터베이스

### Data Collection
- **Python**: 크롤링 스크립트
- **BeautifulSoup**: 웹 스크래핑
- **Selenium**: 동적 콘텐츠 처리

### DevOps
- **Docker**: 컨테이너화
- **Docker Compose**: 멀티 컨테이너 관리

## 📦 설치 및 실행

### 1. 저장소 클론
```bash
git clone https://github.com/eunhak11/FIFlow.git
cd FIFlow
```

### 2. 환경 변수 설정

#### API 서버
```bash
cd api-server
cp env.server.template .env
# .env 파일을 편집하여 데이터베이스 정보 입력
```

#### Flutter 앱
```bash
cd fiflow_app
cp env.app.template .env
# .env 파일을 편집하여 API 엔드포인트 입력
```

### 3. 백엔드 실행
```bash
cd api-server
npm install
npm start
```

### 4. 크롤러 실행
```bash
cd crawler
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### 5. Flutter 앱 실행
```bash
cd fiflow_app
flutter pub get
flutter run
```

## 🐳 Docker 실행

```bash
docker-compose up -d
```

## 📱 앱 빌드

### APK 생성
```bash
cd fiflow_app
flutter build apk --release
```

생성된 APK: `build/app/outputs/flutter-apk/app-release.apk`

## 🗄️ 데이터베이스 스키마

### 주요 테이블
- **users**: 사용자 정보
- **stocks**: 주식 기본 정보
- **marketdata**: 시장 데이터 (외국인 순매매 등)
- **indexdata**: 지수 데이터


## 🎨 UI/UX 특징

- **모던한 디자인**: Material Design 기반
- **반응형 레이아웃**: 다양한 화면 크기 지원
- **직관적인 네비게이션**: 사용자 친화적 인터페이스
- **커스텀 스플래시**: 브랜드 아이덴티티 강화


## 📊 주요 API 엔드포인트

- `GET /api/stocks`: 주식 목록 조회
- `GET /api/marketdata`: 시장 데이터 조회
- `POST /api/auth/kakao`: 카카오 로그인
- `GET /api/user/favorites`: 즐겨찾기 조회

## 🧪 테스트

### Flutter 앱 테스트
```bash
cd fiflow_app
flutter test
```

### API 테스트
```bash
cd api-server
npm test
```

## 📈 성능 최적화

- **이미지 최적화**: 압축된 아이콘 및 이미지 사용
- **코드 스플리팅**: 필요한 기능만 로드
- **캐싱**: Hive를 활용한 로컬 데이터 캐싱
- **API 최적화**: 효율적인 데이터베이스 쿼리

## 🔒 보안

- **JWT 토큰**: 안전한 인증 처리
- **환경 변수**: 민감한 정보 보호
- **HTTPS**: 보안 통신
- **입력 검증**: 사용자 입력 데이터 검증

---

<div align="center">
  <p>⭐ 이 프로젝트가 도움이 되었다면 스타를 눌러주세요!</p>
</div>
