# CLAUDE.md — FIFlow v2

이 파일은 Claude Code가 FIFlow v2 프로젝트를 작업할 때 반드시 따라야 하는 규칙과 컨텍스트를 정의한다.

---

## 프로젝트 개요

외국인 투자 동향 및 주식 정보를 제공하는 개인용 금융 웹앱 (PWA).  
자세한 내용은 `PRD.md` 참고.

**핵심 문제의식**: v1의 실패 원인은 Lambda 콜드 스타트(로딩)와 크롤러 타이밍 불일치(실시간 반영 실패)였다. v2의 모든 설계 결정은 이 두 문제를 해결하는 방향으로 이루어진다.

---

## 기술 스택 (변경 금지)

```
프론트 + 백엔드  Next.js (App Router) + TypeScript
스타일링        Tailwind CSS
상태관리        Zustand
DB             KT Cloud MySQL
인증           NextAuth.js + 카카오 Provider
실시간         SSE (Server-Sent Events)
금융 데이터     KIS Developers Open API (WebSocket + REST)
크롤러         Python 3.11 + BeautifulSoup
프로세스 관리   PM2 (KT Cloud)
PWA            next-pwa
```

스택 변경이 필요하다고 판단될 경우, 임의로 변경하지 말고 반드시 사용자에게 먼저 확인한다.

---

## 디렉토리 구조

```
fiflow_v2/
├── web/                        # Next.js 프로젝트 루트
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx        # 메인 대시보드
│   │   │   └── watchlist/
│   │   └── api/
│   │       ├── auth/           # NextAuth.js 핸들러
│   │       ├── sse/
│   │       │   └── index/      # SSE 엔드포인트 (지수 실시간)
│   │       ├── stocks/
│   │       │   └── price/
│   │       ├── watchlist/
│   │       ├── foreign-trading/
│   │       └── admin/
│   │           └── crawl/
│   ├── components/
│   ├── lib/
│   │   ├── db/                 # MySQL 클라이언트
│   │   └── kis/                # KIS API 클라이언트
│   ├── store/                  # Zustand stores
│   └── types/
│
├── crawler/                    # Python 크롤러
│   ├── kis_websocket.py        # KIS WebSocket 구독 → MySQL write (지수 실시간)
│   ├── foreign_crawler.py      # 외국인 순매매 크롤러 (cron)
│   ├── requirements.txt
│   └── .env
│
├── ecosystem.config.js         # PM2 설정
└── PRD.md
```

---

## 핵심 아키텍처 규칙

### 1. 데이터 소스 분리 (절대 혼용 금지)

| 데이터 | 소스 | 방식 |
|--------|------|------|
| 지수 (KOSPI/KOSDAQ/KPI200) | KIS WebSocket → MySQL → SSE | 실시간 push (~1-2초) |
| 종목 현재가 | KIS REST API | 30초 폴링 |
| 외국인 순매매 | 네이버 금융 크롤링 | 평일 16:30 cron |

네이버 금융 크롤링을 지수나 종목 시세에 사용하지 않는다. v1의 실패 원인이 바로 이것이었다.

### 2. MySQL 작업 규칙

- DB 클라이언트는 `web/lib/db/`에서 관리한다. 쿼리를 컴포넌트에 직접 작성하지 않는다.
- MySQL 접속 정보(`MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`)는 서버 사이드에서만 사용한다. 클라이언트에 절대 노출하지 않는다.
- 스키마 변경 시 `PRD.md` 섹션 4의 DDL을 함께 업데이트한다.
- INSERT 시 중복 처리는 `INSERT ... ON DUPLICATE KEY UPDATE` 패턴을 사용한다.

### 3. NextAuth.js 규칙

- session 접근은 서버에서 `getServerSession()`, 클라이언트에서 `useSession()`을 사용한다.
- `NEXTAUTH_SECRET`은 서버 전용 변수로 클라이언트에 절대 노출하지 않는다.
- API Routes 보호: `getServerSession()`으로 인증 확인 후 미인증 시 401 반환.
- 미들웨어에서 비로그인 접근을 로그인 페이지로 리다이렉트한다.

### 4. SSE 규칙

- SSE 엔드포인트는 `/api/sse/index`에 구현한다.
- 서버에서 MySQL `index_data` 테이블을 1초 간격으로 폴링하여 변경 시 클라이언트에 push한다.
- 클라이언트는 `EventSource`로 구독하며, 연결 끊김 시 자동 재연결한다.
- SSE 응답 헤더: `Content-Type: text/event-stream`, `Cache-Control: no-cache`.

### 5. KIS API 규칙

- API 키(`KIS_APP_KEY`, `KIS_APP_SECRET`)는 반드시 환경변수로만 접근한다. 코드에 하드코딩하지 않는다.
- KIS REST API 호출은 API Routes(`/app/api/`)에서만 수행한다. 클라이언트에서 직접 KIS API를 호출하지 않는다.
- Rate limit 방지를 위해 종목 시세 폴링은 최소 30초 간격을 유지한다.
- 토큰 갱신 로직은 `crawler/kis_websocket.py`에서 담당한다.

### 6. 환경변수 규칙

- 클라이언트 접근 가능 변수: `NEXT_PUBLIC_` 접두사만 허용
- 서버 전용 변수: `NEXT_PUBLIC_` 접두사 없이 사용 (MySQL 접속 정보, NextAuth 시크릿 등)
- `.env.local`과 `.env`는 절대 커밋하지 않는다
- 새 환경변수 추가 시 `.env.example`도 함께 업데이트한다

---

## 로컬 개발 환경

맥북에 MySQL을 별도 설치하지 않고 KT Cloud 서버에 직접 원격 접속한다.

### KT Cloud 서버 MySQL 원격 접속 허용 설정

```sql
-- KT Cloud 서버에서 한 번만 실행
CREATE USER 'fiflow'@'%' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON fiflow.* TO 'fiflow'@'%';
FLUSH PRIVILEGES;
```

### KT Cloud 방화벽 설정

- 3306 포트를 개발 맥북 공인 IP에만 허용 (KT Cloud 콘솔 → 보안그룹)
- 프로덕션 배포 후에는 3306 포트 외부 노출을 닫고 localhost만 허용

### 로컬 `.env.local` 설정

```
MYSQL_HOST=<KT Cloud 서버 공인 IP>   # 로컬 개발 시
MYSQL_PORT=3306
MYSQL_USER=fiflow
MYSQL_PASSWORD=<설정한 패스워드>
MYSQL_DATABASE=fiflow
NEXTAUTH_URL=http://localhost:3000
```

---

## UI 스펙

### 메인 대시보드 레이아웃

- **테마**: 라이트 모드, 토스/카카오페이 스타일 (둥근 카드, 넉넉한 여백, 흰 배경)
- **상단**: 지수 카드 3개 가로 배치 (KOSPI / KOSDAQ / KPI200)
  - SSE로 실시간 업데이트
  - 등락 양수: 빨간색, 음수: 파란색
- **중단**: 관심 종목 카드 목록
  - 카드 구성: 종목명 + 종목코드 + ★(즐겨찾기) + 현재가 + 등락 뱃지
  - ★ 종목은 목록 상단 고정
- **종목 카드 하단**: 외국인 순매수 8일 바 차트
  - 매수(양수): 빨간색, 중간선(0) 기준 위 방향
  - 매도(음수): 파란색, 중간선(0) 기준 아래 방향
  - 수치 항상 표시, K/M 단위 축약 (예: +2.8M, -450K)
- **하단**: 탭바 고정 (홈 / 종목 추가 / 마이)

---

## 코드 스타일

### TypeScript (Next.js)

```typescript
// ✅ 타입 명시 필수
const fetchPrice = async (symbol: string): Promise<StockPrice> => { ... }

// ❌ any 사용 금지
const fetchPrice = async (symbol: any): Promise<any> => { ... }

// ✅ 에러 핸들링 필수
try {
  const data = await kisApi.getPrice(symbol)
  return { success: true, data }
} catch (error) {
  console.error('[KIS] 시세 조회 실패:', symbol, error)
  return { success: false, error: '시세 조회 실패' }
}

// ✅ API Routes 응답 형식 통일
return NextResponse.json({ success: true, data }, { status: 200 })
return NextResponse.json({ success: false, error: '메시지' }, { status: 400 })
```

### Python (크롤러)

```python
# ✅ 타입 힌트 필수
def crawl_foreign_trading(symbol: str) -> list[dict]:
    ...

# ✅ logging 모듈 사용 (print 금지)
import logging
logger = logging.getLogger(__name__)
logger.info(f"크롤링 시작: {symbol}")
logger.error(f"크롤링 실패: {symbol}", exc_info=True)

# ✅ MySQL INSERT ON DUPLICATE KEY UPDATE 사용 (중복 처리)
# ✅ 에러 발생 시 재시도 로직 포함
```

### 컴포넌트 규칙

- Server Component를 기본으로 사용하고, 상호작용이 필요한 경우에만 `'use client'`를 추가한다
- 데이터 페칭은 Server Component에서 수행한다 (SSE 구독 제외)
- SSE 구독은 별도 Client Component로 분리한다 (ex: `IndexSSEProvider`)

---

## 서브에이전트 작업 분리 지침

Claude Code가 병렬 서브에이전트를 사용할 때 아래 경계를 따른다.

**독립적으로 병렬 작업 가능:**
- `web/components/` UI 컴포넌트 개발
- `crawler/` Python 크롤러 개발
- `web/lib/kis/` KIS API 클라이언트 개발

**순서가 보장되어야 하는 작업 (반드시 순차 처리):**
1. MySQL 스키마 DDL
2. `web/lib/db/` MySQL 클라이언트
3. API Routes
4. 프론트엔드 컴포넌트

DB 스키마 변경이 포함된 작업은 반드시 순차적으로 처리한다.

---

## MCP 서버 설정

`.claude/settings.json`에 아래를 추가한다:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "kis-code-assistant": {
      "command": "uv",
      "args": ["run", "server.py"]
    }
  }
}
```

**GitHub MCP 활용:** 커밋, PR 생성, 브랜치 관리  
**KIS Code Assistant MCP 활용:** KIS API 코드 작성 시 정확한 파라미터/응답 구조 자동 검색

### KIS Code Assistant MCP 설정

공식 GitHub에서 클론 후 설정한다:

```bash
git clone https://github.com/koreainvestment/open-trading-api.git
cd "open-trading-api/MCP/KIS Code Assistant MCP"
```

KIS API 관련 코드 작성 시 Claude Code가 자동으로 참조한다. "지수 WebSocket 구독", "종목 현재가 조회" 등 자연어로 물어보면 정확한 파라미터와 예제 코드를 찾아준다.

---

## KIS API 장애 대응 플랜

모의투자 계좌의 WebSocket 제한 여부는 실제 개발 중 확인이 필요하다.

| 상황 | 대응 |
|------|------|
| WebSocket 정상 작동 | 현재 구조 유지 |
| WebSocket 제한됨 | KIS REST API로 지수 30초 폴링 전환 (대안 A) |
| REST API도 제한됨 | 별도 Node.js WebSocket 브릿지 서버 추가 (대안 B) |

대안 전환 시 `kis_websocket.py`만 수정하면 되도록 인터페이스를 설계한다. MySQL write 부분은 공통으로 유지한다.

---

## 배포 관련

### PM2 명령어
```bash
pm2 start ecosystem.config.js     # 전체 시작
pm2 logs fiflow-web                # Next.js 로그
pm2 logs fiflow-kis-ws             # KIS WebSocket 로그
pm2 restart fiflow-kis-ws          # WebSocket 프로세스 재시작
pm2 save                           # 재부팅 후 자동 시작 저장
```

### 크롤러 수동 실행 (curl)
```bash
# 외국인 순매매 수동 크롤링
curl -X POST https://fiflow.example.com/api/admin/crawl/foreign \
  -H "X-Admin-Key: ${ADMIN_API_KEY}"

# 상태 확인
curl https://fiflow.example.com/api/admin/crawl/status \
  -H "X-Admin-Key: ${ADMIN_API_KEY}"
```

### 로그 확인
```bash
tail -f /home/fiflow/logs/crawler.log
pm2 logs --lines 100
```

---

## 절대 하지 말아야 할 것

- `.env.local`, `.env` 파일 커밋
- MySQL 접속 정보를 클라이언트 코드에 노출 (`NEXT_PUBLIC_` 금지)
- `NEXTAUTH_SECRET`을 클라이언트에 노출
- KIS API 키를 클라이언트에서 직접 사용
- 지수/종목 시세를 네이버 금융 크롤링으로 수집 (v1 실패 원인)
- TypeScript에서 `any` 타입 사용
- Python에서 `print()` 사용 (`logging` 모듈 사용)
- 사용자 확인 없이 기술 스택 변경
- 30초 미만 간격으로 KIS REST API 폴링
