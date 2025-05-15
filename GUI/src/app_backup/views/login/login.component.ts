import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CookieService } from 'ngx-cookie-service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private cookieService: CookieService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      rememberMe: [false]
    });
  }

  ngOnInit(): void {
    // Clear any saved email if user is not logged in
    if (!this.authService.currentUserValue) {
      localStorage.removeItem('savedEmail');
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.errorMessage = null;

    const { email, password, rememberMe } = this.loginForm.value;

    console.log('Intentando login con:', { email, password, rememberMe });
    this.authService.login(email, password, rememberMe).subscribe({
      next: (res) => {
        console.log('Respuesta login:', res);
        if (res && res.access_token) {
          this.cookieService.set('access_token', res.access_token, { secure: true, sameSite: 'Strict' });
          localStorage.setItem('user_role', res.user.is_staff ? 'admin' : 'user');
          this.router.navigate([res.user.is_staff ? '/admin' : '/dashboard']);
        }
      },
      error: (error) => {
        console.error('Error en login:', error);
        this.loading = false;
        this.errorMessage = error.error?.detail || 'Error de conexión';
        this.snackBar.open('Error de inicio de sesión', 'Cerrar', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }
}
