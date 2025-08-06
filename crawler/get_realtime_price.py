import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'python_libs'))

import requests
import json
import re

def get_realtime_price(symbol):
    """네이버 금융의 내부 API를 호출하여 실시간 시세를 가져옵니다."""
    url = f"https://polling.finance.naver.com/api/realtime?query=SERVICE_ITEM:{symbol}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': f'https://finance.naver.com/item/sise.naver?code={symbol}'
    }
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        # API 응답이 순수 JSON이므로, 바로 파싱합니다.
        data = response.json()
        stock_data = data['result']['areas'][0]['datas'][0]
        
        return {
            'price': stock_data['nv'], # 현재가
            'change': stock_data['cv'], # 전일대비
            'changeRate': stock_data['cr']  # 등락률
        }

    except (requests.exceptions.RequestException, json.JSONDecodeError, KeyError, IndexError) as e:
        return {"error": str(e)}

def main(event, context):
    """Lambda 핸들러"""
    symbol = event.get('queryStringParameters', {}).get('symbol')
    if not symbol:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Symbol parameter is required'})
        }
    
    price_data = get_realtime_price(symbol)
    
    if 'error' in price_data:
        return {
            'statusCode': 500,
            'body': json.dumps(price_data)
        }
        
    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*', # CORS 허용
            'Access-Control-Allow-Credentials': True,
        },
        'body': json.dumps(price_data)
    }
