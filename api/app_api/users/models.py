from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager

class UserManager(BaseUserManager):
    def create_user(self, username, password, first_name, last_name):
        if not username:
            raise ValueError('Users must have a username')
        user = self.model(
            username=username,
            first_name=first_name,
            last_name=last_name
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password, first_name, last_name):
        user = self.create_user(username, password, first_name, last_name)
        user.is_admin = True
        user.save(using=self._db)
        return user
    
    def create_staffuser(self, username, password, first_name, last_name):
        user = self.create_user(username, password, first_name, last_name)
        user.is_staff = True
        user.save(using=self._db)
        return user

class User(AbstractBaseUser):
    username = models.CharField(max_length=50, unique=True)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    password = models.CharField(max_length=128)  # Django hashes password
    is_active = models.BooleanField(default=True)
    is_admin = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    def __str__(self):
        return self.username

# class Avatar(models.Model):

class Staff(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    email = models.EmailField()
class Customer(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    email = models.EmailField()
    phone_no = models.CharField(max_length=20)
    gender = models.CharField(max_length=10, null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    profile_pic = models.TextField(null=True, blank=True)  # Store base64 string
    address = models.JSONField(default=list)
    owned_digital_products = models.JSONField(default=list)
    purchased_history = models.JSONField(default=list)
    credit_cards = models.JSONField(default=list)
    bank_accounts = models.JSONField(default=list)
    cart_id = models.IntegerField(null=True, blank=True)
    wishlist = models.JSONField(default=list)
    digital_home = models.JSONField(default=list) # List of digital homes
    
    REQUIRED_FIELDS = ['email', 'phone_no']

class Address(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='addresses')
    address = models.TextField()
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
class CreditCard(models.Model):
    customer = models.ForeignKey('users.Customer', on_delete=models.CASCADE, related_name='credit_cards_rel')
    provider = models.CharField(max_length=50) 
    provider_token = models.CharField(max_length=255, unique=True)
    card_brand = models.CharField(max_length=50, null=True, blank=True)
    last4 = models.CharField(max_length=4, null=True, blank=True)
    exp_month = models.PositiveSmallIntegerField(null=True, blank=True)
    exp_year = models.PositiveSmallIntegerField(null=True, blank=True)
    fingerprint = models.CharField(max_length=255, null=True, blank=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['customer']),
            models.Index(fields=['provider', 'provider_token']),
        ]

    def __str__(self):
        return f"{self.provider} ****{self.last4 or 'unknown'} ({self.customer_id})"


class BankAccount(models.Model):
    customer = models.ForeignKey('users.Customer', on_delete=models.CASCADE, related_name='bank_accounts_rel')
    provider = models.CharField(max_length=50, null=True, blank=True)
    provider_token = models.CharField(max_length=255, unique=True)
    account_holder = models.CharField(max_length=200)
    bank_name = models.CharField(max_length=200)
    last4 = models.CharField(max_length=4, null=True, blank=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['customer']),
        ]

    def __str__(self):
        return f"{self.bank_name} ****{self.last4 or 'xxxx'} ({self.customer_id})"