const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443'

type KisTokenResponse = {
  access_token: string
  token_type: string
  expires_in: number
}

let cachedToken: string | null = null
let tokenExpiresAt: number = 0

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken
  }

  const res = await fetch(`${KIS_BASE_URL}/oauth2/tokenP`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      appkey: process.env.KIS_APP_KEY,
      appsecret: process.env.KIS_APP_SECRET,
    }),
  })

  if (!res.ok) {
    throw new Error(`KIS 토큰 발급 실패: ${res.status}`)
  }

  const data: KisTokenResponse = await res.json()
  cachedToken = data.access_token
  tokenExpiresAt = Date.now() + data.expires_in * 1000
  return cachedToken
}

export type KisStockPriceResponse = {
  output: {
    stck_shrn_iscd: string  // 종목 단축코드
    stck_prpr: string       // 주식 현재가
    prdy_vrss: string       // 전일 대비
    prdy_ctrt: string       // 전일 대비율 (%)
    hts_kor_isnm: string    // HTS 종목명
  }
}

export async function getStockPrice(symbol: string): Promise<{
  symbol: string
  name: string
  price: number
  change: number
  change_rate: number
}> {
  const token = await getAccessToken()

  const res = await fetch(
    `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=${symbol}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        appkey: process.env.KIS_APP_KEY!,
        appsecret: process.env.KIS_APP_SECRET!,
        tr_id: 'FHKST01010100',
        custtype: 'P',
      },
      next: { revalidate: 0 },
    }
  )

  if (!res.ok) {
    throw new Error(`KIS 시세 조회 실패: ${symbol} ${res.status}`)
  }

  const data: KisStockPriceResponse = await res.json()
  const { output } = data

  return {
    symbol,
    name: output.hts_kor_isnm,
    price: parseInt(output.stck_prpr, 10),
    change: parseInt(output.prdy_vrss, 10),
    change_rate: parseFloat(output.prdy_ctrt),
  }
}

export async function getStockName(symbol: string): Promise<string> {
  const result = await getStockPrice(symbol)
  return result.name
}

// ─── 지수 현재가 ──────────────────────────────────────────────────────────────

export type IndexPrice = {
  index_name: 'KOSPI' | 'KOSDAQ' | 'KPI200'
  price: number
  change: number
  change_rate: number
}

// ── MOCK: KIS API 미연결 임시 데이터 ──────────────────────────────────────────
const MOCK_INDICES: Record<string, Omit<IndexPrice, 'index_name'>> = {
  KOSPI:  { price: 2650.12, change: 12.50,  change_rate: 0.47  },
  KOSDAQ: { price: 870.30,  change: -3.20,  change_rate: -0.37 },
  KPI200: { price: 352.45,  change: 1.80,   change_rate: 0.51  },
}
// ─────────────────────────────────────────────────────────────────────────────

export async function getIndexPrices(): Promise<IndexPrice[]> {
  // ── MOCK ──────────────────────────────────────────────────────────────────
  return (Object.keys(MOCK_INDICES) as Array<keyof typeof MOCK_INDICES>).map((name) => {
    const base = MOCK_INDICES[name]
    const jitter = 1 + (Math.random() - 0.5) * 0.002
    return {
      index_name: name as IndexPrice['index_name'],
      price: parseFloat((base.price * jitter).toFixed(2)),
      change: parseFloat((base.change * jitter).toFixed(2)),
      change_rate: parseFloat((base.change_rate * jitter).toFixed(2)),
    }
  })
  // ── 실제 KIS API (연동 후 아래로 교체) ───────────────────────────────────
  // const token = await getAccessToken()
  // return Promise.all(
  //   Object.entries({ KOSPI: '0001', KOSDAQ: '1001', KPI200: '2001' }).map(async ([name, code]) => {
  //     const res = await fetch(
  //       `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-index-price?FID_COND_MRKT_DIV_CODE=U&FID_INPUT_ISCD=${code}`,
  //       {
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //           appkey: process.env.KIS_APP_KEY!,
  //           appsecret: process.env.KIS_APP_SECRET!,
  //           tr_id: 'FHPUP02100000',
  //           custtype: 'P',
  //         },
  //         next: { revalidate: 0 },
  //       }
  //     )
  //     if (!res.ok) throw new Error(`KIS 지수 조회 실패: ${name} ${res.status}`)
  //     const { output: o } = await res.json()
  //     return {
  //       index_name: name as IndexPrice['index_name'],
  //       price: parseFloat(o.bstp_nmix_prpr),
  //       change: parseFloat(o.bstp_nmix_prdy_vrss),
  //       change_rate: parseFloat(o.bstp_nmix_prdy_ctrt),
  //     }
  //   })
  // )
}
