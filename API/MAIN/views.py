import os
import logging
from datetime import datetime
from django.db import transaction
from django.conf import settings
from django.db.models import Q, Sum, F, Value, Count
from django.db.models.functions import Coalesce
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
# Django REST Framework imports
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework import viewsets, permissions
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from . import models, serializers
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import Group

logger = logging.getLogger(__name__)

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow admin users to edit objects.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff

class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Permission to only allow owners of an object to edit it, but anyone to view it.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True
            
        # Write permissions are only allowed to the owner of the object or admin users.
        if hasattr(obj, 'user'):
            # For client profiles, check if the user owns the profile
            return obj.user == request.user or request.user.is_staff
        elif hasattr(obj, 'client'):
            # For transactions, check if the user is the client
            return obj.client.user == request.user or request.user.is_staff
        else:
            # For other objects, check if the user is the owner
            return obj == request.user or request.user.is_staff

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_detail(request):
    """
    Return the current user's information.
    """
    user = request.user
    return Response({
        'id': user.id,
        'email': user.email,
        'name': user.get_full_name(),
        'is_active': user.is_active,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
        'role': 'admin' if user.is_staff else 'user',
        'balance': getattr(user, 'balance', 0),
        'cupos': getattr(user, 'cupos', 0),
        'date_joined': user.date_joined,
        'last_login': user.last_login
    })

class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permission to only allow owners of an object or admins to edit it.
    """
    def has_object_permission(self, request, view, obj):
        # Admin users can do anything
        if request.user and request.user.is_staff:
            return True
            
        # For non-admin users, check ownership
        if hasattr(obj, 'user'):
            # For client profiles, check if the user owns the profile
            return obj.user == request.user
        elif hasattr(obj, 'client'):
            # For transactions, check if the user is the client
            return obj.client.user == request.user
        else:
            # For other objects, check if the user is the owner
            return obj == request.user

class IsSelfOrAdmin(permissions.BasePermission):
    """
    Permission to only allow users to view/edit their own profile or admins.
    """
    def has_object_permission(self, request, view, obj):
        # Admin users can do anything
        if request.user and request.user.is_staff:
            return True
            
        # Users can only access their own profile
        return obj == request.user
            
        return False

class ProductsView(viewsets.ModelViewSet):
    """
    API endpoint that allows products to be viewed or edited.
    """
    serializer_class = serializers.ProductSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    parser_classes = (JSONParser, MultiPartParser, FormParser)
    
    def get_queryset(self):
        queryset = models.Productos.objects.filter(is_active=True)
        
        # Filter by search query
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | 
                Q(description__icontains=search)
            )
            
        # Filter by price range
        min_price = self.request.query_params.get('min_price', None)
        max_price = self.request.query_params.get('max_price', None)
        
        if min_price is not None:
            queryset = queryset.filter(price__gte=min_price)
        if max_price is not None:
            queryset = queryset.filter(price__lte=max_price)
            
        return queryset.order_by('-createdAt')
    
    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)
    
    @action(detail=False, methods=['get'])
    def admin_list(self, request):
        """
        Admin-only endpoint to list all products, including inactive ones.
        """
        if not request.user.is_staff:
            return Response(
                {"detail": "No tiene permiso para ver todos los productos"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        queryset = models.Productos.objects.all().order_by('-createdAt')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def upload_image(self, request, pk=None):
        """
        Upload an image for a product.
        """
        product = self.get_object()
        
        if 'image' not in request.FILES:
            return Response(
                {"detail": "No se proporcionó ninguna imagen"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Delete old image if exists
        if product.image:
            if os.path.isfile(product.image.path):
                os.remove(product.image.path)
        
        # Save new image
        image_file = request.FILES['image']
        file_extension = os.path.splitext(image_file.name)[1]
        file_name = f'product_{product.id}_{int(datetime.now().timestamp())}{file_extension}'
        file_path = f'product_images/{file_name}'
        
        # Save the file
        file_path = default_storage.save(file_path, ContentFile(image_file.read()))
        
        # Update product
        product.image = file_path
        product.save()
        
        return Response({"image": product.image.url}, status=status.HTTP_200_OK)

class UsersView(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    Only admin users can list all users or create/update/delete other users.
    Regular users can only view and update their own profile.
    """
    serializer_class = serializers.UserSerializer
    permission_classes = [IsAuthenticated, IsAdminUser | IsSelfOrAdmin]
    
    def get_queryset(self):
        # Si el usuario no es administrador, solo puede ver su propio perfil
        if not (self.request.user and (self.request.user.is_staff or self.request.user.is_superuser)):
            return models.User.objects.filter(id=self.request.user.id)
            
        # Si es superusuario, puede ver todos los usuarios
        if self.request.user.is_superuser:
            return models.User.objects.all().order_by('-date_joined')
            
        # Si es staff (pero no superusuario), solo puede ver usuarios no staff
        return models.User.objects.filter(is_staff=False).order_by('-date_joined')
    
    def list(self, request, *args, **kwargs):
        # Solo los administradores pueden listar usuarios
        if not (request.user and (request.user.is_staff or request.user.is_superuser)):
            return Response(
                {"detail": "No tiene permiso para realizar esta acción."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().list(request, *args, **kwargs)
    
    def create(self, request, *args, **kwargs):
        """
        Create a new user with the specified groups and permissions.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Extraer los grupos de los datos validados
        groups_data = serializer.validated_data.pop('groups', [])
        
        # Crear el usuario
        user = models.User.objects.create_user(
            email=serializer.validated_data['email'],
            name=serializer.validated_data['name'],
            password=serializer.validated_data.get('password', None),
            is_staff=serializer.validated_data.get('is_staff', False),
            is_superuser=serializer.validated_data.get('is_superuser', False),
            is_active=serializer.validated_data.get('is_active', True)
        )
        
        # Asignar grupos al usuario
        if groups_data:
            user.groups.set(groups_data)
        
        # Preparar la respuesta
        headers = self.get_success_headers(serializer.data)
        response_serializer = self.get_serializer(user)
        
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )
    
    def update(self, request, *args, **kwargs):
        """
        Update an existing user, including their groups.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Extraer los grupos antes de validar
        groups_data = request.data.pop('groups', None)
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        # Actualizar los grupos si se proporcionaron
        if groups_data is not None:
            instance.groups.set(groups_data)
        
        self.perform_update(serializer)
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Get the current user's profile.
        """
        # Verificar si el usuario tiene un perfil de cliente
        if hasattr(request.user, 'client_profile'):
            serializer = serializers.ClientSerializer(request.user.client_profile)
        else:
            serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['put'])
    def update_profile(self, request):
        """
        Update the current user's profile.
        """
        user = request.user
        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def set_password(self, request, pk=None):
        """
        Set a new password for the user.
        """
        user = self.get_object()
        password = request.data.get('password')
        
        if not password:
            return Response(
                {"password": ["Este campo es obligatorio."]},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.set_password(password)
        user.save()
        return Response({"status": "Contraseña actualizada correctamente"})
    
    @action(detail=True, methods=['patch'])
    def update_balance(self, request, pk=None):
        """
        Update a user's balance.
        Only admin users can update a user's balance.
        """
        # Only allow admin users to update balances
        if not (request.user and (request.user.is_staff or request.user.is_superuser)):
            return Response(
                {"detail": "No tiene permiso para realizar esta acción."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get the user to update
        user = self.get_object()
        
        # Validate the request data
        balance = request.data.get('balance')
        if balance is None:
            return Response(
                {"balance": ["Este campo es obligatorio."]},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            balance = float(balance)
            if balance < 0:
                raise ValueError("El saldo no puede ser negativo.")
        except (TypeError, ValueError) as e:
            return Response(
                {"balance": ["Debe ser un número válido mayor o igual a cero."]},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update the user's balance
        user.balance = balance
        user.save()
        
        # Return the updated user data
        serializer = self.get_serializer(user)
        return Response(serializer.data)

class ClientView(viewsets.ModelViewSet):
    """
    API endpoint that allows clients to be viewed or edited.
    """
    serializer_class = serializers.ClientSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    parser_classes = (JSONParser, MultiPartParser, FormParser)
    
    def get_queryset(self):
        queryset = models.Cliente.objects.select_related('user').all()
        
        # Filter by search query
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(user__name__icontains=search) | 
                Q(telefono__icontains=search) |
                Q(correo__icontains=search)
            )
            
        return queryset.order_by('-createdAt')
    
    def perform_create(self, serializer):
        # Get the uploaded image
        image = self.request.FILES.get('image', None)
        
        # Save the client with the image if provided
        if image:
            # Generate a unique filename
            filename = f"client_images/{datetime.now().strftime('%Y%m%d%H%M%S')}_{image.name}"
            # Save the file to the storage
            file_path = default_storage.save(filename, ContentFile(image.read()))
            # Update the image path in the serializer data
            serializer.save(image=file_path)
        else:
            serializer.save()
    
    def update(self, request, *args, **kwargs):
        # Get the client instance
        instance = self.get_object()
        
        # Create a mutable copy of the request data
        data = request.data.copy()
        
        # If user data is provided in the request, ensure it's a dictionary
        if 'user' in data and isinstance(data['user'], str):
            try:
                import json
                data['user'] = json.loads(data['user'])
            except (json.JSONDecodeError, TypeError):
                pass
        
        # Get the user data if it exists
        user_data = data.get('user', {})
        
        # If email is being updated, check if it already exists
        if 'email' in user_data:
            new_email = user_data['email']
            if new_email != instance.user.email:
                if models.User.objects.filter(email__iexact=new_email).exists():
                    return Response(
                        {'user': {'email': ['A user with this email already exists.']}},
                        status=status.HTTP_400_BAD_REQUEST
                    )
        
        # Update the user instance directly
        if user_data:
            user = instance.user
            if 'name' in user_data:
                user.name = user_data['name']
            if 'email' in user_data:
                user.email = user_data['email']
            user.save()
            
            # Update the client's email if it was changed
            if 'email' in user_data:
                instance.correo = user_data['email']
            
            # Update the client's phone if it was changed
            if 'telefono' in data:
                instance.telefono = data['telefono']
                
            # Update the client's cupos if it was changed
            if 'cupos' in data:
                user.balance = data['cupos']
                user.save()
            
            # Save the client instance
            instance.save()
            
            # Return the updated data
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        
        # If no user data is provided, update the client normally
        serializer = self.get_serializer(instance, data=data, partial=kwargs.get('partial', False))
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Return the updated data
        return Response(serializer.data)
    
    def perform_update(self, serializer):
        # Get the uploaded image
        image = self.request.FILES.get('image', None)
        
        # If a new image is provided, delete the old one
        if image:
            # Delete the old image if it exists
            old_image = serializer.instance.image
            if old_image and default_storage.exists(old_image.name):
                default_storage.delete(old_image.name)
            
            # Generate a unique filename for the new image
            filename = f"client_images/{datetime.now().strftime('%Y%m%d%H%M%S')}_{image.name}"
            # Save the new file to the storage
            file_path = default_storage.save(filename, ContentFile(image.read()))
            # Update the image path in the serializer data
            serializer.save(image=file_path)
        else:
            serializer.save()
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Delete the associated image if it exists
        if instance.image and default_storage.exists(instance.image.name):
            default_storage.delete(instance.image.name)
        
        # Delete the client
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get statistics about clients.
        """
        total_clients = models.Cliente.objects.count()
        active_clients = models.User.objects.filter(is_active=True, client_profile__isnull=False).count()
        total_credit = models.Cliente.objects.aggregate(total=Sum('cupos'))['total'] or 0
        
        return Response({
            'total_clients': total_clients,
            'active_clients': active_clients,
            'total_credit': float(total_credit),
        })

class TransactsView(viewsets.ModelViewSet):
    """
    API endpoint that allows transactions to be viewed or created.
    """
    serializer_class = serializers.TransactionSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]
    
    def get_queryset(self):
        user = self.request.user
        queryset = models.Transacts.objects.select_related('product', 'buyer')
        
        # If not admin, only show user's transactions
        if not user.is_staff:
            queryset = queryset.filter(buyer=user)
            
        # Filter by date range
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        
        if start_date:
            queryset = queryset.filter(createdAt__date__gte=start_date)
        if end_date:
            # Add 1 day to include the end date
            from datetime import timedelta
            from django.utils import timezone
            try:
                end_date = timezone.datetime.strptime(end_date, '%Y-%m-%d').date() + timedelta(days=1)
                queryset = queryset.filter(createdAt__date__lt=end_date)
            except ValueError:
                pass
            
        return queryset.order_by('-createdAt')
    
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Create a new transaction.
        """
        # Obtener el producto y la cantidad de la solicitud
        product_id = request.data.get('product')
        quantity = int(request.data.get('quantity', 1))
        
        # Verificar que el producto existe y está activo
        try:
            product = models.Productos.objects.get(id=product_id, is_active=True)
        except models.Productos.DoesNotExist:
            return Response(
                {"detail": "Producto no encontrado o inactivo"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar que hay suficiente stock
        if product.stock < quantity:
            return Response(
                {"detail": f"No hay suficiente stock. Stock disponible: {product.stock}"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Obtener el perfil del cliente
        try:
            client_profile = models.Cliente.objects.get(user=request.user)
        except models.Cliente.DoesNotExist:
            return Response(
                {"detail": "Perfil de cliente no encontrado"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Calcular el total de la transacción
        subtotal = float(product.price) * quantity
        impuestos = float(product.impuestos) * quantity
        descuento = (float(product.descuento) / 100) * subtotal if product.descuento else 0
        total = subtotal + impuestos - descuento
        
        # Verificar saldo suficiente si el método de pago es con saldo
        payment_method = request.data.get('payment_method', 'credit')
        if payment_method == 'balance' and client_profile.balance < total:
            return Response(
                {"detail": f"Saldo insuficiente. Saldo disponible: {client_profile.balance}, Total: {total}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Crear la transacción
        transaction_data = {
            'product': product.id,
            'buyer': request.user.id,
            'quantity': quantity,
            'unit_price': product.price,
            'subtotal': subtotal,
            'impuestos': impuestos,
            'descuento': descuento,
            'total': total,
            'payment_method': payment_method,
            'status': 'completed'
        }
        
        serializer = self.get_serializer(data=transaction_data)
        serializer.is_valid(raise_exception=True)
        
        try:
            # Guardar la transacción
            transaction = serializer.save()
            
            # Actualizar el stock del producto
            product.stock -= quantity
            product.save()
            
            # Actualizar el saldo del cliente si el pago fue con saldo
            if payment_method == 'balance':
                client_profile.balance -= total
                client_profile.save()
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error al crear la transacción: {str(e)}")
            return Response(
                {"detail": "Error al procesar la transacción"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get transaction statistics.
        """
        from django.db.models.functions import TruncDay, TruncMonth, TruncYear
        
        user = request.user
        time_period = request.query_params.get('period', 'day')  # day, month, year
        
        # Base queryset
        if user.is_staff:
            queryset = models.Transacts.objects.all()
        else:
            queryset = models.Transacts.objects.filter(buyer=user)
        
        # Group by time period
        if time_period == 'day':
            trunc = TruncDay('createdAt')
        elif time_period == 'month':
            trunc = TruncMonth('createdAt')
        else:  # year
            trunc = TruncYear('createdAt')
        
        # Get sales data
        sales_data = queryset.annotate(
            period=trunc
        ).values('period').annotate(
            total_sales=Sum('total'),
            transaction_count=Coalesce(Count('id'), 0)
        ).order_by('period')
        
        # Get top products
        top_products = models.Transacts.objects.values('product__name').annotate(
            total_quantity=Sum('quantity'),
            total_sales=Sum('total')
        ).order_by('-total_quantity')[:5]
        
        # Get total stats
        total_sales = queryset.aggregate(total=Sum('total'))['total'] or 0
        total_transactions = queryset.count()
        
        total_stats = {
            'total_sales': total_sales,
            'total_transactions': total_transactions,
            'avg_transaction': total_sales / total_transactions if total_transactions > 0 else 0
        }
        
        return Response({
            'sales_data': list(sales_data),
            'top_products': list(top_products),
            'total_stats': total_stats
        })

class ImageView(viewsets.ViewSet):
    """
    API endpoint for handling image uploads and retrievals.
    """
    permission_classes = [IsAuthenticated]
    
    def retrieve(self, request, image_name=None):
        """
        Retrieve an image.
        """
        # Validate file extension
        valid_extensions = ['.jpg', '.jpeg', '.png', '.gif']
        ext = os.path.splitext(image_name)[1].lower()
        
        if ext not in valid_extensions:
            return Response(
                {"detail": "Formato de archivo no soportado"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Build file path
        file_path = os.path.join(settings.MEDIA_ROOT, 'images', image_name)
        
        # Check if file exists
        if not os.path.exists(file_path):
            return Response(
                {"detail": "Imagen no encontrada"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Return file
        try:
            with open(file_path, 'rb') as f:
                from django.http import FileResponse
                from mimetypes import guess_type
                
                content_type, _ = guess_type(file_path)
                response = FileResponse(f, content_type=content_type)
                response['Content-Disposition'] = f'inline; filename="{image_name}"'
                return response
        except IOError:
            return Response(
                {"detail": "Error al leer la imagen"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def create(self, request):
        """
        Upload an image.
        """
        if 'image' not in request.FILES:
            return Response(
                {"detail": "No se proporcionó ninguna imagen"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        image_file = request.FILES['image']
        
        # Validate file type
        valid_extensions = ['.jpg', '.jpeg', '.png', '.gif']
        ext = os.path.splitext(image_file.name)[1].lower()
        
        if ext not in valid_extensions:
            return Response(
                {"detail": f"Formato de archivo no soportado. Formatos permitidos: {', '.join(valid_extensions)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate unique filename
        from uuid import uuid4
        file_name = f"{uuid4().hex}{ext}"
        file_path = os.path.join('images', file_name)
        
        # Save file
        try:
            path = default_storage.save(file_path, image_file)
            url = request.build_absolute_uri(settings.MEDIA_URL + path)
            return Response({"url": url, "path": path}, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Error al guardar la imagen: {str(e)}")
            return Response(
                {"detail": "Error al guardar la imagen"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )