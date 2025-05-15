import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UsersService } from '../../../services/users.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  user: any = {};
  transactions: any[] = [];
  loading = true;
  error = '';
  profileForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private usersService: UsersService
  ) {
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    this.loadProfile();
    this.loadTransactions();
  }

  private loadProfile(): void {
    this.usersService.getUserProfile().subscribe(
      (response) => {
        this.user = response;
        localStorage.setItem('userId', this.user.id.toString());
        this.profileForm.patchValue({
          name: this.user.name,
          email: this.user.email
        });
      },
      (error) => {
        console.error('Error al cargar el perfil:', error);
        this.error = 'Error al cargar el perfil';
      }
    );
  }

  private loadTransactions(): void {
    this.loading = true;
    this.usersService.getUserTransactions().subscribe(
      (response) => {
        this.transactions = response;
        this.loading = false;
      },
      (error) => {
        console.error('Error al cargar las transacciones:', error);
        this.loading = false;
        this.error = 'Error al cargar las transacciones';
      }
    );
  }

  updateProfile(): void {
    if (this.profileForm.valid) {
      const updatedUser = {
        name: this.profileForm.value.name,
        email: this.profileForm.value.email
      };

      this.usersService.updateUser(this.user.id, updatedUser).subscribe(
        () => {
          this.user.name = this.profileForm.value.name;
          this.user.email = this.profileForm.value.email;
          alert('Perfil actualizado exitosamente');
        },
        (error) => {
          console.error('Error al actualizar el perfil:', error);
          this.error = 'Error al actualizar el perfil';
        }
      );
    }
  }

  changePassword(): void {
    const { currentPassword, newPassword, confirmPassword } = this.profileForm.value;

    if (newPassword !== confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }

    const passwordData = {
      currentPassword,
      newPassword
    };

    this.usersService.changePassword(passwordData).subscribe(
      () => {
        alert('Contraseña cambiada exitosamente');
        this.profileForm.patchValue({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      },
      (error) => {
        this.error = 'Error al cambiar la contraseña';
      }
    );
  }

  getBalance(): number {
    return this.user?.balance || 0;
  }

  getStatusClass(status: string): string {
    return {
      pending: 'warning',
      completed: 'success',
      cancelled: 'danger'
    }[status] || 'secondary';
  }

  getStatusLabel(status: string): string {
    return {
      pending: 'Pendiente',
      completed: 'Completado',
      cancelled: 'Cancelado'
    }[status] || 'Desconocido';
  }
}
