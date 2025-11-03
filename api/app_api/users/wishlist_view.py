from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from app_api.products.objectModels import Product
from zodb.zodb_management import *
import transaction

@csrf_exempt
@login_required
@require_http_methods(["POST"])
def add_to_wishlist(request):
    connection, root = get_connection()
    try:
        customer = request.user.customer

        if not customer:
            return JsonResponse({'error': 'Only customers can manage wishlists'}, status=403)

        product_id = int(request.POST.get('product_id'))

        if not product_id:
            return JsonResponse({'error': 'Product ID is required'}, status=400)
        
        try:
            _ = root.products[product_id]
        except (KeyError, TypeError):
            return JsonResponse({'error': 'Product not found'}, status=404)

        wishlist = customer.wishlist

        if product_id in wishlist:
            return JsonResponse({'message': 'Item already in wishlist'}, status=200)

        wishlist.append(product_id)
        customer.wishlist = wishlist
        customer.save()

        return JsonResponse({'message': 'Item added to wishlist successfully'}, status=201)
    except Exception as e:
        try:
            transaction.abort()
        except Exception:
            pass
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        connection.close()

@csrf_exempt
@login_required
@require_http_methods(["DELETE"])
def remove_from_wishlist(request, product_id):
    customer = request.user.customer

    if not customer:
        return JsonResponse({'error': 'Only customers can manage wishlists'}, status=403)

    wishlist = customer.wishlist

    if product_id not in wishlist:
        return JsonResponse({'message': 'Item not found in wishlist'}, status=404)

    wishlist.remove(product_id)
    customer.wishlist = wishlist
    customer.save()

    return JsonResponse({'message': 'Item removed from wishlist successfully'}, status=200)

@login_required
@require_http_methods(["GET"])
def get_wishlist(request):
    connection, root = get_connection()
    try:
        customer = request.user.customer

        if not customer:
            return JsonResponse({'error': 'Only customers can view wishlists'}, status=403)

        wishlist = customer.wishlist
        products = []

        for item_id in wishlist:
            product = root.products[item_id]
            item = product.get_item()
            product_data = {
                'id': product.get_id(),
                'name': item.get_name(),
                'digital_price': str(product.get_digital_price()),
                'physical_price': str(product.get_physical_price()),
                'category': item.get_category(),
                'type': item.get_type(),
                'image': item.get_image(),
            }
            products.append(product_data)

        return JsonResponse({'wishlist': products}, status=200)
    except Exception as e:
        try:
            transaction.abort()
        except Exception:
            pass
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        connection.close()
