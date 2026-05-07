"""
외국인 순매매 크롤러
- 네이버 금융 frgn.naver 페이지에서 외국인 순매매 데이터 수집
- DB watchlist 테이블의 종목을 자동 순회
- 평일 16:30 cron으로 실행 권장
"""

import os
import logging
import time
from datetime import date
from dotenv import load_dotenv
import requests
from bs4 import BeautifulSoup
import pymysql

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)
logger = logging.getLogger(__name__)

HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/124.0.0.0 Safari/537.36'
    ),
}

NAVER_FRGN_URL = 'https://finance.naver.com/item/frgn.naver'


def get_db_connection() -> pymysql.Connection:
    return pymysql.connect(
        host=os.environ['MYSQL_HOST'],
        port=int(os.environ.get('MYSQL_PORT', 3306)),
        user=os.environ['MYSQL_USER'],
        password=os.environ['MYSQL_PASSWORD'],
        database=os.environ['MYSQL_DATABASE'],
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor,
    )


def fetch_symbols(conn: pymysql.Connection) -> list[str]:
    """watchlist 테이블에서 중복 없이 종목코드 목록 조회"""
    with conn.cursor() as cursor:
        cursor.execute('SELECT DISTINCT symbol FROM watchlist')
        rows = cursor.fetchall()
    symbols = [r['symbol'] for r in rows]
    logger.info(f'크롤링 대상 종목: {symbols}')
    return symbols


def parse_frgn_page(symbol: str, page: int) -> list[dict]:
    """네이버 금융 외국인 순매매 페이지 1페이지 파싱 → [{trade_date, net_buy}]"""
    resp = requests.get(
        NAVER_FRGN_URL,
        params={'code': symbol, 'page': page},
        headers=HEADERS,
        timeout=10,
    )
    resp.raise_for_status()
    resp.encoding = 'euc-kr'

    soup = BeautifulSoup(resp.text, 'html.parser')
    tables = soup.select('table.type2')
    # 두 번째 type2 테이블이 날짜별 순매매 데이터
    if len(tables) < 2:
        logger.warning(f'[{symbol}] 데이터 테이블 없음 (page={page})')
        return []
    table = tables[1]

    results = []
    for tr in table.select('tr'):
        tds = tr.select('td')
        if len(tds) < 7:
            continue

        date_text = tds[0].get_text(strip=True)
        # 컬럼: 날짜(0) 종가(1) 전일비(2) 등락률(3) 거래량(4) 기관(5) 외국인(6) 보유주수(7) 보유율(8)
        net_buy_text = tds[6].get_text(strip=True).replace(',', '').replace('+', '')

        if not date_text or not net_buy_text:
            continue

        try:
            trade_date = date.fromisoformat(date_text.replace('.', '-'))
            net_buy = int(net_buy_text)  # 단위: 주
        except (ValueError, AttributeError):
            continue

        results.append({'trade_date': trade_date, 'net_buy': net_buy})

    return results


def crawl_symbol(symbol: str, days: int = 30) -> list[dict]:
    """종목 1개에 대해 최근 N일치 데이터 수집 (페이지 순회)"""
    all_data: list[dict] = []
    seen_dates: set[date] = set()

    for page in range(1, 10):
        try:
            page_data = parse_frgn_page(symbol, page)
        except Exception as e:
            logger.error(f'[{symbol}] 페이지 {page} 파싱 실패: {e}')
            break

        if not page_data:
            break

        for entry in page_data:
            d = entry['trade_date']
            if d not in seen_dates:
                seen_dates.add(d)
                all_data.append(entry)

        if len(all_data) >= days:
            break

        time.sleep(0.5)

    logger.info(f'[{symbol}] {len(all_data)}건 수집')
    return all_data[:days]


def upsert_data(conn: pymysql.Connection, symbol: str, data: list[dict]) -> int:
    """foreign_trading 테이블에 upsert. 저장된 건수 반환"""
    if not data:
        return 0

    sql = """
        INSERT INTO foreign_trading (symbol, trade_date, net_buy)
        VALUES (%s, %s, %s)
        ON DUPLICATE KEY UPDATE net_buy = VALUES(net_buy)
    """
    rows = [(symbol, d['trade_date'], d['net_buy']) for d in data]

    with conn.cursor() as cursor:
        cursor.executemany(sql, rows)
    conn.commit()

    logger.info(f'[{symbol}] {len(rows)}건 upsert 완료')
    return len(rows)


def run() -> None:
    logger.info('===== 외국인 순매매 크롤링 시작 =====')
    conn = get_db_connection()

    try:
        symbols = fetch_symbols(conn)

        for symbol in symbols:
            try:
                data = crawl_symbol(symbol, days=30)
                upsert_data(conn, symbol, data)
            except Exception as e:
                logger.error(f'[{symbol}] 크롤링 실패: {e}', exc_info=True)
            time.sleep(1)

    finally:
        conn.close()

    logger.info('===== 외국인 순매매 크롤링 완료 =====')


if __name__ == '__main__':
    run()
