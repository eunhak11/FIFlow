

import requests
from bs4 import BeautifulSoup
import datetime
import re
import mysql.connector

# 데이터베이스 연결 정보 (config/config.json 기반)
DB_CONFIG = {
    'user': 'fiflowuser',
    'password': 'fiflowpw',
    'host': 'db',
    'database': 'fiflow',
    'raise_on_warnings': True
}

def get_stocks_from_db(cnx):
    """데이터베이스에서 주식 목록을 가져옵니다."""
    stocks = []
    try:
        cursor = cnx.cursor()
        query = "SELECT symbol, name FROM stocks"
        cursor.execute(query)
        stocks = cursor.fetchall()
        cursor.close()
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
        change_text = soup.select_one("#_diff").text.strip().replace(",", "")
        change_rate_text = soup.select_one("#_rate").text.strip().replace("%", "")

        # 등락 부호(▲, ▼) 또는 '보합' 텍스트로 상승/하락/보합 판단
        change_element_wrapper = soup.select_one("p.no_exday")
        
        change = 0
        if '상승' in change_element_wrapper.text:
            change = int(re.search(r'\d+', change_text).group())
        elif '하락' in change_element_wrapper.text:
            change = -int(re.search(r'\d+', change_text).group())
        
        change_rate = float(change_rate_text)

        return {
            "price": price,
            "change": change,
            "changeRate": f'{change_rate:.2f}',
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
    """네이버 금융에서 외국인 순매매량 및 날짜 정보를 크롤링합니다."""
    url = f"https://finance.naver.com/item/frgn.naver?code={symbol}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'lxml')
        rows = soup.select("div.inner_sub table.type2 tr[onmouseover]")
        
        foreigner_data = []
        for row in rows[:8]: # 최근 8일치 데이터
            try:
                date_text = row.select('td')[0].text.strip() # 날짜
                net_buy_text = row.select('td')[6].text.strip().replace(",", "") # 순매매량
                foreigner_data.append({'date': date_text, 'net_buy': int(net_buy_text)})
            except (IndexError, ValueError):
                # 데이터 파싱 오류 시 해당 날짜는 0으로 처리
                foreigner_data.append({'date': '', 'net_buy': 0})
        
        # 데이터가 8개 미만일 경우 0으로 채움
        while len(foreigner_data) < 8:
            foreigner_data.append({'date': '', 'net_buy': 0})
            
        return foreigner_data
    except requests.exceptions.RequestException as e:
        print(f"HTTP 요청 오류: {e}")
    except (AttributeError, IndexError, ValueError) as e:
        print(f"데이터 파싱 오류: {e}")
    return [{'date': '', 'net_buy': 0}] * 8

def save_market_data(cnx, data):
    """크롤링한 데이터를 데이터베이스에 저장합니다."""
    try:
        cursor = cnx.cursor()
        
        query = ("""
        INSERT INTO MarketData (symbol, date, price, `change`, changeRate, stockName, foreignerNetBuy1, foreignerNetBuy2, foreignerNetBuy3, foreignerNetBuy4, foreignerNetBuy5, foreignerNetBuy6, foreignerNetBuy7, foreignerNetBuy8, foreignerNetBuyDate1, foreignerNetBuyDate2, foreignerNetBuyDate3, foreignerNetBuyDate4, foreignerNetBuyDate5, foreignerNetBuyDate6, foreignerNetBuyDate7, foreignerNetBuyDate8, createdAt, updatedAt)
        VALUES (%(symbol)s, %(date)s, %(price)s, %(change)s, %(changeRate)s, %(stockName)s, %(foreignerNetBuy1)s, %(foreignerNetBuy2)s, %(foreignerNetBuy3)s, %(foreignerNetBuy4)s, %(foreignerNetBuy5)s, %(foreignerNetBuy6)s, %(foreignerNetBuy7)s, %(foreignerNetBuy8)s, %(foreignerNetBuyDate1)s, %(foreignerNetBuyDate2)s, %(foreignerNetBuyDate3)s, %(foreignerNetBuyDate4)s, %(foreignerNetBuyDate5)s, %(foreignerNetBuyDate6)s, %(foreignerNetBuyDate7)s, %(foreignerNetBuyDate8)s, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
        price = VALUES(price),
        `change` = VALUES(`change`),
        changeRate = VALUES(changeRate),
        stockName = VALUES(stockName),
        foreignerNetBuy1 = VALUES(foreignerNetBuy1),
        foreignerNetBuy2 = VALUES(foreignerNetBuy2),
        foreignerNetBuy3 = VALUES(foreignerNetBuy3),
        foreignerNetBuy4 = VALUES(foreignerNetBuy4),
        foreignerNetBuy5 = VALUES(foreignerNetBuy5),
        foreignerNetBuy6 = VALUES(foreignerNetBuy6),
        foreignerNetBuy7 = VALUES(foreignerNetBuy7),
        foreignerNetBuy8 = VALUES(foreignerNetBuy8),
        foreignerNetBuyDate1 = VALUES(foreignerNetBuyDate1),
        foreignerNetBuyDate2 = VALUES(foreignerNetBuyDate2),
        foreignerNetBuyDate3 = VALUES(foreignerNetBuyDate3),
        foreignerNetBuyDate4 = VALUES(foreignerNetBuyDate4),
        foreignerNetBuyDate5 = VALUES(foreignerNetBuyDate5),
        foreignerNetBuyDate6 = VALUES(foreignerNetBuyDate6),
        foreignerNetBuyDate7 = VALUES(foreignerNetBuyDate7),
        foreignerNetBuyDate8 = VALUES(foreignerNetBuyDate8),
        updatedAt = NOW();
        """)
        
        cursor.execute(query, data)
        cnx.commit()
        print(f"{data['symbol']} 데이터 저장 성공")
        cursor.close()
    except mysql.connector.Error as err:
        print(f"데이터베이스 저장 오류: {err}")

def main():
    """메인 실행 함수"""
    cnx = None
    try:
        cnx = mysql.connector.connect(**DB_CONFIG)
        print("데이터베이스 연결 성공")
        
        stocks = get_stocks_from_db(cnx)
        if not stocks:
            print("데이터베이스에서 주식 목록을 가져오지 못했습니다.")
            return

        print(f"{len(stocks)}개의 주식 정보를 크롤링합니다.")
        for symbol, name in stocks:
            print(f"\n[{name}({symbol})] 크롤링 시작...")
            market_data = get_market_data(symbol)
            
            if market_data:
                actual_stock_name = get_stock_name_from_symbol(symbol)
                if not actual_stock_name:
                    print(f"[{name}({symbol})] 종목명 크롤링 실패. 데이터 저장 건너뜀.")
                    continue

                foreigner_data = get_foreigner_net_buy(symbol)
                market_data['symbol'] = symbol
                market_data['date'] = str(datetime.date.today())
                market_data['stockName'] = actual_stock_name
                for i, data_item in enumerate(foreigner_data, 1):
                    market_data[f'foreignerNetBuy{i}'] = data_item['net_buy']
                    market_data[f'foreignerNetBuyDate{i}'] = data_item['date']
                
                print("크롤링 데이터:", market_data)
                save_market_data(cnx, market_data)
            else:
                print(f"[{name}({symbol})] 크롤링 실패")

    except mysql.connector.Error as err:
        print(f"데이터베이스 연결 오류: {err}")
    finally:
        if cnx and cnx.is_connected():
            cnx.close()
            print("데이터베이스 연결 종료")

if __name__ == "__main__":
    main()
