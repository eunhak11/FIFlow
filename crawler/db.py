# crawler/db.py
import boto3
from botocore.exceptions import ClientError
import datetime

# DynamoDB 리소스 초기화 (서울 리전)
dynamodb = boto3.resource('dynamodb', region_name='ap-northeast-2')
table = dynamodb.Table('fiflow-users')

def create_market_data(data):
    # MarketData 저장: foreignerNetBuy/Date를 리스트로 통합, 데이터 타입 명확히 처리
    item = {
        'PK': f'STOCK#{data["symbol"]}',  # String
        'SK': f'MARKETDATA#{data["date"]}',  # String
        'symbol_date': f'{data["symbol"]}_{data["date"]}',  # String
        'symbol': data["symbol"],  # String
        'date': data["date"],  # String
        'price': int(data["price"]),  # Number (정수)
        'change': int(data["change"]),  # Number (정수)
        'changeRate': float(data["changeRate"]),  # Number (소수점)
        'stockName': data["stockName"],  # String
        'foreignerNetBuy': [int(x) for x in data.get("foreignerNetBuy", [0] * 8)],  # List of Numbers
        'foreignerNetBuyDate': data.get("foreignerNetBuyDate", [''] * 8),  # List of Strings
        'createdAt': datetime.datetime.utcnow().isoformat() + 'Z',  # String
        'updatedAt': datetime.datetime.utcnow().isoformat() + 'Z'  # String
    }
    try:
        table.put_item(Item=item)
        print(f"MarketData 저장 성공: {data['symbol']}_{data['date']}")
        return {"status": "success", "symbol": data["symbol"], "date": data["date"]}
    except ClientError as e:
        print(f"MarketData 저장 오류: {e}")
        raise e

def create_index_data(data):
    # IndexData 저장: 데이터 타입 명확히 처리
    item = {
        'PK': f'INDEX#{data["name"]}',  # String
        'SK': f'DATA#{data["date"]}',  # String
        'index_name_date': f'{data["name"]}_{data["date"]}',  # String
        'name': data["name"],  # String
        'value': float(data["value"]),  # Number
        'change': float(data["change"]),  # Number
        'changeRate': float(data["changeRate"]),  # Number
        'date': data["date"],  # String
        'createdAt': datetime.datetime.utcnow().isoformat() + 'Z',  # String
        'updatedAt': datetime.datetime.utcnow().isoformat() + 'Z'  # String
    }
    try:
        table.put_item(Item=item)
        print(f"IndexData 저장 성공: {data['name']}_{data['date']}")
        return {"status": "success", "name": data["name"], "date": data["date"]}
    except ClientError as e:
        print(f"IndexData 저장 오류: {e}")
        raise e

def get_market_data(symbol, date):
    # MarketData 조회
    try:
        response = table.query(
            KeyConditionExpression='PK = :pk AND SK = :sk',
            ExpressionAttributeValues={
                ':pk': f'STOCK#{symbol}',
                ':sk': f'MARKETDATA#{date}'
            }
        )
        return response.get('Items', [])
    except ClientError as e:
        print(f"MarketData 조회 오류: {e}")
        raise e