# crawler/get_stock_info.py
import requests
from bs4 import BeautifulSoup
import json
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_stock_info(symbol):
    """네이버 금융에서 종목명 크롤링"""
    url = f"https://finance.naver.com/item/main.naver?code={symbol}"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124'}
    for attempt in range(2):  # 2회 재시도
        try:
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'lxml')
            stock_name = soup.select_one("#middle > div.h_company > div.wrap_company > h2 > a").text.strip()
            if stock_name:
                logger.info(f"[{symbol}] 종목명: {stock_name}")
                return stock_name
            logger.warning(f"[{symbol}] 종목명 없음")
            return None
        except (requests.exceptions.RequestException, AttributeError) as e:
            logger.error(f"[{symbol}] 크롤링 오류 (시도 {attempt+1}/3): {e}")
            if attempt == 2:
                return None
    return None

def main(event=None, context=None):
    """Lambda 핸들러: 종목 정보 크롤링"""
    try:
        symbol = event.get('symbol', None) if event else None
        if not symbol:
            logger.error("종목 코드가 제공되지 않았습니다.")
            return {"statusCode": 400, "body": json.dumps({"error": "종목 코드가 제공되지 않았습니다."})}
        logger.info(f"[{symbol}] 종목 정보 크롤링 시작...")
        stock_name = get_stock_info(symbol)
        if stock_name:
            result = {"stockName": stock_name, "status": "success"}
            logger.info(f"크롤링 데이터: {result}")
            return {"statusCode": 200, "body": json.dumps(result)}
        logger.error(f"[{symbol}] 종목명 크롤링 실패")
        return {"statusCode": 404, "body": json.dumps({"error": "종목명을 찾을 수 없습니다."})}
    except Exception as e:
        logger.error(f"오류 발생: {e}")
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}

if __name__ == "__main__":
    main()