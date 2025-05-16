from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group
from django.utils.translation import gettext_lazy as _
from . import models

# Desregistrar el modelo Group por defecto
admin.site.unregister(Group)

# Registrar los modelos restantes
admin.site.register([models.Productos, models.Transacts, models.Cliente])

# Personalizar la interfaz de administración de usuarios
@admin.register(models.User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'name', 'is_staff', 'is_superuser', 'is_active', 'date_joined')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'groups')
    search_fields = ('email', 'name')
    ordering = ('-date_joined',)
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        (_('Personal info'), {'fields': ('name',)}),
        (_('Permissions'), {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        (_('Important dates'), {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'name', 'password1', 'password2', 'is_staff', 'is_superuser', 'groups'),
        }),
    )

# Crear grupos por defecto si no existen
def create_default_groups():
    from django.contrib.auth.models import Group, Permission
    
    # Grupo de administradores
    admin_group, created = Group.objects.get_or_create(name='admin')
    if created:
        print("Grupo 'admin' creado exitosamente")
    
    # Grupo de compradores
    buyer_group, created = Group.objects.get_or_create(name='buyer')
    if created:
        print("Grupo 'buyer' creado exitosamente")
    
    # Asignar todos los permisos al grupo de administradores
    admin_group.permissions.set(Permission.objects.all())

# Llamar a la función para crear los grupos por defecto
create_default_groups()
