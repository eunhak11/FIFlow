# FIFlow v2 — Product Requirements Document

**버전**: 2.1  
**작성일**: 2026-05-05  
**상태**: 확정

---

## 1. 프로젝트 개요

### 배경
FIFlow는 외국인 투자 동향 및 주식 정보를 제공하는 개인용 금융 앱이다. v1은 AWS Lambda + DynamoDB 기반으로 구성되었으나, Lambda 콜드 스타트로 인한 긴 로딩 시간과 크롤러 타이밍 불일치로 인한 실시간 반영 실패 문제로 유기되었다.

v2는 이 두 가지 핵심 문제를 구조적으로 해결하는 것을 최우선 목표로 한다.

### v1 핵심 문제 → v2 해결 방식

| 문제 | v1 원인 | v2 해결 |
|------|---------|---------|
| 긴 로딩 시간 | Lambda 콜드 스타트, Authorizer 중첩 | KT Cloud 상시 실행 서버, 콜드 스타트 제로 |
| 실시간 반영 실패 | 크롤러 on-demand 호출, 비동기 트리거 불안정 | KIS WebSocket → MySQL write → SSE push |
| 복잡한 인프라 | Lambda + DynamoDB + Serverless Framework | Next.js + MySQL + KT Cloud 단일 서버 |
| 유지보수 어려움 | Flutter/Dart — Claude 의존도 높고 디버깅 어려움 | Next.js/TypeScript — Claude Code 최적 스택 |

### 목표
- v1의 모든 핵심 기능을 재구현한다
- 지수 데이터를 WebSocket으로 실시간 수신하여 SSE로 클라이언트에 push한다
- Flutter를 제거하고 Next.js PWA로 전환하여 유지보수성을 높인다
- AWS를 제거하고 KT Cloud 단일 서버로 전환하여 운영 비용을 최소화한다

---

## 2. 아키텍처

### 최종 구조

```
사용자 (모바일/웹)
    │ PWA — 홈 화면 추가 시 네이티브 앱처럼 동작
    ▼
KT Cloud 서버
├── Next.js (PM2 상시 실행)
│   ├── /app/**        → 프론트엔드 (React)
│   └── /app/api/**    → API Routes (백엔드)
│       └── /api/sse/index → SSE 엔드포인트 (지수 실시간 push)
│
├── MySQL              → 모든 데이터 저장 (서버 내 로컬 접속)
│
└── Python 프로세스 (PM2 상시 실행)
    ├── kis_websocket.py   → KIS WebSocket 구독 → MySQL write (지수 실시간)
    └── foreign_crawler.py → 외국인 순매매 cron (평일 16:30)

KIS Developers API
├── WebSocket          → 지수 실시간 수신 (Python 프로세스)
└── REST API           → 종목 현재가 조회 (30초 폴링)
```

### 데이터 흐름

**지수 실시간:**
```
KIS WebSocket
    → kis_websocket.py (KT Cloud)
    → MySQL index_data 테이블 upsert
    → Next.js /api/sse/index (MySQL 폴링, 1초 간격)
    → SSE → 클라이언트 자동 업데이트 (~1-2초)
```

**종목 현재가:**
```
Next.js 클라이언트 (30초마다)
    → /api/stocks/price
    → KIS REST API
    → 클라이언트에 반환
```

**외국인 순매매:**
```
cron (평일 16:30)
    → foreign_crawler.py
    → 네이버 금융 스크래핑
    → MySQL foreign_trading 테이블 upsert
```

### v1 → v2 변경 요약

| 구분 | v1 | v2 |
|------|----|----|
| 프론트엔드 | Flutter (Dart) | Next.js + React (PWA) |
| API 서버 | Node.js Lambda | Next.js API Routes |
| 데이터베이스 | AWS DynamoDB | KT Cloud MySQL |
| 인증 | 직접 JWT 구현 | NextAuth.js (카카오 Provider) |
| 지수 데이터 | Python Lambda 크롤링 (불안정) | KIS WebSocket 실시간 |
| 종목 시세 | 네이버 금융 크롤링 | KIS REST API |
| 외국인 순매매 | Python Lambda on-demand | Python cron (평일 16:30) |
| 실시간 push | 없음 (폴링만) | SSE (Server-Sent Events) |
| 배포 | Serverless Framework | PM2 |
| 비용 | AWS 과금 | KT Cloud (기보유) |

---

## 3. 기술 스택

| 구분 | 기술 | 선택 이유 |
|------|------|----------|
| 프론트엔드 | Next.js (App Router) + TypeScript | Claude Code 최적 스택 |
| 스타일링 | Tailwind CSS | 빠른 반응형 구현 |
| 상태관리 | Zustand | 경량, 단순 |
| 백엔드 | Next.js API Routes | 프론트와 단일 레포, 별도 서버 불필요 |
| DB | KT Cloud MySQL | 서버 내 로컬 접속, 별도 비용 없음 |
| 인증 | NextAuth.js + 카카오 Provider | 카카오 OAuth 간단 연동 |
| 실시간 | SSE (Server-Sent Events) | 단방향 push, 구현 단순 |
| 금융 데이터 | KIS Developers Open API | WebSocket + REST 모두 지원, 무료 |
| 크롤러 | Python 3.11 + BeautifulSoup | 외국인 순매매 전용 |
| 프로세스 관리 | PM2 | Next.js + Python 상시 실행, 자동 재시작 |
| PWA | next-pwa | 홈 화면 추가 시 앱처럼 동작 |

---

## 4. DB 스키마 (KT Cloud MySQL)

### users
```sql
CREATE TABLE users (
  id         VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  kakao_id   VARCHAR(255) UNIQUE NOT NULL,
  email      VARCHAR(255),
  nickname   VARCHAR(255),
  created_at DATETIME     DEFAULT CURRENT_TIMESTAMP
);
```

### watchlist (관심 종목)
```sql
CREATE TABLE watchlist (
  id          VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  user_id     VARCHAR(36)  NOT NULL,
  symbol      VARCHAR(20)  NOT NULL,
  name        VARCHAR(255) NOT NULL,
  is_favorite TINYINT(1)   DEFAULT 0,
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_symbol (user_id, symbol)
);
```

### index_data (지수 실시간)
```sql
CREATE TABLE index_data (
  id          VARCHAR(36)    PRIMARY KEY DEFAULT (UUID()),
  index_name  VARCHAR(20)    UNIQUE NOT NULL,  -- KOSPI | KOSDAQ | KPI200
  price       DECIMAL(12,2)  NOT NULL,
  `change`    DECIMAL(12,2)  NOT NULL,         -- 등락 (MySQL 예약어라 백틱 처리)
  change_rate DECIMAL(8,4)   NOT NULL,         -- 등락률 (%)
  updated_at  DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 초기 데이터
INSERT INTO index_data (index_name, price, `change`, change_rate)
VALUES ('KOSPI', 0, 0, 0), ('KOSDAQ', 0, 0, 0), ('KPI200', 0, 0, 0);
```

### foreign_trading (외국인 순매매)
```sql
CREATE TABLE foreign_trading (
  id         VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  symbol     VARCHAR(20) NOT NULL,
  trade_date DATE        NOT NULL,
  net_buy    BIGINT      NOT NULL,   -- 순매수량 (음수 = 순매도)
  created_at DATETIME    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_symbol_date (symbol, trade_date)
);
```

---

## 5. 기능 요구사항

### 5.1 인증

- NextAuth.js + 카카오 Provider를 사용한다
- 카카오 디벨로퍼스에서 CLIENT_ID, CLIENT_SECRET을 발급받아 환경변수에 설정한다
- 로그인 성공 시 NextAuth.js session을 브라우저에 저장한다 (자동 갱신)
- 비로그인 상태에서는 로그인 페이지로 리다이렉트한다
- 로그아웃 시 session을 완전히 삭제한다

### 5.2 메인 대시보드

**주요 지수 (SSE push)**
- KOSPI, KOSDAQ, KPI200의 현재가와 등락률을 표시한다
- `/api/sse/index` SSE 엔드포인트를 구독하여 변경 시 자동 업데이트한다 (~1-2초 지연)
- 장 시간(09:00-15:30 KST, 평일) 외에는 마지막 데이터를 표시한다

**관심 종목 시세 (30초 폴링)**
- 등록한 관심 종목의 현재가, 등락률을 표시한다
- KIS REST API로 30초마다 갱신한다
- 즐겨찾기(★) 종목은 목록 상단에 고정한다

**UI 레이아웃**
- 테마: 라이트 모드, 토스/카카오페이 스타일 (둥근 카드, 넉넉한 여백)
- 상단: 지수 카드 3개 가로 배치 (KOSPI / KOSDAQ / KPI200)
- 중단: 관심 종목 카드 (종목명 + 코드 + ★ + 현재가 + 등락 뱃지)
- 종목 카드 하단: 외국인 순매수 8일 바 차트
- 하단: 탭바 (홈 / 종목 추가 / 마이)

### 5.3 외국인 순매수 동향

- 관심 종목별 최근 8거래일 외국인 순매수량을 바 차트로 표시한다
- 순매수(양수)는 빨간색, 중간선 기준 위 방향으로 표시한다
- 순매도(음수)는 파란색, 중간선 기준 아래 방향으로 표시한다
- 수치는 항상 표시하며 K/M 단위로 축약한다 (예: +2.8M, -450K)
- 데이터는 매일 16:30 크롤링하여 MySQL에 저장한 값을 사용한다

### 5.4 관심 종목 관리

- 종목 코드로 관심 종목을 추가한다
- 종목 추가 시 KIS API로 종목명을 자동 조회하여 DB에 저장한다
- 관심 종목을 삭제할 수 있다
- 즐겨찾기(★) 토글로 상단 고정 여부를 설정한다
- 즐겨찾기 상태는 MySQL DB에 저장한다

### 5.5 PWA

- `next-pwa`로 PWA를 구성한다
- 모바일에서 "홈 화면에 추가" 시 스플래시, 풀스크린, 앱 아이콘이 적용된다
- 오프라인 시 마지막 캐시 데이터를 표시한다

### 5.6 Admin API (크롤러 관리)

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| POST | /api/admin/crawl/foreign | 외국인 순매매 크롤러 수동 실행 |
| GET | /api/admin/crawl/status | 마지막 크롤링 시각 및 상태 조회 |

- `X-Admin-Key` 헤더로 인증한다 (환경변수에서 로드)
- 크롤러 실행 결과(성공/실패, 소요 시간, 수집 건수)를 JSON으로 반환한다
- 실행 로그는 `/home/fiflow/logs/crawler.log`에 기록한다

---

## 6. 성능 목표

| 지표 | v1 | v2 목표 |
|------|-----|---------|
| 첫 로딩 | 8-10초 | 1-2초 |
| 지수 업데이트 지연 | 크롤링 주기 의존 | ~1-2초 (SSE push) |
| 종목 시세 최신성 | 크롤링 타이밍 불일치 | 최대 30초 |
| 콜드 스타트 | 있음 (Lambda) | 없음 (상시 실행) |

---

## 7. 환경변수

### Next.js (.env.local)
```
MYSQL_HOST=        # 로컬 개발 시 KT Cloud 공인 IP
MYSQL_PORT=3306
MYSQL_USER=fiflow
MYSQL_PASSWORD=
MYSQL_DATABASE=fiflow
NEXTAUTH_SECRET=
NEXTAUTH_URL=      # 로컬: http://localhost:3000
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
KIS_APP_KEY=
KIS_APP_SECRET=
KIS_ACCOUNT=
ADMIN_API_KEY=
```

### Python 크롤러 (.env)
```
MYSQL_HOST=
MYSQL_PORT=3306
MYSQL_USER=fiflow
MYSQL_PASSWORD=
MYSQL_DATABASE=fiflow
KIS_APP_KEY=
KIS_APP_SECRET=
```

---

## 8. 배포 구성

### 디렉토리 구조 (KT Cloud)
```
/home/fiflow/
├── web/              # Next.js 프로젝트
├── crawler/          # Python 크롤러
│   ├── venv/
│   ├── kis_websocket.py
│   └── foreign_crawler.py
└── logs/
    ├── web.log
    └── crawler.log
```

### PM2 설정 (ecosystem.config.js)
```javascript
module.exports = {
  apps: [
    {
      name: 'fiflow-web',
      cwd: '/home/fiflow/web',
      script: 'node',
      args: '.next/standalone/server.js',
      env: { NODE_ENV: 'production', PORT: 3000 }
    },
    {
      name: 'fiflow-kis-ws',
      cwd: '/home/fiflow/crawler',
      script: '/home/fiflow/crawler/venv/bin/python3',
      args: 'kis_websocket.py',
      autorestart: true,
      restart_delay: 5000
    }
  ]
}
```

### cron (외국인 순매매)
```bash
# 평일 16:30 실행
30 16 * * 1-5 /home/fiflow/crawler/venv/bin/python3 /home/fiflow/crawler/foreign_crawler.py >> /home/fiflow/logs/crawler.log 2>&1
```

---

## 9. KIS API 관련 주의사항

- 모의투자 계좌로 시작하며, WebSocket 실시간이 모의투자에서 제한될 경우 단계적으로 대안을 적용한다
  - **대안 A**: KIS REST API 폴링 방식으로 지수도 30초 간격 조회
  - **대안 B**: 별도 Node.js WebSocket 브릿지 서버를 KT Cloud에 추가
- API 토큰은 Python 프로세스에서 매일 자동 갱신한다
- Rate limit 초과 방지를 위해 요청 간격을 관리한다

---

## 10. 구현 순서

1. MySQL 스키마 생성 (KT Cloud 서버)
2. Next.js 프로젝트 초기화 — App Router, TypeScript, Tailwind, PWA
3. NextAuth.js 카카오 로그인/로그아웃
4. KIS REST API 종목 시세 연동
5. 메인 대시보드 UI — 지수 + 관심 종목 레이아웃
6. SSE 엔드포인트 (`/api/sse/index`) — MySQL 폴링 → 클라이언트 push
7. Python KIS WebSocket — 지수 수신 → MySQL write
8. 외국인 순매매 크롤러 + 바 차트 UI
9. 관심 종목 관리 — 추가/삭제/즐겨찾기
10. PWA 설정 — 홈 화면 추가, 오프라인 캐시
11. Admin API — 크롤러 수동 실행
12. KT Cloud 배포 — PM2, cron, Nginx, HTTPS
