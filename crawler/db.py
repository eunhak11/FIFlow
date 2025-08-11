import boto3
from botocore.exceptions import ClientError
import datetime
from decimal import Decimal  # 추가

dynamodb = boto3.resource('dynamodb', region_name='ap-northeast-2')
table = dynamodb.Table('fiflow-users')

def create_market_data(data):
    item = {
        'PK': f'STOCK#{data["symbol"]}',
        'SK': f'MARKETDATA#{data["date"]}',
        'symbol_date': f'{data["symbol"]}_{data["date"]}',
        'symbol': data["symbol"],
        'date': data["date"],
        'price': int(data["price"]),
        'change': int(data["change"]),
        'changeRate': Decimal(str(data["changeRate"])),  # float -> Decimal
        'stockName': data["stockName"],
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
    item = {
        'PK': f'INDEX#{data["name"]}',
        'SK': f'DATA#{data["date"]}',
        'index_name_date': f'{data["name"]}_{data["date"]}',
        'name': data["name"],
        'value': Decimal(str(data["value"])),  # float -> Decimal
        'change': Decimal(str(data["change"])),  # float -> Decimal
        'changeRate': Decimal(str(data["changeRate"])),  # float -> Decimal
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