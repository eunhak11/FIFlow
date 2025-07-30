

import requests
from bs4 import BeautifulSoup
import datetime
import re
import mysql.connector
import json

# 데이터베이스 연결 정보 (config/config.json 기반)
DB_CONFIG = {
    'user': 'fiflowuser',
    'password': 'fiflowpw',
    'host': 'db',
    'database': 'fiflow',
    'raise_on_warnings': True
}

def get_stocks_from_db():
    """데이터베이스에서 주식 목록을 가져옵니다."""
    stocks = []
    try:
        cnx = mysql.connector.connect(**DB_CONFIG)
        cursor = cnx.cursor()
        query = "SELECT symbol, name FROM stocks"
        cursor.execute(query)
        stocks = cursor.fetchall()
        cursor.close()
        cnx.close()
    except mysql.connector.Error as err:
        print(f"데이터베이스 오류: {err}")
    return stocks

def get_market_data(symbol):
    """네이버 금융에서 특정 종목의 주가, 등락 정보를 크롤링합니다."""
    url = f"https://finance.naver.com/item/sise.naver?code={symbol}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'lxml')

        price = int(soup.select_one("#_nowVal").text.replace(",", ""))
        change_element = soup.select_one("#_diff")
        change_text = change_element.text.replace(",", "").strip()
        
        # 등락 부호(▲, ▼) 확인
        is_up = '상승' in change_element.find_previous(class_=re.compile(r"no_exday")).text
        
        change_value = re.search(r'\d+', change_text).group()
        change = int(change_value)
        if not is_up:
            change *= -1

        # 변동률 직접 계산
        # (현재가 - 전일종가) / 전일종가 * 100
        # 전일종가 = 현재가 - 변동
        previous_close = price - change
        change_rate = (change / previous_close) * 100 if previous_close != 0 else 0.0
        change_rate = f'{change_rate:.2f}' # 소수점 2자리까지 문자열로 포맷

        return {
            "price": int(price),
            "change": change,
            "changeRate": change_rate,
        }
    except requests.exceptions.RequestException as e:
        print(f"HTTP 요청 오류: {e}")
    except (AttributeError, IndexError, ValueError) as e:
        print(f"데이터 파싱 오류: {e}")
    return None

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
            print(f"[{symbol}] 종목명을 찾을 수 없습니다.")
            return None
    except requests.exceptions.RequestException as e:
        print(f"HTTP 요청 오류: {e}")
    except Exception as e:
        print(f"데이터 파싱 오류: {e}")
    return None

def get_foreigner_net_buy(symbol):
    """네이버 금융에서 외국인 순매매량 정보를 크롤링합니다."""
    url = f"https://finance.naver.com/item/frgn.naver?code={symbol}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'lxml')
        rows = soup.select("div.inner_sub table.type2 tr[onmouseover]")
        
        foreigner_net_buy = []
        for row in rows[:8]:
            try:
                net_buy_text = row.select('td')[6].text.strip().replace(",", "")
                foreigner_net_buy.append(int(net_buy_text))
            except (IndexError, ValueError):
                foreigner_net_buy.append(0)
        
        while len(foreigner_net_buy) < 8:
            foreigner_net_buy.append(0)
            
        return foreigner_net_buy
    except requests.exceptions.RequestException as e:
        print(f"HTTP 요청 오류: {e}")
    except (AttributeError, IndexError, ValueError) as e:
        print(f"데이터 파싱 오류: {e}")
    return [0] * 8

def save_market_data(data):
    """크롤링한 데이터를 데이터베이스에 저장합니다."""
    try:
        cnx = mysql.connector.connect(**DB_CONFIG)
        cursor = cnx.cursor()
        
        # ON DUPLICATE KEY UPDATE 문법을 최신 방식으로 수정
        query = ("""
        INSERT INTO MarketData (symbol, date, price, `change`, changeRate, stockName, foreignerNetBuy1, foreignerNetBuy2, foreignerNetBuy3, foreignerNetBuy4, foreignerNetBuy5, foreignerNetBuy6, foreignerNetBuy7, foreignerNetBuy8, createdAt, updatedAt)
        VALUES (%(symbol)s, %(date)s, %(price)s, %(change)s, %(changeRate)s, %(stockName)s, %(foreignerNetBuy1)s, %(foreignerNetBuy2)s, %(foreignerNetBuy3)s, %(foreignerNetBuy4)s, %(foreignerNetBuy5)s, %(foreignerNetBuy6)s, %(foreignerNetBuy7)s, %(foreignerNetBuy8)s, NOW(), NOW())
        AS new
        ON DUPLICATE KEY UPDATE
        price = new.price,
        `change` = new.change,
        changeRate = new.changeRate,
        stockName = new.stockName,
        foreignerNetBuy1 = new.foreignerNetBuy1,
        foreignerNetBuy2 = new.foreignerNetBuy2,
        foreignerNetBuy3 = new.foreignerNetBuy3,
        foreignerNetBuy4 = new.foreignerNetBuy4,
        foreignerNetBuy5 = new.foreignerNetBuy5,
        foreignerNetBuy6 = new.foreignerNetBuy6,
        foreignerNetBuy7 = new.foreignerNetBuy7,
        foreignerNetBuy8 = new.foreignerNetBuy8,
        updatedAt = NOW();
        """)
        
        cursor.execute(query, data)
        cnx.commit()
        print(f"{data['symbol']} 데이터 저장 성공")
        cursor.close()
        cnx.close()
    except mysql.connector.Error as err:
        print(f"데이터베이스 저장 오류: {err}")

if __name__ == "__main__":
    stocks = get_stocks_from_db()
    if not stocks:
        print("데이터베이스에서 주식 목록을 가져오지 못했습니다.")
    else:
        print(f"{len(stocks)}개의 주식 정보를 크롤링합니다.")
        for symbol, name in stocks:
            print(f"\n[{name}({symbol})] 크롤링 시작...")
            market_data = get_market_data(symbol)
            if market_data:
                # 네이버 금융에서 최신 종목명을 다시 크롤링하여 사용
                actual_stock_name = get_stock_name_from_symbol(symbol)
                if not actual_stock_name:
                    print(f"[{name}({symbol})] 종목명 크롤링 실패. 데이터 저장 건너뜀.")
                    continue

                foreigner_data = get_foreigner_net_buy(symbol)
                market_data['symbol'] = symbol
                market_data['date'] = str(datetime.date.today())
                market_data['stockName'] = actual_stock_name # 크롤링한 실제 종목명 사용
                for i, net_buy in enumerate(foreigner_data, 1):
                    market_data[f'foreignerNetBuy{i}'] = net_buy
                
                print("크롤링 데이터:", market_data)
                save_market_data(market_data)
            else:
                print(f"[{name}({symbol})] 크롤링 실패")
