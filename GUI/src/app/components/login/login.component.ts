import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  errorMessage: string = '';
  loading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    }, {
      updateOn: 'change'
    });

    // Subscribe to form value changes to update the button state
    this.loginForm.valueChanges.subscribe(() => {
      this.loading = false;
    });
  }

  ngOnInit(): void {
    // If user is already logged in, redirect to home
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/']);
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;
    
    console.log('Attempting login with:', { email, password: '*****' });

    this.authService.login(email, password).subscribe({
      next: (response: any) => {
        console.log('Login response:', response);
        
        if (response && response.user) {
          const user = response.user;
          console.log('User data from backend:', {
            id: user.id,
            email: user.email,
            is_staff: user.is_staff,
            is_superuser: user.is_superuser,
            is_active: user.is_active
          });
          
          // Store user data in localStorage
          localStorage.setItem('user', JSON.stringify(user));
          
          // Get user role
          const role = this.authService.getUserRole();
          console.log('User role determined:', role);
          
          // Debug navigation
          console.log('Starting navigation...');
          
          // Redirect based on role
          if (role === 'admin') {
            console.log('User is admin, redirecting to admin dashboard');
            this.router.navigate(['/admin']).then(success => {
              console.log('Admin navigation result:', success);
              if (!success) {
                console.error('Admin navigation failed');
              }
            });
          } else if (role === 'buyer') {
            console.log('User is buyer, redirecting to buyer dashboard');
            this.router.navigate(['/buyers']).then(success => {
              console.log('Buyer navigation result:', success);
              if (!success) {
                console.error('Buyer navigation failed');
              }
            });
          } else {
            console.error('Unknown role:', role);
            this.router.navigate(['/login']);
          }
        } else {
          console.error('Invalid login response:', response);
          this.errorMessage = 'Error al procesar la respuesta del servidor';
        }
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Login error:', error);
        this.loading = false;
        this.errorMessage = error.error?.detail || 'Error al iniciar sesión';
      }
    });
  }
}
