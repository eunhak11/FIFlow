import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'python_libs'))

import requests
from bs4 import BeautifulSoup
import sys
import json

def get_stock_name_from_symbol(symbol):
    """네이버 금융에서 종목 코드를 통해 종목명을 크롤링합니다."""
    url = f"https://finance.naver.com/item/main.naver?code={symbol}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'lxml')
        stock_name_element = soup.select_one("#middle > div.h_company > div.wrap_company > h2 > a")
        if stock_name_element:
            stock_name = stock_name_element.text.strip()
            return stock_name
        else:
            return None
    except requests.exceptions.RequestException as e:
        print(f"HTTP 요청 오류: {e}", file=sys.stderr)
    except Exception as e:
        print(f"데이터 파싱 오류: {e}", file=sys.stderr)
    return None

if __name__ == "__main__":
    if len(sys.argv) > 1:
        symbol = sys.argv[1]
        stock_name = get_stock_name_from_symbol(symbol)
        if stock_name:
            print(json.dumps({"stockName": stock_name}))
        else:
            print(json.dumps({"error": "종목명을 찾을 수 없습니다."}), file=sys.stderr)
    else:
        print(json.dumps({"error": "종목 코드가 제공되지 않았습니다."}), file=sys.stderr)
