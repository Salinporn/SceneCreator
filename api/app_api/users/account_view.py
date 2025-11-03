from datetime import timedelta
from django.utils import timezone
from django.core import signing
from django.http import JsonResponse
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.db import transaction
from .models import Staff, User, Customer
from app_api.carts.models import Cart
from django.utils.dateparse import parse_date
from .funcHelper import *
import base64

# Account Management
# User(Customer) Registration
@csrf_exempt
@require_http_methods(["POST"])
def register(request):
    username = request.POST['username']
    password = request.POST['password']
    first_name = request.POST['first_name']
    last_name = request.POST['last_name']
    email = request.POST['email'].lower()
    phone_no = request.POST['phone_no']


    with transaction.atomic():
        user = User.objects.create_user(
            username=username,
            password=password,
            first_name=first_name,
            last_name=last_name
        )

        Customer.objects.create(
            user=user,
            email=email,
            phone_no=phone_no,
            address=[],
            owned_digital_products=[],
            purchased_history=[],
            credit_cards=[],
            bank_accounts=[],
            wishlist=[],
            cart_id=None
        )
        
        cart = Cart.objects.create(
            customer=user.customer,
            items=[]
        )

        user.customer.cart_id = cart.id
        user.customer.save()

    response = JsonResponse({'message': 'User registered successfully'}, status=201)
    response.set_cookie(
        'username', 
        username, 
        max_age=60*60*24*30, 
        httponly=True, 
        secure=False
    )
    return response

# Admin Registration
@csrf_exempt
@require_http_methods(["POST"])
def register_admin(request):
    username = request.POST['username']
    password = request.POST['password']
    first_name = request.POST['first_name']
    last_name = request.POST['last_name']

    if User.objects.filter(username=username).exists():
        return JsonResponse({'error': 'Username already exists'}, status=409)

    User.objects.create_superuser(
        username=username,
        password=password,
        first_name=first_name,
        last_name=last_name
    )

    return JsonResponse({'message': 'Admin user registered successfully'}, status=201)

# Staff Registration
@csrf_exempt
@require_http_methods(["POST"])
def register_staff(request):
    username = request.POST['username']
    password = request.POST['password']
    first_name = request.POST['first_name']
    last_name = request.POST['last_name']
    email = request.POST['email'].lower()

    if User.objects.filter(username=username).exists():
        return JsonResponse({'error': 'Username already exists'}, status=409)

    with transaction.atomic():
        user = User.objects.create_staffuser(
            username=username,
            password=password,
            first_name=first_name,
            last_name=last_name
        )

        Staff.objects.create(
            user=user,
            email=email
        )

    return JsonResponse({'message': 'Staff user registered successfully'}, status=201)

# Login
@csrf_exempt
@require_http_methods(["POST"])
def login_view(request):
    if hasattr(request, 'user') and request.user.is_authenticated:
        return JsonResponse({'error': 'Already logged in'}, status=403)

    identifier = request.POST['identifier']
    password = request.POST['password']

    if not identifier or not password:
        return JsonResponse({'error': 'username/email and password required'}, status=400)

    user = authenticate(request, username=identifier, password=password)

    if user is None and '@' in identifier:
        user_object = None
        try:
            user_object = Customer.objects.get(email=identifier.lower())
        except Customer.DoesNotExist:
            try:
                user_object = Staff.objects.get(email=identifier.lower())
            except Staff.DoesNotExist:
                user_object = None
        if user_object is not None:
            user = authenticate(request, username=user_object.user.username, password=password)

    if user is not None:
        auth_login(request, user)
        response = JsonResponse({
            'message': 'Login successful',
            'is_admin': getattr(user, 'is_admin', False),
            'is_staff': getattr(user, 'is_staff', False)
        }, status=200)
        response.set_cookie(
            'username',
            getattr(user, 'username'),
            max_age=60*60*24*30,
            httponly=True,
            secure=False
        )
        return response
    else:
        return JsonResponse({'error': 'Invalid credentials'}, status=401)

# Check Login Status
@require_http_methods(["GET"])
def is_logged_in(request):
    if hasattr(request, 'user') and request.user.is_authenticated:
        return JsonResponse({'logged_in': True, 'username': getattr(request.user, 'username', None)})
    username = request.COOKIES.get('username')
    if username:
        return JsonResponse({'logged_in': False, 'username': username})
    return JsonResponse({'logged_in': False, 'username': None})

@login_required
@require_http_methods(["GET"])
def get_login_token(request):
    user = request.user

    expires_at = (timezone.now() + timedelta(minutes=1)).timestamp()

    data = {
        "user_id": user.id,
        "username": user.username,
        "exp": expires_at
    }

    signer = signing.TimestampSigner(salt="cross-domain-login")
    token = signer.sign_object(data)

    return JsonResponse({
        "token": token,
        "expires_in": 60,  # seconds
        "username": user.username
    })
    
def scene_creator_login(request, user):
    auth_login(request, user)
    response = JsonResponse({
            'message': 'Login successful',
            'username': user.username,
            'user_id': user.id,
            'is_admin': getattr(user, 'is_admin', False),
            'is_staff': getattr(user, 'is_staff', False),
            'session_key': request.session.session_key  # Return session key
        }, status=200)
        
    response.set_cookie(
        'sessionid',
        request.session.session_key,
        max_age=60*60*24*30,
        httponly=True,
        secure=False,
        samesite='Lax',
        path='/'
    )

    return response

@csrf_exempt
@require_http_methods(["POST"])
def verify_login_token(request):
    token = request.POST.get("token")
    if not token:
        return JsonResponse({"error": "Token required"}, status=400)

    signer = signing.TimestampSigner(salt="cross-domain-login")

    try:
        data = signer.unsign_object(token, max_age=60)
        user = User.objects.get(id=data["user_id"])
        return scene_creator_login(request, user)
        
    except signing.SignatureExpired:
        return JsonResponse({"error": "Token expired"}, status=401)
    except signing.BadSignature:
        return JsonResponse({"error": "Invalid token"}, status=403)
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)

# Logout
@csrf_exempt
@require_http_methods(["DELETE"])
def logout_view(request):
    auth_logout(request)
    response = JsonResponse({'message': 'Logged out successfully'}, status=200)
    response.delete_cookie('username')
    response.delete_cookie('sessionid')
    response.delete_cookie('csrftoken')
    return response

# Delete User
@csrf_exempt
@require_http_methods(["DELETE"])
@login_required
def delete_user(request):
    user = request.user
    try:
        if hasattr(user, 'staff'):
            user.staff.delete()
        elif hasattr(user, 'customer'):
            user.customer.delete()
    except (Staff.DoesNotExist, Customer.DoesNotExist):
        pass

    user.delete()
    auth_logout(request)
    response = JsonResponse({'message': 'User deleted successfully'}, status=200)
    response.delete_cookie('username')
    response.delete_cookie('sessionid')
    response.delete_cookie('csrftoken')
    return response

# Get User Profile
@require_http_methods(["GET"])
@login_required
def get_users_profile(request):
    return JsonResponse({'user_profile': build_user_profile(request.user)}, status=200)

# Update User Profile
@csrf_exempt
@require_http_methods(["PUT"])
@login_required
def update_user_profile(request):
    put_data = parse_request_body(request)

    user = request.user
    new_firstname = put_data.get('first_name')
    new_lastname = put_data.get('last_name')
    new_email = put_data.get('email')
    new_phone_no = put_data.get('phone_no')
    new_gender = put_data.get('gender')
    new_date_of_birth = put_data.get('date_of_birth')
    username = put_data.get('username')

    # parse date if provided as string
    if isinstance(new_date_of_birth, str):
        parsed = parse_date(new_date_of_birth)
        if parsed is not None:
            new_date_of_birth = parsed

    try:
        with transaction.atomic():
            if new_firstname is not None:
                user.first_name = new_firstname
            if new_lastname is not None:
                user.last_name = new_lastname
            if username is not None:
                if username != user.username and User.objects.filter(username=username).exists():
                    return JsonResponse({'error': 'Username already exists'}, status=409)
                user.username = username
            user.save()

            if hasattr(user, 'customer'):
                customer = user.customer
                if new_email is not None:
                    if new_email != customer.email and Customer.objects.filter(email=new_email).exists():
                        return JsonResponse({'error': 'Email already in use'}, status=409)
                    customer.email = new_email
                if new_phone_no is not None:
                    customer.phone_no = new_phone_no
                if new_gender is not None:
                    customer.gender = new_gender
                if new_date_of_birth is not None:
                    customer.date_of_birth = new_date_of_birth
                customer.save()
            elif hasattr(user, 'staff'):
                staff = user.staff
                if new_email is not None:
                    if new_email != staff.email and Staff.objects.filter(email=new_email).exists():
                        return JsonResponse({'error': 'Email already in use'}, status=409)
                    staff.email = new_email
                staff.save()
    except Exception as e:
        return JsonResponse({'error': 'Failed to update profile', 'detail': str(e)}, status=400)

    return JsonResponse({'message': 'Profile updated successfully', 'user_profile': build_user_profile(user)}, status=200)

# Upload Profile Picture
@csrf_exempt
@require_http_methods(["POST"])
@login_required
def upload_profile_picture(request):
    if 'profile_picture' not in request.FILES:
        return JsonResponse({'error': 'No profile picture provided'}, status=400)

    profile_picture = request.FILES['profile_picture']
    if profile_picture.size > 5 * 1024 * 1024:  # 5MB limit
        return JsonResponse({'error': 'Profile picture exceeds size limit of 5MB'}, status=400)

    allowed_types = ['image/jpeg', 'image/png']
    if profile_picture.content_type not in allowed_types:
        return JsonResponse({'error': 'Invalid file type. Only JPEG and PNG are allowed.'}, status=400)

    try:
        image_data = profile_picture.read()
        encoded_string = base64.b64encode(image_data).decode('utf-8')

        user = request.user
        if hasattr(user, 'customer'):
            customer = user.customer
            customer.profile_pic = encoded_string
            customer.save()
        else:
            return JsonResponse({'error': 'Only customers can upload profile pictures'}, status=403)
    except Exception as e:
        return JsonResponse({'error': 'Failed to upload profile picture', 'detail': str(e)}, status=400)

    return JsonResponse({'message': 'Profile picture uploaded successfully'}, status=200)

# Change Password
@csrf_exempt
@require_http_methods(["PUT"])
@login_required
def change_password(request):
    put_data = parse_request_body(request)
    current_password = put_data.get('current_password')
    new_password = put_data.get('new_password')

    if not current_password or not new_password:
        return JsonResponse({'error': 'Current and new password required'}, status=400)

    user = request.user
    if not user.check_password(current_password):
        return JsonResponse({'error': 'Current password is incorrect'}, status=403)

    user.set_password(new_password)
    user.save()
    auth_logout(request)
    response = JsonResponse({'message': 'Password changed successfully. Please log in again.'}, status=200)
    response.delete_cookie('username')
    response.delete_cookie('sessionid')
    response.delete_cookie('csrftoken')
    return response
