from django.db import models
from django.contrib.auth.models import (
    AbstractBaseUser, BaseUserManager,  
    PermissionsMixin, Group, Permission
)
from django.utils import timezone

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("El email es obligatorio")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
            
        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True, max_length=254)
    name = models.CharField(max_length=50)
    last_login = models.DateTimeField(default=timezone.now)
    is_superuser = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    balance = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    date_joined = models.DateTimeField(default=timezone.now)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']
    
    objects = UserManager()
    
    def __str__(self):
        return self.email
    
    @property
    def total_purchases(self):
        return self.transactions.count()
    
    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
        db_table = 'MAIN_user'

class Cliente(models.Model):
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE,
        related_name='client_profile',
        primary_key=True
    )
    telefono = models.CharField(max_length=50)
    correo = models.EmailField(max_length=254)
    image = models.ImageField(upload_to="client_images/", default="client_images/default.jpg")
    cupos = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.name} - {self.correo}"
    
    class Meta:
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'
        db_table = 'MAIN_cliente'

class Productos(models.Model):
    name = models.CharField(max_length=50)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=15, decimal_places=2)
    impuestos = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    descuento = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    stock = models.IntegerField(default=0)
    image = models.ImageField(upload_to="product_images/", blank=True, null=True)
    creator = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='products_created'
    )
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    @property
    def precio_final(self):
        from decimal import Decimal
        # Convertir los porcentajes a Decimal y dividir por 100
        impuesto_decimal = Decimal(str(self.impuestos)) / Decimal('100')
        descuento_decimal = Decimal(str(self.descuento)) / Decimal('100')
        
        # Calcular el precio con impuestos
        precio_con_impuesto = self.price + (self.price * impuesto_decimal)
        # Calcular el descuento
        descuento = self.price * descuento_decimal
        # Redondear el resultado final a 2 decimales
        return (precio_con_impuesto - descuento).quantize(Decimal('0.01'))
    
    def __str__(self):
        return f"{self.name} - ${self.precio_final}"
    
    class Meta:
        verbose_name = 'Producto'
        verbose_name_plural = 'Productos'
        db_table = 'MAIN_productos'
        ordering = ['-createdAt']

class Transacts(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('credit', 'Crédito'),
        ('visa', 'Visa Transact'),
    ]
    
    product = models.ForeignKey(
        Productos, 
        on_delete=models.PROTECT,
        related_name='transactions'
    )
    buyer = models.ForeignKey(
        User, 
        on_delete=models.PROTECT,
        related_name='transactions'
    )
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=15, decimal_places=2)
    impuestos = models.DecimalField(max_digits=5, decimal_places=2)
    descuento = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    total = models.DecimalField(max_digits=15, decimal_places=2)
    payment_method = models.CharField(
        max_length=20, 
        choices=PAYMENT_METHOD_CHOICES,
        default='credit'
    )
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pendiente'),
            ('completed', 'Completado'),
            ('cancelled', 'Cancelado'),
        ],
        default='completed'
    )
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        if not self.pk:  # Only on create
            self.unit_price = self.product.precio_final
            self.impuestos = self.product.impuestos
            self.descuento = self.product.descuento
            self.total = self.unit_price * self.quantity
            
            # Update product stock
            if self.quantity > self.product.stock:
                raise ValueError("Stock insuficiente")
            self.product.stock -= self.quantity
            self.product.save()
            
            # Update user balance if paying with credit
            if self.payment_method == 'credit':
                if self.buyer.balance < self.total:
                    raise ValueError("Saldo insuficiente")
                self.buyer.balance -= self.total
                self.buyer.save()
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.quantity}x {self.product.name} - {self.buyer.email} (${self.total})"
    
    class Meta:
        verbose_name = 'Transacción'
        verbose_name_plural = 'Transacciones'
        db_table = 'MAIN_transacts'
        ordering = ['-createdAt']