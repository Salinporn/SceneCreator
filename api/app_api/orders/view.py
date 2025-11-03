from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from .models import Order, OrderItem, PaymentMethod
from app_api.products.objectModels import ContainerOwnedItem, NonContainerOwnedItem
from app_api.users.models import CreditCard, BankAccount
from zodb.zodb_management import *
from app_api.orders.funcHelper import *
from datetime import datetime
import transaction

@csrf_exempt
@login_required
@require_http_methods(["POST"])
def checkout(request):
    customer = request.user.customer
    
    payment_type = request.POST.get('payment_type')
    method_id = request.POST.get('method_id')

    if not customer:
        return JsonResponse({'error': 'Only customers can manage carts'}, status=403)

    cart = customer.carts.first()

    if not cart:
        return JsonResponse({'error': 'Cart not found'}, status=404)

    if cart.cart_items.count() == 0:
        return JsonResponse({'error': 'Cart is empty'}, status=400)
    
    if payment_type not in ['credit_card', 'bank_account']:
        return JsonResponse({'error': 'Invalid payment type'}, status=400)

    if not method_id:
        return JsonResponse({'error': 'Payment method not provided'}, status=400)

    if payment_type == 'credit_card':
        if int(method_id) not in customer.credit_cards:
            return JsonResponse({'error': 'Payment method not found'}, status=404)
    elif payment_type == 'bank_account':
        if int(method_id) not in customer.bank_accounts:
            return JsonResponse({'error': 'Payment method not found'}, status=404)
    
    payment_method = PaymentMethod.objects.create(
        type=payment_type,
        credit_card=CreditCard.objects.get(id=method_id) if payment_type == 'credit_card' else None,
        bank_account=BankAccount.objects.get(id=method_id) if payment_type == 'bank_account' else None
    )
    payment_method.save()

    order = Order.objects.create(
        customer=customer,
        order_items=[],
        total_price=cart.total_price,
        status='pending',
        payment_method=payment_method
    )
    
    
    items = []
    cart_items = cart.cart_items.all()
    for item in cart_items:
        order_item = OrderItem.objects.create(
            order=order,
            product_id=item.product_id,
            quantity=item.quantity,
            type=item.type
        )
        items.append(order_item.id)
    order.order_items = items
    order.save()
    
    cart.cart_items.all().delete()
    cart.total_price = 0.00
    cart.items = []
    cart.save()
    
    customer.purchased_history.append(order.id)
    customer.save()
    return JsonResponse({'message': 'Order created successfully', 'order_id': order.id}, status=201)

@login_required
@require_http_methods(["GET"])
def list_orders(request):
    connection, root = get_connection()
    try:
        customer = request.user.customer
        if not customer:
            return JsonResponse({'error': 'Only customers can view orders'}, status=403)
        orders_data = []
        for order in customer.orders.all().order_by('-created_at'):
            order_items = []
            for order_item in order.order_items_rel.all():
                product = root.products[order_item.product_id]
                item = product.item
                order_items.append({
                    'id': order_item.id,
                    'product_id': product.get_id(),
                    'product_name': item.get_name(),
                    'quantity': order_item.quantity,
                    'type': order_item.type,
                    'added_at': order_item.added_at.isoformat(),
                })
            orders_data.append({
                'order_id': order.id,
                'order_items': order_items,
                'total_price': str(order.total_price),
                'status': order.status,
                'created_at': order.created_at.isoformat(),
                'updated_at': order.updated_at.isoformat(),
                'payment_method': {
                    'type': order.payment_method.type,
                    'credit_card_last4': order.payment_method.credit_card.last4 if order.payment_method.credit_card else None,
                    'bank_account_last4': order.payment_method.bank_account.last4 if order.payment_method.bank_account else None,
                } if order.payment_method else None,
                
            })
        transaction.commit()
        return JsonResponse({'orders': orders_data}, status=200)
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
@require_http_methods(["POST"])
def payment_completed(request, order_id):
    customer = request.user.customer
    if not customer:
        return JsonResponse({'error': 'Only customers can update orders'}, status=403)
    try:
        order = Order.objects.get(id=order_id, customer=customer)
    except Order.DoesNotExist:
        return JsonResponse({'error': 'Order not found'}, status=404)
    
    order.status = 'payment completed'
    order.save()
    return JsonResponse({'message': 'Order status updated to payment completed'}, status=200)

@csrf_exempt
@login_required
@require_http_methods(["POST"])
def cancel_order(request, order_id):
    customer = request.user.customer
    if not customer:
        return JsonResponse({'error': 'Only customers can update orders'}, status=403)
    try:
        order = Order.objects.get(id=order_id, customer=customer)
    except Order.DoesNotExist:
        return JsonResponse({'error': 'Order not found'}, status=404)
    
    order.status = 'cancelled'
    order.save()
    return JsonResponse({'message': 'Order status updated to cancelled'}, status=200)

@csrf_exempt
@login_required
@require_http_methods(["POST"])
def complete_order(request, order_id):
    connection, root = get_connection()
    try:
        customer = request.user.customer
        if not customer:
            return JsonResponse({'error': 'Only customers can update orders'}, status=403)
        try:
            order = Order.objects.get(id=order_id, customer=customer)
            if order.status == 'complete':
                return JsonResponse({'error': 'Order is already completed'}, status=400)
        except Order.DoesNotExist:
            return JsonResponse({'error': 'Order not found'}, status=404)
        
        order.status = 'complete'
        order.save()

        for order_item in order.order_items_rel.all():
            if order_item.type == 'digital':
                for _ in range(order_item.quantity):
                    product = root.products[order_item.product_id]
                    item = product.item
                    spatial_id = create_spatial_instance()
                    current_time = datetime.now()
                    if item.is_container:
                        container_id = get_container_owned_item_id(root)
                        categorizedItem = ContainerOwnedItem(
                            id=container_id,
                            owner_id=customer.id,
                            name=item.get_name(),
                            description=item.get_description(),
                            model_id=item.get_model_id(),
                            image=item.get_image(),
                            category=item.get_category(),
                            type=item.get_type(),
                            is_container=item.is_container,
                            spatial_id=spatial_id,
                            texture_id=None,
                            contained_item=[],
                            created_at=current_time
                        )
                        root.containerOwnedItems[str(container_id)] = categorizedItem
                    else:
                        noncontainer_id = get_noncontainer_owned_item_id(root)
                        categorizedItem = NonContainerOwnedItem(
                            id=noncontainer_id,
                            owner_id=customer.id,
                            name=item.get_name(),
                            description=item.get_description(),
                            model_id=item.get_model_id(),
                            image=item.get_image(),
                            category=item.get_category(),
                            type=item.get_type(),
                            is_container=item.is_container,
                            spatial_id=spatial_id,
                            texture_id=None,
                            composition=[],
                            created_at=current_time
                        )
                        root.nonContainerOwnedItems[str(noncontainer_id)] = categorizedItem
                    transaction.commit()
                    customer.owned_digital_products.append({ 'id': categorizedItem.get_id(), 'is_container': categorizedItem.is_container})
        customer.save()

        return JsonResponse({'message': 'Order status updated to complete and products granted'}, status=200)
    except Exception as e:
        try:
            transaction.abort()
        except Exception:
            pass
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        connection.close()
