# /crawler/lambda_main.py
import requests
from bs4 import BeautifulSoup
import datetime
import re
import boto3
from botocore.exceptions import ClientError
import logging
from db import create_market_data, update_index_data

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_stocks_from_db(userId=None):
    """DynamoDB에서 주식 목록 조회: 사용자별 Query 사용"""
    try:
        dynamodb = boto3.resource('dynamodb', region_name='ap-northeast-2')
        table = dynamodb.Table('fiflow-users')
        if userId:
            # Query: 특정 사용자 주식 목록 조회
            response = table.query(
                KeyConditionExpression='PK = :pk AND begins_with(SK, :sk)',
                ExpressionAttributeValues={
                    ':pk': f'USER#{userId}',
                    ':sk': 'STOCK#'
                }
            )
        else:
            # 전체 주식 목록 (Scan 유지, 기본)
            response = table.scan(
                FilterExpression='begins_with(SK, :sk)',
                ExpressionAttributeValues={':sk': 'STOCK#'}
            )
        stocks = [(item['symbol'], item['stockName']) for item in response.get('Items', [])]
        if not stocks:
            logger.info("데이터가 존재하지 않습니다.")
            return []
        logger.info(f"조회된 주식 목록: {len(stocks)}개")
        return stocks
    except ClientError as e:
        logger.error(f"주식 목록 조회 오류: {e}")
        return []



def get_stock_name_from_symbol(symbol):
    """종목명 크롤링"""
    url = f"https://finance.naver.com/item/main.naver?code={symbol}"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124'}
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        stock_name = soup.select_one("#middle > div.h_company > div.wrap_company > h2 > a").text.strip()
        logger.info(f"[{symbol}] 종목명: {stock_name}")
        return stock_name or None
    except Exception as e:
        logger.error(f"[{symbol}] 종목명 오류: {e}")
        return None

def get_foreigner_net_buy(symbol):
    """외국인 순매매량 및 날짜 크롤링 (html.parser 사용, 최근 8일 데이터)"""
    url = f"https://finance.naver.com/item/frgn.naver?code={symbol}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    logger.info(f"[{symbol}] 크롤링 시작: {url}")
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 이전 코드의 선택기 복원
        rows = soup.select("div.inner_sub table.type2 tr[onmouseover]")
        logger.info(f"[{symbol}] 발견된 행 수: {len(rows)}")
        
        if not rows:
            logger.error(f"[{symbol}] 데이터 행(tr[onmouseover])을 찾을 수 없습니다.")
            with open(f"debug_{symbol}.html", "w", encoding="utf-8") as f:
                f.write(response.text)
            logger.info(f"[{symbol}] HTML 저장: debug_{symbol}.html")
            return [{'date': '', 'net_buy': 0}] * 8
        
        foreigner_data = []
        for row in rows[:8]:  # 최근 8일치 데이터
            try:
                cols = row.select('td')
                if len(cols) < 9:
                    logger.debug(f"[{symbol}] 행 스킵: 열 부족 ({len(cols)})")
                    foreigner_data.append({'date': '', 'net_buy': 0})
                    continue
                date = cols[0].text.strip()
                if not re.match(r'\d{4}\.\d{2}\.\d{2}', date):
                    logger.debug(f"[{symbol}] 행 스킵: 잘못된 날짜 형식 ({date})")
                    foreigner_data.append({'date': '', 'net_buy': 0})
                    continue
                net_buy_text = cols[6].text.strip().replace(",", "")
                try:
                    net_buy = int(net_buy_text) if net_buy_text else 0
                    logger.debug(f"[{symbol}] 데이터: 날짜={date}, 순매매={net_buy}")
                except ValueError:
                    logger.warning(f"[{symbol}] 순매매량 변환 실패: {net_buy_text}")
                    net_buy = 0
                foreigner_data.append({'date': date, 'net_buy': net_buy})
            except Exception as e:
                logger.debug(f"[{symbol}] 행 처리 오류: {e}")
                foreigner_data.append({'date': '', 'net_buy': 0})
        
        # 데이터가 8일 미만일 경우 빈 데이터로 채움
        while len(foreigner_data) < 8:
            foreigner_data.append({'date': '', 'net_buy': 0})
        
        logger.info(f"[{symbol}] 외국인 순매매량 데이터: {len(foreigner_data)}일치")
        return foreigner_data
    except Exception as e:
        logger.error(f"[{symbol}] 외국인 데이터 오류: {e}")
        with open(f"debug_{symbol}.html", "w", encoding="utf-8") as f:
            f.write(response.text)
        logger.info(f"[{symbol}] HTML 저장: debug_{symbol}.html")
        return [{'date': '', 'net_buy': 0}] * 8


def main(event=None, context=None):
    """메인 실행 함수: Lambda 이벤트로 심볼 목록 처리"""
    try:
        symbols = event.get('symbols', None) if event else None
        stocks = [(s, get_stock_name_from_symbol(s)) for s in symbols] if symbols else get_stocks_from_db()
        if not stocks:
            logger.info("크롤링할 주식 목록이 없습니다.")
            return {"statusCode": 200, "body": []}
        logger.info(f"{len(stocks)}개의 주식 정보를 크롤링합니다.")
        results = []
        for symbol, name in stocks:
            logger.info(f"[{name}({symbol})] 외국인 순매매 데이터 크롤링 시작...")
            actual_stock_name = get_stock_name_from_symbol(symbol) or name
            if not actual_stock_name:
                logger.warning(f"[{name}({symbol})] 종목명 크롤링 실패. 데이터 저장 건너뜝.")
                results.append({"symbol": symbol, "status": "failed"})
                continue
            foreigner_data = get_foreigner_net_buy(symbol)
            
            # Only include daily-updated data
            market_data = {
                'symbol': symbol,
                'date': datetime.date.today().isoformat(),
                'stockName': actual_stock_name,
                'foreignerNetBuy': [data_item['net_buy'] for data_item in foreigner_data],
                'foreignerNetBuyDate': [data_item['date'].replace('.', '-') if data_item['date'] else '' for data_item in foreigner_data]
            }
            logger.info(f"크롤링 데이터: {market_data}")
            create_market_data(market_data)
            results.append({"symbol": symbol, "status": "success"})
        return {"statusCode": 200, "body": results}
    except Exception as e:
        logger.error(f"오류 발생: {e}")
        return {"statusCode": 500, "body": str(e)}

if __name__ == "__main__":
    main()