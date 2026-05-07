# FIFlow v2 — Web

Next.js 기반 프론트엔드 + API 서버. 루트 README는 [../README.md](../README.md) 참고.

## 개발 서버 실행

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000)

## 환경변수

`.env.local` 파일을 프로젝트 루트(`web/`)에 생성:

```
MYSQL_HOST=
MYSQL_PORT=3306
MYSQL_USER=fiflow
MYSQL_PASSWORD=
MYSQL_DATABASE=fiflow

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=

KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=

KIS_APP_KEY=
KIS_APP_SECRET=
```

## 주요 디렉토리

```
app/
├── (auth)/login/        # 카카오 로그인
├── (dashboard)/         # 메인 대시보드, 관심종목, 캘린더, 마이
└── api/
    ├── sse/index/       # SSE 엔드포인트 (지수 실시간)
    ├── stocks/price/    # KIS REST API 종목 시세
    ├── watchlist/       # 관심종목 CRUD
    ├── foreign-trading/ # 외국인 순매매 조회
    └── admin/crawl/     # 크롤러 수동 트리거

components/              # UI 컴포넌트
lib/
├── db/                  # MySQL 클라이언트
└── kis/                 # KIS API 클라이언트
store/                   # Zustand 상태
types/                   # TypeScript 타입 정의
```

## 빌드

```bash
npm run build
npm run start
```
