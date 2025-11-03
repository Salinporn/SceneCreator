from io import BytesIO
from django.http.multipartparser import MultiPartParser
from django.http import QueryDict
import json


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


def build_user_profile(user):
    profile = {
        'username': getattr(user, 'username', None),
        'first_name': getattr(user, 'first_name', None),
        'last_name': getattr(user, 'last_name', None),
        'is_admin': getattr(user, 'is_admin', False),
        'is_staff': getattr(user, 'is_staff', False),
    }

    if hasattr(user, 'customer'):
        customer = user.customer
        profile.update({
            'email': getattr(customer, 'email', None),
            'phone_no': getattr(customer, 'phone_no', None),
            'gender': getattr(customer, 'gender', None),
            'date_of_birth': getattr(customer, 'date_of_birth', None),
            'profile_pic': getattr(customer, 'profile_pic', None),
        })
    elif hasattr(user, 'staff'):
        staff = user.staff
        profile.update({'email': getattr(staff, 'email', None)})

    return profile    