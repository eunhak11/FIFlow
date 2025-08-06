# crawler/db.py
import boto3
from botocore.exceptions import ClientError
import datetime
from decimal import Decimal

# DynamoDB 리소스 초기화 (서울 리전)
dynamodb = boto3.resource('dynamodb', region_name='ap-northeast-2')
table = dynamodb.Table('fiflow-users')

def create_market_data(data):
    # MarketData 저장: 데이터 타입 명확히 처리
    item = {
        'PK': f'STOCK#{data["symbol"]}',  # String
        'SK': f'MARKETDATA#{data["date"]}',  # String
        'symbol_date': f'{data["symbol"]}_{data["date"]}',  # String (GSI)
        'symbol': data["symbol"],  # String
        'date': data["date"],  # String
        'price': int(data["price"]),
        'change': int(data["change"]),
        'changeRate': Decimal(str(data["changeRate"])),
        'stockName': data["stockName"],  # String
        'foreignerNetBuy': [int(x) for x in data.get("foreignerNetBuy", [0] * 8)],
        'foreignerNetBuyDate': data.get("foreignerNetBuyDate", [''] * 8),
        'createdAt': datetime.datetime.utcnow().isoformat() + 'Z',
        'updatedAt': datetime.datetime.utcnow().isoformat() + 'Z'
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
        'index_name_date': f'{data["name"]}_{data["date"]}',  # String (GSI)
        'name': data["name"],
        'value': Decimal(str(data["value"])),
        'change': Decimal(str(data["change"])),
        'changeRate': Decimal(str(data["changeRate"])),
        'date': data["date"],
        'createdAt': datetime.datetime.utcnow().isoformat() + 'Z',
        'updatedAt': datetime.datetime.utcnow().isoformat() + 'Z'
    }
    try:
        table.put_item(Item=item)
        print(f"IndexData 저장 성공: {data['name']}_{data['date']}")
        return {"status": "success", "name": data["name"], "date": data["date"]}
    except ClientError as e:
        print(f"IndexData 저장 오류: {e}")
        raise e

def get_market_data(symbol, date):
    # MarketData 조회: GSI 사용
    try:
        response = table.query(
            IndexName='market-data-index',
            KeyConditionExpression='symbol_date = :sd',
            ExpressionAttributeValues={
                ':sd': f'{symbol}_{date}'
            }
        )
        return response.get('Items', [])
    except ClientError as e:
        print(f"MarketData 조회 오류: {e}")
        raise e

def get_index_data(name, date):
    # IndexData 조회: GSI 사용
    try:
        response = table.query(
            IndexName='index-data-index',
            KeyConditionExpression='index_name_date = :ind',
            ExpressionAttributeValues={
                ':ind': f'{name}_{date}'
            }
        )
        return response.get('Items', [])
    except ClientError as e:
        print(f"IndexData 조회 오류: {e}")
        raise e