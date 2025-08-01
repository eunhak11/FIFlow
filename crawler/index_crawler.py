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
    'host': 'db',  # Docker 컨테이너 내에서 실행되므로 db 서비스명 사용
    'database': 'fiflow',
    'raise_on_warnings': True
}

def save_index_data(data):
    """크롤링한 지수 데이터를 데이터베이스에 저장합니다."""
    try:
        cnx = mysql.connector.connect(**DB_CONFIG)
        cursor = cnx.cursor()
        
        query = """
        INSERT INTO IndexData (name, value, `change`, changeRate, date, createdAt, updatedAt)
        VALUES (%(name)s, %(value)s, %(change)s, %(changeRate)s, %(date)s, NOW(), NOW()) AS new_data
        ON DUPLICATE KEY UPDATE
        value = new_data.value,
        `change` = new_data.change,
        changeRate = new_data.changeRate,
        updatedAt = NOW();
        """
        
        cursor.execute(query, data)
        cnx.commit()
        print(f"{data['name']} 데이터 저장 성공")
        cursor.close()
        cnx.close()
    except mysql.connector.Error as err:
        print(f"데이터베이스 저장 오류: {err}")

def get_index_data():
    """네이버 금융에서 국내 지수 데이터를 가져옵니다."""
    url = "https://polling.finance.naver.com/api/realtime?query=SERVICE_INDEX:KOSPI,KOSDAQ,KPI200"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        # 응답이 순수 JSON이므로 바로 파싱
        data = response.json()
        
        indices = []
        
        # SERVICE_INDEX 데이터 찾기
        service_index_data = None
        for area in data['result']['areas']:
            if area['name'] == 'SERVICE_INDEX':
                service_index_data = area['datas']
                break
        
        if service_index_data:
            for item in service_index_data:
                name = item['cd']
                value = item['nv'] / 100.0
                change = item['cv'] / 100.0
                change_rate = item['cr']
                
                indices.append({
                    'name': name,
                    'value': float(value),
                    'change': float(change),
                    'changeRate': f'{change_rate:.2f}',
                    'date': str(datetime.date.today())
                })
            
        return indices

    except requests.exceptions.RequestException as e:
        print(f"HTTP 요청 오류: {e}")
    except (json.JSONDecodeError, KeyError, TypeError) as e:
        print(f"데이터 파싱 오류: {e}")
    return None

if __name__ == "__main__":
    index_data_list = get_index_data()
    if index_data_list:
        for index_data in index_data_list:
            print("크롤링 데이터:", index_data)
            save_index_data(index_data)
    else:
        print("지수 정보를 가져오지 못했습니다.")
