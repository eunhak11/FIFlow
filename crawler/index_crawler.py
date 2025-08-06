# crawler/index_crawler.py
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'python_libs'))

import requests
import datetime
import json
import logging
from botocore.exceptions import ClientError
from db import create_index_data

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_index_data(name):
    """네이버 금융에서 지수 데이터 크롤링"""
    url = "https://polling.finance.naver.com/api/realtime?query=SERVICE_INDEX:KOSPI,KOSDAQ,KPI200"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124'}
    for attempt in range(3):  # 3회 재시도
        try:
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            for area in data['result']['areas']:
                if area['name'] == 'SERVICE_INDEX':
                    for item in area['datas']:
                        if item['cd'] == name.upper():
                            return {
                                'name': item['cd'],
                                'value': float(item['nv'] / 100.0),
                                'change': float(item['cv'] / 100.0),
                                'changeRate': float(item['cr'])  # Number
                            }
            logger.warning(f"[{name}] 지수 데이터 없음")
            return None
        except (requests.exceptions.RequestException, json.JSONDecodeError, KeyError, TypeError) as e:
            logger.error(f"[{name}] 크롤링 오류 (시도 {attempt+1}/3): {e}")
            if attempt == 2:
                return None
    return None

def main(event=None, context=None):
    """Lambda 핸들러: 지수 데이터 크롤링 및 저장"""
    try:
        indices = event.get('indices', ['KOSPI', 'KOSDAQ', 'KPI200']) if event else ['KOSPI', 'KOSDAQ', 'KPI200']
        date = datetime.date.today().isoformat()
        results = []
        for name in indices:
            logger.info(f"[{name}] 지수 크롤링 시작...")
            index_data = get_index_data(name)
            if index_data:
                index_data['date'] = date
                logger.info(f"크롤링 데이터: {index_data}")
                create_index_data(index_data)
                results.append({"name": name, "status": "success"})
            else:
                logger.error(f"[{name}] 크롤링 실패")
                results.append({"name": name, "status": "failed"})
        return {"statusCode": 200, "body": json.dumps(results)}
    except Exception as e:
        logger.error(f"오류 발생: {e}")
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}

if __name__ == "__main__":
    main()