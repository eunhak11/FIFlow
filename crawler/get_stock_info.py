import sys
import requests
from bs4 import BeautifulSoup

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
            return stock_name_element.text.strip()
        else:
            # print(f"[{symbol}] 종목명을 찾을 수 없습니다.") # 이 메시지는 stdout으로 나가므로 제거
            return None
    except requests.exceptions.RequestException as e:
        # print(f"HTTP 요청 오류: {e}") # 이 메시지는 stdout으로 나가므로 제거
        return None
    except Exception as e:
        # print(f"데이터 파싱 오류: {e}") # 이 메시지는 stdout으로 나가므로 제거
        return None

if __name__ == "__main__":
    if len(sys.argv) > 1:
        symbol = sys.argv[1]
        stock_name = get_stock_name_from_symbol(symbol)
        if stock_name:
            print(stock_name)
        else:
            print("None") # 종목명을 찾지 못한 경우
    else:
        print("Usage: python get_stock_info.py <symbol>")