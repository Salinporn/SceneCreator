from .models import Review
from django.db.models import Avg

def update_average_rating(product):
    avg = Review.objects.filter(product_id=product.get_id()).aggregate(avg=Avg('rating'))['avg']
    if avg is None:
        product.set_rating(0.0)
    else:
        avg = round(max(0.0, min(5.0, float(avg))), 2)
        product.set_rating(avg)
