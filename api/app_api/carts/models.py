from django.db import models

class Cart(models.Model):
    customer = models.ForeignKey('users.Customer', on_delete=models.CASCADE, related_name='carts')
    items = models.JSONField(default=list)  # List of cart item IDs
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Cart {self.id} for Customer {self.customer.id}"

class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='cart_items')
    product_id = models.IntegerField()
    quantity = models.PositiveIntegerField(default=1)
    type = models.CharField(max_length=20)  # 'digital' or 'physical'
    added_at = models.DateTimeField(auto_now_add=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    def __str__(self):
        return f"{self.quantity} of {self.product_id} in Cart {self.cart.id}"