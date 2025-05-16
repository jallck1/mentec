import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../services/auth.service';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  loading = true;
  error = '';
  selectedUser: User | null = null;
  userForm: FormGroup;

  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.userForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email, Validators.pattern('^[^\s@]+@[^\s@]+\.[^\s@]+$')]],
      password: ['', [Validators.minLength(6), Validators.maxLength(100)]],
      is_admin: [false],
      is_staff: [false],
      is_superuser: [false],
      is_active: [true],
      balance: [0, [Validators.required, Validators.min(0), Validators.max(1000000)]]
    });

    // Watch for changes in is_admin to update is_staff and is_superuser
    this.userForm.get('is_admin')?.valueChanges.subscribe(isAdmin => {
      if (isAdmin) {
        this.userForm.get('is_staff')?.setValue(true);
        this.userForm.get('is_superuser')?.setValue(true);
      } else {
        this.userForm.get('is_staff')?.setValue(false);
        this.userForm.get('is_superuser')?.setValue(false);
      }
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.error = '';

    this.authService.getUsers().subscribe(
      (response: any) => {
        // Asegurarnos de que recibimos un array
        if (Array.isArray(response)) {
          this.users = response;
        } else if (response.results) { // Si viene en formato paginado
          this.users = response.results;
        } else {
          this.users = [];
        }
        this.loading = false;
      },
      (error: any) => {
        this.error = 'Error al cargar los usuarios: ' + error.message;
        this.loading = false;
        console.error('Error:', error);
      }
    );
  }

  selectUser(user: User): void {
    this.selectedUser = user;
    this.userForm.patchValue({
      name: user.name,
      email: user.email,
      is_admin: user.is_staff || user.is_superuser, // Si es staff o superuser, es admin
      is_active: user.is_active,
      balance: user.balance
    });

    // No necesitamos los valueChanges ya que solo tenemos un campo de rol ahora
  }

  createUser(): void {
    if (this.userForm.invalid) {
      return;
    }

    const userData = {
      ...this.userForm.value,
      is_staff: this.userForm.value.is_admin, // Convertir is_admin a is_staff
      is_admin: this.userForm.value.is_admin, // Mantener is_admin para el frontend
      is_superuser: this.userForm.value.is_admin // Mantener consistencia con el backend
    };
    
    this.authService.createUser(userData).subscribe(
      (user: User) => {
        this.users.unshift(user);
        this.clearForm();
        alert('Usuario creado exitosamente');
      },
      (error: any) => {
        console.error('Error al crear el usuario:', error);
        this.error = error.error?.detail || 'Error al crear el usuario';
      }
    );
  }

  updateUser(): void {
    if (!this.selectedUser || this.userForm.invalid) {
      return;
    }

    const userData = {
      ...this.userForm.value,
      is_staff: this.userForm.value.is_admin, // Convertir is_admin a is_staff
      is_admin: this.userForm.value.is_admin, // Mantener is_admin para el frontend
      is_superuser: this.userForm.value.is_admin // Mantener consistencia con el backend
    };
    
    this.authService.updateUser(this.selectedUser.id, userData).subscribe(
      (user: User) => {
        const index = this.users.findIndex(u => u.id === user.id);
        if (index !== -1) {
          this.users[index] = user;
        }
        this.clearForm();
        alert('Usuario actualizado exitosamente');
      },
      (error: any) => {
        this.error = 'Error al actualizar el usuario';
      }
    );
  }

  deleteUser(user: User): void {
    const confirm = window.confirm('¿Estás seguro de que deseas eliminar este usuario?');
    if (!confirm) return;

    this.authService.deleteUser(user.id).subscribe(
      () => {
        const index = this.users.findIndex(u => u.id === user.id);
        if (index !== -1) {
          this.users.splice(index, 1);
        }
        alert('Usuario eliminado exitosamente');
      },
      (error: any) => {
        this.error = 'Error al eliminar el usuario';
      }
    );
  }

  clearForm(): void {
    this.userForm.reset();
    this.selectedUser = null;
  }

  getUserStatusClass(user: User): string {
    return user.is_active ? 'text-success' : 'text-danger';
  }

  getUserRole(user: User): string {
    return user.is_superuser || user.is_staff ? 'Administrador' : 'Comprador';
  }
}
