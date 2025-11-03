from django.db import models
from app_api.users.models import CreditCard, BankAccount

class Order(models.Model):
    customer = models.ForeignKey('users.Customer', on_delete=models.CASCADE, related_name='orders')
    order_items = models.JSONField(default=list)  # List of order item IDs
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, default='pending')  # e.g., pending, payment completed, shipping, complete, cancelled
    payment_method = models.ForeignKey('PaymentMethod', on_delete=models.SET_NULL, null=True, blank=True, related_name='orders_payment_method')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order {self.id} for Customer {self.customer.id}"
    
class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='order_items_rel')
    product_id = models.IntegerField()
    quantity = models.PositiveIntegerField(default=1)
    type = models.CharField(max_length=20)  # 'digital' or 'physical'
    added_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.quantity} of {self.product_id} in Order {self.order.id}"
    
class PaymentMethod(models.Model):
    type = models.CharField(max_length=50)  # credit_card or bank_account
    credit_card = models.ForeignKey(CreditCard, on_delete=models.SET_NULL, null=True, blank=True)
    bank_account = models.ForeignKey(BankAccount, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)