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
      next: (user: any) => {
        console.log('Login successful:', user);
        this.loading = false;
        
        if (user) {
          console.log('User data received:', user);
          const role = this.authService.getUserRole();
          console.log('User role:', role);
          
          // Redirect based on role
          if (role === 'admin') {
            console.log('Redirecting to admin dashboard');
            this.router.navigate(['/admin']).then(success => {
              console.log('Admin navigation result:', success);
              if (!success) {
                console.error('Admin navigation failed');
              }
            });
          } else if (role === 'buyer') {
            console.log('Redirecting to buyer dashboard');
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
          
          // Refresh user data after successful login
          this.authService.refreshUser().subscribe({
            next: (refreshedUser) => {
              console.log('User data refreshed:', refreshedUser);
            },
            error: (error) => {
              console.error('Error refreshing user data:', error);
            }
          });
        }
      },
      error: (error: any) => {
        console.error('Login error:', error);
        this.loading = false;
        this.errorMessage = error.error?.detail || 'Error al iniciar sesión';
      }
    });
  }
}
