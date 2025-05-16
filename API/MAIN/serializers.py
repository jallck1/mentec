from rest_framework import serializers, status
from django.contrib.auth.models import Group, Permission
from django.contrib.auth.hashers import make_password
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import transaction
import logging

logger = logging.getLogger(__name__)
from django.utils import timezone
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

User = get_user_model()

from . import models
import logging

logger = logging.getLogger(__name__)

class CustomTokenObtainSerializer(TokenObtainPairSerializer):
    """
    Custom token serializer that includes additional user information in the response.
    Uses email for authentication instead of username.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Asegurarse de que el campo 'username' no esté presente
        if 'username' in self.fields:
            del self.fields['username']
        # Agregar el campo 'email' si no está presente
        if 'email' not in self.fields:
            self.fields['email'] = serializers.EmailField(required=True)
    
    def validate(self, attrs):
        try:
            # Get user by email
            email = attrs.get('email')
            password = attrs.get('password')
            
            # Try to authenticate the user
            from django.contrib.auth import authenticate
            self.user = authenticate(
                request=self.context.get('request'),
                email=email,
                password=password
            )
            
            if not self.user:
                raise ValidationError("No active account found with the given credentials")
            
            if not self.user.is_active:
                raise ValidationError("User account is disabled.", code='authorization')
            
            # Update last login
            self.user.last_login = timezone.now()
            self.user.save(update_fields=['last_login'])
            
            # Generate tokens with custom claims
            token = self.get_token(self.user)
            refresh = RefreshToken.for_user(self.user)
            
            # Get user permissions
            permissions = list(self.user.get_all_permissions())
            
            # Get user groups
            groups = list(self.user.groups.values_list('name', flat=True))
            
            # Add custom claims to the token
            token['groups'] = groups
            token['permissions'] = permissions
            token['email'] = self.user.email
            token['name'] = self.user.name
            
            # Prepare user data for the response
            user_data = {
                'id': self.user.id,
                'email': self.user.email,
                'name': self.user.name,
                'is_active': self.user.is_active,
                'is_staff': self.user.is_staff,
                'is_superuser': self.user.is_superuser,
                'balance': float(self.user.balance) if self.user.balance is not None else 0.00,
                'groups': groups,
                'permissions': permissions,
                'last_login': self.user.last_login.isoformat() if self.user.last_login else None,
                'date_joined': self.user.date_joined.isoformat() if self.user.date_joined else None,
            }
            
            # Add client-specific data if user is a client
            if hasattr(self.user, 'client_profile'):
                cliente_data = {
                    'telefono': self.user.client_profile.telefono,
                    'correo': self.user.client_profile.correo,
                    'cupos': float(self.user.client_profile.cupos) if self.user.client_profile.cupos is not None else 0.00,
                }
                # Add image URL if exists
                if self.user.client_profile.image:
                    cliente_data['image'] = self.user.client_profile.image.url
                user_data.update(cliente_data)
            
            # Prepare response data
            data = {
                'refresh': str(refresh),
                'access': str(token.access_token),
                'user': {
                    'id': user_data.get('id'),
                    'email': user_data.get('email'),
                    'name': user_data.get('name'),
                    'role': 'admin' if user_data.get('is_staff') or user_data.get('is_superuser') else 'buyer',
                    **user_data
                },
                'token_type': 'Bearer',
                'expires_in': int(token.access_token.lifetime.total_seconds())
            }
            
            return data
            
        except Exception as e:
            logger.error(f"Login error for user {attrs.get('email')}: {str(e)}")
            raise ValidationError("Unable to log in with provided credentials.")

class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration with basic validation.
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        min_length=8,
        max_length=128,
        trim_whitespace=False,
        error_messages={
            'min_length': 'La contraseña debe tener al menos 8 caracteres.',
            'max_length': 'La contraseña no puede tener más de 128 caracteres.'
        }
    )
    confirm_password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = models.User
        fields = ('email', 'name', 'password', 'confirm_password')
        extra_kwargs = {
            'email': {'required': True, 'allow_blank': False},
            'name': {'required': True, 'allow_blank': False},
        }
    
    def validate_email(self, value):
        """
        Validate that the email is unique and properly formatted.
        """
        if not value:
            raise serializers.ValidationError("El correo electrónico es obligatorio.")
        
        if models.User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Ya existe un usuario con este correo electrónico.")
            
        return value.lower()
    
    def validate(self, data):
        """
        Check that the two password fields match.
        """
        if data['password'] != data.pop('confirm_password'):
            raise serializers.ValidationError({"confirm_password": "Las contraseñas no coinciden."})
        return data
    
    def create(self, validated_data):
        """
        Create and return a new user with hashed password.
        """
        # Remove confirm_password from validated_data
        validated_data.pop('confirm_password', None)
        
        # Create user with hashed password
        user = models.User.objects.create_user(
            email=validated_data['email'],
            name=validated_data['name'],
            password=validated_data['password'],
            is_active=True,
            is_staff=False,
            is_superuser=False
        )
        
        return user


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for the User model with enhanced security and validation.
    """
    password = serializers.CharField(
        write_only=True,
        required=False,
        style={'input_type': 'password'},
        min_length=8,
        max_length=128,
        trim_whitespace=False,
        error_messages={
            'min_length': 'La contraseña debe tener al menos 8 caracteres.',
            'max_length': 'La contraseña no puede tener más de 128 caracteres.'
        }
    )
    balance = serializers.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        required=False,
        min_value=0,
        default=0
    )
    is_admin = serializers.BooleanField(required=False, default=False, write_only=True)
    is_active = serializers.BooleanField(required=False, default=True)

    class Meta:
        model = models.User
        fields = (
            'id', 'email', 'name', 'password', 'is_active', 'is_admin',
            'last_login', 'date_joined', 'balance'
        )
        read_only_fields = ('last_login', 'date_joined')
        extra_kwargs = {
            'email': {
                'required': True,
                'allow_blank': False,
                'validators': []  # We'll handle uniqueness in validate_email
            },
            'name': {
                'required': True,
                'allow_blank': False,
                'max_length': 150
            }
        }
    
    def validate_email(self, value):
        """
        Validate that the email is unique and properly formatted.
        """
        if not value:
            raise serializers.ValidationError("Email is required.")
            
        # Skip validation if this is an update and the email hasn't changed
        if self.instance and self.instance.email.lower() == value.lower():
            return value.lower()
            
        # Check if email is already in use by another user (case-insensitive)
        if models.User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
            
        return value.lower()
    
    def validate_password(self, value):
        """
        Validate password strength.
        """
        if not value:
            if self.instance and not self.instance.pk:
                raise serializers.ValidationError("Password is required.")
            return value
            
        # Add password strength validation here if needed
        # e.g., require numbers, special characters, etc.
        return value
    
    def create(self, validated_data):
        """
        Create and return a new user with hashed password.
        """
        # Remove is_admin from validated data if present
        is_admin = validated_data.pop('is_admin', False)
        
        # Create user with default values
        user = models.User.objects.create(
            email=validated_data['email'],
            name=validated_data['name'],
            is_active=validated_data.get('is_active', True),
            is_staff=is_admin,
            is_superuser=is_admin
        )
        
        # Set password if provided
        if 'password' in validated_data:
            user.set_password(validated_data['password'])
        
        # Save user
        user.save()
        
        return user
    
    def update(self, instance, validated_data):
        """
        Update and return an existing user instance.
        """
        # Update user fields
        instance.email = validated_data.get('email', instance.email)
        instance.name = validated_data.get('name', instance.name)
        instance.is_active = validated_data.get('is_active', instance.is_active)
        instance.is_staff = validated_data.get('is_admin', instance.is_staff)
        instance.is_superuser = validated_data.get('is_admin', instance.is_superuser)
        
        # Update password if provided
        if 'password' in validated_data:
            instance.set_password(validated_data['password'])
        
        # Save user
        instance.save()
        
        return instance

class ClientSerializer(serializers.ModelSerializer):
    """
    Serializer for the Client model with nested user data.
    """
    user = UserSerializer(required=True)
    telefono = serializers.CharField(max_length=50, required=True)
    correo = serializers.EmailField(required=True)
    image = serializers.ImageField(required=False)
    cupos = serializers.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        required=False, 
        min_value=0,
        default=0.00
    )
    
    class Meta:
        model = models.Cliente
        fields = [
            'user', 'telefono', 'correo', 'image', 'cupos', 
            'createdAt', 'updatedAt'
        ]
        read_only_fields = ('createdAt', 'updatedAt')
        extra_kwargs = {
            'user': {'read_only': False},
            'correo': {'validators': []}  # Remove default validators for correo
        }
    
    # Se eliminó la validación de documento y tipo_documento ya que no existen en el modelo actual
    
    def create(self, validated_data):
        """
        Create a new client with associated user.
        """
        user_data = validated_data.pop('user')
        
        # Create user
        user_serializer = UserSerializer(data=user_data)
        user_serializer.is_valid(raise_exception=True)
        user = user_serializer.save()
        
        try:
            # Assign default client group
            user_group, created = Group.objects.get_or_create(name='Clientes')
            user.groups.add(user_group)
            
            # Set user balance from cupos if provided
            cupos = validated_data.get('cupos', 0)
            user.balance = cupos
            user.save()
            
            # Create client profile
            cliente = models.Cliente.objects.create(user=user, **validated_data)
            return cliente
            
        except Exception as e:
            # Clean up user if client creation fails
            user.delete()
            logger.error(f"Error creating client: {str(e)}")
            raise serializers.ValidationError({
                'non_field_errors': [f"Error creating client: {str(e)}"]
            })
    
    def update(self, instance, validated_data):
        """
        Update an existing client and associated user.
        """
        # Get the user data
        user_data = validated_data.pop('user', None)
        
        # Update the client instance
        instance.telefono = validated_data.get('telefono', instance.telefono)
        instance.correo = validated_data.get('correo', instance.correo)
        instance.cupos = validated_data.get('cupos', instance.cupos)
        
        # Handle image update if provided
        request = self.context.get('request')
        if request and hasattr(request, 'FILES'):
            image = request.FILES.get('image', None)
            if image:
                # Delete the old image if it exists and is not the default
                if instance.image and instance.image.name != 'client_images/default.jpg':
                    instance.image.delete(save=False)
                instance.image = image
        
        # Save the client instance
        instance.save()
        
        # Update the associated user if user data is provided
        if user_data:
            user_instance = instance.user
            
            # Update user fields if they are provided
            if 'email' in user_data:
                user_instance.email = user_data['email']
                instance.correo = user_data['email']
            
            if 'name' in user_data:
                user_instance.name = user_data['name']
            
            # Update user balance if cupos changed
            if 'cupos' in validated_data and user_instance.balance != validated_data['cupos']:
                user_instance.balance = validated_data['cupos']
            
            # Save the user instance
            user_instance.save()
            
            # Save the client instance
            instance.save()
            
            # Refresh the instance to get the latest data
            instance.refresh_from_db()
        
        return instance

class TransactionSerializer(serializers.ModelSerializer):
    """Serializer for the Transaction model with calculated fields and validation."""
    product_name = serializers.CharField(source='product.name', read_only=True)
    buyer_email = serializers.CharField(source='buyer.email', read_only=True)
    
    class Meta:
        model = models.Transacts
        fields = [
            'id', 'product', 'product_name', 'buyer', 'buyer_email', 'quantity',
            'unit_price', 'impuestos', 'descuento', 'total', 'payment_method',
            'status', 'createdAt', 'updatedAt'
        ]
        read_only_fields = [
            'id', 'product_name', 'buyer_email', 'unit_price', 'impuestos',
            'descuento', 'total', 'createdAt', 'updatedAt'
        ]
    
    def validate_quantity(self, value):
        """Validate that quantity is greater than zero"""
        if value <= 0:
            raise serializers.ValidationError("La cantidad debe ser mayor a cero")
        return value
    
    def validate(self, data):
        """Additional validations"""
        product = data.get('product')
        quantity = data.get('quantity')
        
        # Check if there's enough stock
        if quantity > product.stock:
            raise serializers.ValidationError({
                'quantity': f'No hay suficiente stock. Stock disponible: {product.stock}'
            })
            
        return data

class ProductSerializer(serializers.ModelSerializer):
    """
    Serializer for the Product model with calculated fields and validation.
    """
    creator = serializers.PrimaryKeyRelatedField(
        read_only=True, 
        default=serializers.CurrentUserDefault()
    )
    precio_final = serializers.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        read_only=True
    )
    price = serializers.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        min_value=0,
        required=True
    )
    impuestos = serializers.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        min_value=0,
        max_value=100,
        required=False,
        default=0
    )
    descuento = serializers.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        min_value=0,
        max_value=100,
        required=False,
        default=0
    )
    stock = serializers.IntegerField(
        min_value=0,
        required=False,
        default=0
    )
    
    class Meta:
        model = models.Productos
        fields = [
            'id', 'name', 'description', 'price', 'impuestos', 'descuento',
            'precio_final', 'stock', 'image', 'creator', 'is_active',
            'createdAt', 'updatedAt'
        ]
        read_only_fields = ('createdAt', 'updatedAt', 'precio_final')
        extra_kwargs = {
            'name': {'required': True, 'allow_blank': False},
            'description': {'required': False, 'allow_blank': True},
            'image': {'required': False},
        }
    

    def create(self, validated_data):
        """
        Create a new product with the current user as creator.
        """
        logger.info("Iniciando creación de producto")
        logger.debug(f"Datos validados: {validated_data}")
        
        try:
            request = self.context.get('request')
            if request and hasattr(request, 'user') and request.user.is_authenticated:
                validated_data['creator'] = request.user
                logger.debug(f"Usuario autenticado: {request.user}")
            else:
                logger.warning("No se pudo obtener el usuario autenticado del contexto")
            
            # Removemos precio_final de validated_data ya que es una propiedad calculada
            validated_data.pop('precio_final', None)
            
            # Creamos el producto sin intentar establecer precio_final
            logger.debug("Intentando crear el producto en la base de datos...")
            product = models.Productos.objects.create(**validated_data)
            logger.info(f"Producto creado exitosamente con ID: {product.id}")
            return product
            
        except Exception as e:
            logger.error(f"Error al crear el producto: {str(e)}", exc_info=True)
            raise
    
    def update(self, instance, validated_data):
        """
        Update an existing product. The precio_final is calculated as a property in the model.
        """
        # Remove precio_final from validated_data if present
        validated_data.pop('precio_final', None)
        
        # Update the instance with the remaining validated data
        return super().update(instance, validated_data)

# class TransactionItemSerializer(serializers.Serializer):
#     """
#     Serializer for transaction items in the create transaction request.
#     """
#     product_id = serializers.IntegerField(min_value=1)
#     quantity = serializers.IntegerField(min_value=1)
    
#     def validate_product_id(self, value):
#         """
#         Validate that the product exists and is active.
#         """
#         try:
#             product = models.Productos.objects.get(id=value, is_active=True)
#             return product.id
#         except models.Productos.DoesNotExist:
#             raise serializers.ValidationError("Product does not exist or is not active.")


# class CreateTransactionSerializer(serializers.Serializer):
#     """
#     Serializer for creating a new transaction.
#     """
#     items = TransactionItemSerializer(many=True, required=True)
#     payment_method = serializers.ChoiceField(
#         choices=models.Transacts.PAYMENT_METHOD_CHOICES,
#         default='credit'
#     )
#     client_id = serializers.IntegerField(required=False, allow_null=True)
#     notes = serializers.CharField(required=False, allow_blank=True)
    
#     def validate(self, data):
#         """
#         Validate the transaction data.
#         """
#         # Validate that at least one item is present
#         if not data.get('items') or len(data['items']) == 0:
#             raise serializers.ValidationError({"items": "At least one item is required."})
        
#         # Validate client if provided
#         if 'client_id' in data and data['client_id'] is not None:
#             try:
#                 client = models.Cliente.objects.get(id=data['client_id'])
#                 if not client.user.is_active:
#                     raise serializers.ValidationError({"client_id": "Client account is not active."})
#             except models.Cliente.DoesNotExist:
#                 raise serializers.ValidationError({"client_id": "Client does not exist."})
        
#         return data


# class TransactionItemDetailSerializer(serializers.ModelSerializer):
#     """
#     Serializer for transaction items in the transaction detail.
#     """
#     product_name = serializers.CharField(source='product.name', read_only=True)
#     product_sku = serializers.CharField(source='product.sku', read_only=True)
#     unit_price = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
#     subtotal = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    
#     class Meta:
#         model = models.TransactionItem
#         fields = [
#             'id', 'product', 'product_name', 'product_sku', 'quantity',
#             'unit_price', 'impuestos', 'descuento', 'subtotal'
#         ]


# class TransactionSerializer(serializers.ModelSerializer):
#     """
#     Serializer for the Transaction model with detailed transaction information.
#     """
#     items = TransactionItemDetailSerializer(many=True, read_only=True)
#     client_name = serializers.CharField(source='client.user.get_full_name', read_only=True)
#     client_email = serializers.EmailField(source='client.user.email', read_only=True)
#     payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
#     status_display = serializers.CharField(source='get_status_display', read_only=True)
#     subtotal = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
#     tax_amount = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
#     discount_amount = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
#     total = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
#     created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
#     class Meta:
#         model = models.Transacts
#         fields = [
#             'id', 'transaction_id', 'client', 'client_name', 'client_email', 
#             'items', 'subtotal', 'tax_amount', 'discount_amount', 'total',
#             'payment_method', 'payment_method_display', 'status', 'status_display',
#             'notes', 'created_by', 'created_by_name', 'created_at', 'updated_at'
#         ]
#         read_only_fields = ('created_at', 'updated_at', 'created_by', 'transaction_id')
    
#     def validate(self, data):
#         """
#         Validate the transaction data.
#         """
#         # Validate client if provided
#         if 'client' in data and data['client'] is not None:
#             if not data['client'].user.is_active:
#                 raise serializers.ValidationError({"client": "Client account is not active."})
        
#         return data
    
#     def create(self, validated_data):
#         """
#         Create a new transaction with items.
#         """
#         items_data = self.context.get('items', [])
        
#         with transaction.atomic():
#             # Create the transaction
#             transaction_obj = models.Transacts.objects.create(
#                 client=validated_data.get('client'),
#                 payment_method=validated_data.get('payment_method', 'credit'),
#                 status=validated_data.get('status', 'completed'),
#                 notes=validated_data.get('notes', ''),
#                 created_by=self.context['request'].user
#             )
            
#             # Create transaction items
#             for item_data in items_data:
#                 product = models.Productos.objects.get(id=item_data['product_id'])
#                 quantity = item_data['quantity']
                
#                 # Create transaction item
#                 models.TransactionItem.objects.create(
#                     transaction=transaction_obj,
#                     product=product,
#                     quantity=quantity,
#                     unit_price=product.price,
#                     impuestos=product.impuestos,
#                     descuento=product.descuento
#                 )
                
#                 # Update product stock
#                 product.stock -= quantity
#                 product.save(update_fields=['stock'])
#                         unit_price=item_price,
#                         impuestos=product.impuestos,
#                         descuento=product.descuento,
#                         subtotal=subtotal
#                     )
                    
#                     # Update product stock
#                     product.stock -= quantity
#                     product.save()
                    
#                 except models.Productos.DoesNotExist:
#                     raise serializers.ValidationError({
#                         'items': f'Product with ID {product_id} does not exist or is not active.'
#                     })
            
#             # Calculate and save transaction totals
#             transaction_obj.calculate_totals()
            
#             # Update client balance if needed
#             if transaction_obj.client:
#                 client = transaction_obj.client
#                 if transaction_obj.payment_method == 'credit':
#                     if client.cupos < transaction_obj.total:
#                         raise serializers.ValidationError({
#                             'client': 'Insufficient credit for this transaction.'
#                         })
#                     client.cupos -= transaction_obj.total
#                     client.save()
#             
#             return transaction_obj

# Alias for backward compatibility
# ClientViewSerializer = ClientSerializer
# TransactSerializer = TransactionSerializer