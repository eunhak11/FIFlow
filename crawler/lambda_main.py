import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'python_libs'))

import requests
from bs4 import BeautifulSoup
import datetime
import re
import boto3
from botocore.exceptions import ClientError
import logging
import json
import traceback
from db import create_market_data

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_stocks_from_db():
    """DynamoDB에서 주식 목록 조회"""
    try:
        dynamodb = boto3.resource('dynamodb', region_name='ap-northeast-2')
        table = dynamodb.Table('fiflow-users')
        response = table.scan(
            FilterExpression='SK BEGINS_WITH :sk',
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

def get_market_data(symbol):
    """네이버 금융에서 주가, 등락 정보 크롤링, 데이터 타입 처리"""
    url = f"https://finance.naver.com/item/sise.naver?code={symbol}"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124'}
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'lxml')
        price = int(soup.select_one("#_nowVal").text.replace(",", ""))
        change_text = soup.select_one("#_diff").text.strip().replace(",", "")
        change_rate_text = soup.select_one("#_rate").text.strip().replace("%", "")
        change = 0
        if '상승' in soup.select_one("p.no_exday").text:
            change = int(re.search(r'\d+', change_text).group())
        elif '하락' in soup.select_one("p.no_exday").text:
            change = -int(re.search(r'\d+', change_text).group())
        change_rate = float(change_rate_text)
        logger.info(f"[{symbol}] 주가 데이터 크롤링 성공: price={price}, change={change}, changeRate={change_rate}")
        return {
            "price": price,
            "change": change,
            "changeRate": change_rate
        }
    except Exception as e:
        print(f"[{symbol}] 크롤링 오류: {e}")
        return None

def get_stock_name_from_symbol(symbol):
    """종목명 크롤링"""
    url = f"https://finance.naver.com/item/main.naver?code={symbol}"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124'}
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'lxml')
        stock_name = soup.select_one("#middle > div.h_company > div.wrap_company > h2 > a").text.strip()
        logger.info(f"[{symbol}] 종목명: {stock_name}")
        return stock_name or None
    except Exception as e:
        logger.error(f"[{symbol}] 종목명 오류: {e}")
        return None

def get_foreigner_net_buy(symbol):
    """외국인 순매매량 및 날짜 크롤링 (초기 버전)"""
    url = f"https://finance.naver.com/item/frgn.naver?code={symbol}"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124'}
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'lxml')
        rows = soup.select("div.inner_sub table.type2 tr[onmouseover]")[:8]
        foreigner_data = []
        for row in rows:
            date = row.select('td')[0].text.strip()
            net_buy = int(row.select('td')[6].text.strip().replace(",", "") or 0)
            foreigner_data.append({'date': date, 'net_buy': net_buy})
        while len(foreigner_data) < 8:
            foreigner_data.append({'date': '', 'net_buy': 0})
        logger.info(f"[{symbol}] 외국인 순매매량 데이터: {len(foreigner_data)}일치")
        return foreigner_data
    except Exception as e:
        logger.error(f"[{symbol}] 외국인 데이터 오류: {e}")
        return [{'date': '', 'net_buy': 0} for _ in range(8)]

def main(event=None, context=None):
    """메인 실행 함수: Lambda 이벤트로 심볼 목록 처리"""
    try:
        symbols = event.get('symbols', None) if event else None
        stocks = [(s, get_stock_name_from_symbol(s)) for s in symbols] if symbols else get_stocks_from_db()
        if not stocks:
            logger.info("크롤링할 주식 목록이 없습니다.")
            return {"statusCode": 200, "body": json.dumps([])}
        logger.info(f"{len(stocks)}개의 주식 정보를 크롤링합니다.")
        results = []
        for symbol, name in stocks:
            logger.info(f"[{name}({symbol})] 크롤링 시작...")
            market_data = get_market_data(symbol)
            if market_data:
                actual_stock_name = get_stock_name_from_symbol(symbol) or name
                if not actual_stock_name:
                    logger.warning(f"[{name}({symbol})] 종목명 크롤링 실패. 데이터 저장 건너뜝.")
                    results.append({"symbol": symbol, "status": "failed"})
                    continue
                foreigner_data = get_foreigner_net_buy(symbol)
                market_data['symbol'] = symbol
                market_data['date'] = datetime.date.today().isoformat()
                market_data['stockName'] = actual_stock_name
                market_data['foreignerNetBuy'] = [data_item['net_buy'] for data_item in foreigner_data]
                market_data['foreignerNetBuyDate'] = [data_item['date'].replace('.', '-') if data_item['date'] else '' for data_item in foreigner_data]
                logger.info(f"크롤링 데이터: {market_data}")
                create_market_data(market_data)
                results.append({"symbol": symbol, "status": "success"})
            else:
                logger.error(f"[{name}({symbol})] 크롤링 실패")
                results.append({"symbol": symbol, "status": "failed"})
        return {"statusCode": 200, "body": json.dumps(results)}
    except Exception as e:
        logger.error(f"오류 발생: {e}")
        traceback.print_exc()
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}

if __name__ == "__main__":
    main()
