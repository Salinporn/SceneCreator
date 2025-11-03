from decimal import Decimal
from io import BytesIO
from django.http.multipartparser import MultiPartParser
from django.http import QueryDict
from decimal import Decimal, InvalidOperation
from zodb.zodb_management import *
import json

def calculate_total_price(root, cart_items):
    total = Decimal('0')
    for item in cart_items:
        product = root.products[item.product_id]
        if item.type == 'digital':
            item.unit_price = product.get_digital_price()
        elif item.type == 'physical':
            item.unit_price = product.get_physical_price()
        item.save()
        total += Decimal(item.quantity) * Decimal(item.unit_price)
    return total

def parse_request_body(request):
    content_type = (request.content_type or '').lower()
    # JSON
    if content_type.startswith('application/json'):
        try:
            return json.loads(request.body.decode('utf-8') or '{}')
        except Exception:
            return {}

    # multipart/form-data
    if content_type.startswith('multipart/form-data'):
        try:
            parser = MultiPartParser(request.META, BytesIO(request.body), request.upload_handlers)
            data, files = parser.parse()
            return data
        except Exception:
            return {}

    # x-www-form-urlencoded or raw querystring
    try:
        return QueryDict(request.body.decode('utf-8'), encoding='utf-8')
    except Exception:
        return {}
    
def to_decimal(value, default='0'):
    if isinstance(value, Decimal):
        return value
    if value is None:
        return Decimal(default)
    value_str = str(value).strip()
    if value_str == '':
        return Decimal(default)
    try:
        return Decimal(value_str)
    except (InvalidOperation, ValueError, TypeError):
        return Decimal(default)