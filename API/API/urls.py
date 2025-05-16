
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from MAIN.views import (
    ProductsView,
    UsersView,
    ClientView,
    TransactsView,
    ImageView,
)
from MAIN.auth_views import (
    PasswordResetRequestView, 
    PasswordResetConfirmView, 
    check_reset_token,
    UserRegistrationView
)

# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r'products', ProductsView, basename='product')
router.register(r'users', UsersView, basename='user')
router.register(r'clients', ClientView, basename='client')
# Las transacciones se manejan con rutas personalizadas en MAIN/urls.py
router.register(r'images', ImageView, basename='image')

# The API URLs are now determined automatically by the router.
urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # API Authentication
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('api/auth/password-reset/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('api/auth/password-reset/confirm/<uidb64>/<token>/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('api/auth/password-reset/check/<uidb64>/<token>/', check_reset_token, name='password_reset_check'),
    path('api/auth/register/', UserRegistrationView.as_view(), name='user_register'),
    
    # API v1
    path('api/', include(router.urls)),
    path('api/', include('MAIN.urls')),  # Incluir las URLs de MAIN
    
    # User profile
    path('api/v1/users/me/', UsersView.as_view({'get': 'me'}), name='current_user'),
    path('api/v1/users/me/update/', UsersView.as_view({'put': 'update_profile'}), name='update_profile'),
    path('api/v1/users/<int:pk>/set-password/', UsersView.as_view({'post': 'set_password'}), name='set_password'),
    
    # Products
    path('api/v1/products/admin/', ProductsView.as_view({'get': 'admin_list'}), name='admin_products'),
    path('api/v1/products/<int:pk>/upload-image/', ProductsView.as_view({'post': 'upload_image'}), name='upload_product_image'),
    
    # Clients
    path('api/v1/clients/stats/', ClientView.as_view({'get': 'stats'}), name='client_stats'),
    
    # Transactions
    # path('api/v1/transactions/stats/', TransactsView.as_view({'get': 'stats'}), name='transaction_stats'),
    
    # Django REST Framework auth URLs
    path('api-auth/', include('rest_framework.urls', namespace='rest_framework')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Make sure API URLs are checked before the catch-all
urlpatterns += [
    # This should be the last URL pattern
    re_path(r'^', include('MAIN.urls')),
]
