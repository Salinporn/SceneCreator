from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required

from .models import CreditCard, BankAccount

@csrf_exempt
@require_http_methods(["POST"])
@login_required
def add_credit_card(request):
    provider = request.POST.get("provider")
    provider_token = request.POST.get("provider_token")
    card_brand = request.POST.get("card_brand")
    last4 = request.POST.get("last4")
    exp_month = request.POST.get("exp_month")
    exp_year = request.POST.get("exp_year")
    is_default = request.POST.get("is_default", "false").lower() == "true"
    if not provider or not provider_token:
        return JsonResponse({"error": "provider and provider_token are required"}, status=400)

    customer = request.user.customer
    pm = CreditCard.objects.create(
        customer=customer,
        provider=provider,
        provider_token=provider_token,
        card_brand=card_brand,
        last4=last4,
        exp_month=exp_month,
        exp_year=exp_year,
        is_default=is_default
    )
    if pm.is_default:
        CreditCard.objects.filter(customer=customer).exclude(id=pm.id).update(is_default=False)
        
    customer.credit_cards.append(pm.id)
    customer.save()

    return JsonResponse({"message": "added", "id": pm.id}, status=201)

@login_required
@require_http_methods(["GET"])
def list_credit_cards(request):
    customer = request.user.customer
    items = []
    for pm in customer.credit_cards_rel.all().order_by("-is_default", "-created_at"):
        items.append({
            "id": pm.id,
            "provider": pm.provider,
            "last4": pm.last4,
            "card_brand": pm.card_brand,
            "exp_month": pm.exp_month,
            "exp_year": pm.exp_year,
            "is_default": pm.is_default,
            "created_at": pm.created_at.isoformat(),
        })
    return JsonResponse({"payment_methods": items}, status=200)

@csrf_exempt
@login_required
@require_http_methods(["DELETE"])
def remove_credit_card(request, pm_id):
    customer = request.user.customer
    try:
        pm = CreditCard.objects.get(id=pm_id, customer=customer)
        customer.credit_cards.remove(pm.id)
        customer.save()
    except CreditCard.DoesNotExist:
        return JsonResponse({"error":"not found"}, status=404)
    pm.delete()
    return JsonResponse({"message":"deleted"}, status=200)

@csrf_exempt
@login_required
@require_http_methods(["PUT"])
def set_default_credit_card(request, pm_id):
    customer = request.user.customer
    try:
        pm = CreditCard.objects.get(id=pm_id, customer=customer)
    except CreditCard.DoesNotExist:
        return JsonResponse({"error":"not found"}, status=404)
    CreditCard.objects.filter(customer=customer).update(is_default=False)
    pm.is_default = True
    pm.save()
    return JsonResponse({"message":"default set"}, status=200)

@csrf_exempt
@require_http_methods(["POST"])
@login_required
def add_bank_account(request):
    provider = request.POST.get("provider") or "bank"
    provider_token = request.POST.get("provider_token")
    bank_name = request.POST.get("bank_name")
    account_holder = request.POST.get("account_holder")
    last4 = request.POST.get("last4")
    is_default = request.POST.get("is_default", "false").lower() == "true"

    if not bank_name or not account_holder:
        return JsonResponse({"error": "bank_name and account_holder are required"}, status=400)

    customer = request.user.customer

    ba = BankAccount.objects.create(
        customer=customer,
        provider=provider,
        provider_token=provider_token,
        bank_name=bank_name,
        account_holder=account_holder,
        last4=last4,
        is_default=is_default
    )
    if ba.is_default:
        BankAccount.objects.filter(customer=customer).exclude(id=ba.id).update(is_default=False)
    
    customer.bank_accounts.append(ba.id)
    customer.save()

    return JsonResponse({"message": "bank account added", "id": ba.id}, status=201)


@login_required
@require_http_methods(["GET"])
def list_bank_accounts(request):
    customer = request.user.customer
    items = []
    for ba in customer.bank_accounts_rel.all().order_by("-is_default", "-created_at"):
        items.append({
            "id": ba.id,
            "bank_name": ba.bank_name,
            "account_holder": ba.account_holder,
            "last4": ba.last4,
            "provider": ba.provider,
            "is_default": ba.is_default,
            "created_at": ba.created_at.isoformat(),
        })
    return JsonResponse({"bank_accounts": items}, status=200)


@csrf_exempt
@require_http_methods(["DELETE"])
@login_required
def remove_bank_account(request, ba_id):
    customer = request.user.customer

    try:
        ba = BankAccount.objects.get(id=ba_id, customer=customer)
        customer.bank_accounts.remove(ba.id)
        customer.save()
    except BankAccount.DoesNotExist:
        return JsonResponse({"error": "not found"}, status=404)
    ba.delete()
    return JsonResponse({"message": "bank account removed"}, status=200)

@csrf_exempt
@login_required
@require_http_methods(["PUT"])
def set_default_bank_account(request, ba_id):
    customer = request.user.customer
    try:
        ba = BankAccount.objects.get(id=ba_id, customer=customer)
    except BankAccount.DoesNotExist:
        return JsonResponse({"error":"not found"}, status=404)
    BankAccount.objects.filter(customer=customer).update(is_default=False)
    ba.is_default = True
    ba.save()
    return JsonResponse({"message":"default bank account set"}, status=200)
