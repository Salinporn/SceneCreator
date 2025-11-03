from django.db import models

class Review(models.Model):
    product_id = models.IntegerField()
    customer = models.ForeignKey('users.Customer', on_delete=models.CASCADE, related_name='customer_reviews')
    rating = models.IntegerField(choices=[(i, str(i)) for i in range(1, 6)])
    comment = models.TextField(null=True, blank=True)
    image = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Review {self.id} for Product {self.product.id} by Customer {self.customer.id}"