# /crawler/db.py
import boto3
from botocore.exceptions import ClientError
import datetime
from decimal import Decimal
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

dynamodb = boto3.resource('dynamodb', region_name='ap-northeast-2')
table = dynamodb.Table('fiflow-users')

def create_market_data(data):
    item = {
        'PK': f'STOCK#{data["symbol"]}',
        'SK': f'MARKETDATA#{data["date"]}',
        'symbol_date': f'{data["symbol"]}_{data["date"]}',
        'symbol': data["symbol"],
        'date': data["date"],
        
        'stockName': data["stockName"],
        'foreignerNetBuy': [int(x) for x in data.get("foreignerNetBuy", [0] * 8)],
        'foreignerNetBuyDate': data.get("foreignerNetBuyDate", [''] * 8),
        'createdAt': datetime.datetime.utcnow().isoformat() + 'Z',
        'updatedAt': datetime.datetime.utcnow().isoformat() + 'Z'
    }
    try:
        table.put_item(Item=item)
        logger.info(f"MarketData 저장 성공: {data['symbol']}_{data['date']}")
        return {"status": "success", "symbol": data["symbol"], "date": data["date"]}
    except ClientError as e:
        logger.error(f"MarketData 저장 오류: {e}")
        raise e

def update_index_data(data):
    item = {
        'PK': f'INDEX#{data["name"]}',
        'SK': 'DATA',
        'name': data["name"],
        'value': Decimal(str(data["value"])),
        'change': Decimal(str(data["change"])),
        'changeRate': Decimal(str(data["changeRate"])),
        'createdAt': datetime.datetime.utcnow().isoformat() + 'Z',
        'updatedAt': datetime.datetime.utcnow().isoformat() + 'Z'
    }
    try:
        # 처음 항목 생성 시 createdAt 유지
        response = table.update_item(
            Key={
                'PK': f'INDEX#{data["name"]}',
                'SK': 'DATA'
            },
            UpdateExpression="SET #n = :n, #v = :v, #chg = :chg, #chgRate = :chgRate, #updatedAt = :updatedAt, #createdAt = if_not_exists(#createdAt, :createdAt)",
            ExpressionAttributeNames={
                '#n': 'name',
                '#v': 'value',
                '#chg': 'change',
                '#chgRate': 'changeRate',
                '#createdAt': 'createdAt',
                '#updatedAt': 'updatedAt'
            },
            ExpressionAttributeValues={
                ':n': data["name"],
                ':v': Decimal(str(data["value"])),
                ':chg': Decimal(str(data["change"])),
                ':chgRate': Decimal(str(data["changeRate"])),
                ':createdAt': datetime.datetime.utcnow().isoformat() + 'Z',
                ':updatedAt': datetime.datetime.utcnow().isoformat() + 'Z'
            },
            ReturnValues="UPDATED_NEW"
        )
        logger.info(f"IndexData 업데이트 성공: {data['name']}")
        return {"status": "success", "name": data["name"]}
    except ClientError as e:
        logger.error(f"IndexData 업데이트 오류: {e}")
        raise e