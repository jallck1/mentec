import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';

export interface User {
  id: number;
  email: string;
  name: string;
  balance: number;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  access: string;
  refresh: string;
  groups: string[];
  permissions: string[];
  last_login: string | null;
  date_joined: string | null;
  cliente?: {
    telefono: string;
    correo: string;
    cupos: number;
    image?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadUserFromStorage();
  }

  // Getters
  get currentUser$(): Observable<User | null> {
    return this.currentUserSubject.asObservable();
  }

  getUser(): User | null {
    return this.currentUserSubject.value;
  }

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  // Authentication checks
  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.currentUserSubject.value;
    return !!token && !!user;
  }

  isBuyer(): boolean {
    const user = this.currentUserSubject.value;
    return !!user && !user.is_superuser && !user.is_staff;
  }

  isAdministrator(): boolean {
    const user = this.currentUserSubject.value;
    return !!user && (user.is_superuser || user.is_staff);
  }

  // Token management
  private getHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  // User data management
  private loadUserFromStorage(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      this.currentUserSubject.next(user);
    }
  }

  getUserRole(): string {
    const user = this.currentUserSubject.value;
    if (!user) {
      console.error('No user data available');
      return '';
    }

    console.log('Checking user role:', {
      id: user.id,
      email: user.email,
      is_staff: user.is_staff,
      is_superuser: user.is_superuser
    });

    if (user.is_superuser || user.is_staff) {
      console.log('User is admin');
      return 'admin';
    }

    console.log('User is buyer');
    return 'buyer';
  }

  // API Methods
  login(email: string, password: string): Observable<User> {
    const credentials = { email, password };
    return this.http.post<User>(`${this.apiUrl}/auth/token/`, credentials).pipe(
      tap((response: any) => {
        // Verificar que la respuesta tenga la estructura esperada
        if (!response || !response.user) {
          console.error('Invalid login response:', response);
          throw new Error('Invalid login response');
        }

        const user = response.user;
        console.log('Login successful:', {
          id: user.id,
          email: user.email,
          is_staff: user.is_staff,
          is_superuser: user.is_superuser
        });

        // Guardar tokens
        localStorage.setItem('token', response.access);
        localStorage.setItem('refresh_token', response.refresh);

        // Guardar usuario
        localStorage.setItem('user', JSON.stringify(user));
        this.currentUserSubject.next(user);

        // Verificar rol
        const role = this.getUserRole();
        console.log('User role determined:', role);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Login error:', error.error);
        return throwError(() => new Error(error.error.detail || 'Login failed'));
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }





  changePassword(passwordData: {
    old_password: string;
    new_password: string;
  }): Observable<void> {
    const user = this.currentUserSubject.value;
    if (!user) {
      return throwError(() => new Error('No user data'));
    }
    return this.http.post<void>(`${this.apiUrl}/auth/change_password/`, passwordData, {
      headers: this.getHeaders()
    });
  }





  // User management methods
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users/`, {
      headers: this.getHeaders()
    });
  }

  createUser(userData: Partial<User>): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users/`, userData, {
      headers: this.getHeaders()
    }).pipe(
      tap((user: User) => {
        this.currentUserSubject.next(user);
        localStorage.setItem('user', JSON.stringify(user));
      })
    );
  }

  updateUser(userId: number, userData: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/users/${userId}/`, userData, {
      headers: this.getHeaders()
    }).pipe(
      tap((updatedUser: User) => {
        this.currentUserSubject.next(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      })
    );
  }

  deleteUser(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${userId}/`, {
      headers: this.getHeaders()
    });
  }

  getUserId(): number | null {
    const user = this.currentUserSubject.value;
    return user ? user.id : null;
  }

  // Refresh token before it expires
  refreshToken(): Observable<any> {
    if (!this.isAuthenticated()) {
      return of(null);
    }

    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post(`${this.apiUrl}/auth/token/refresh/`, {
      refresh: refreshToken
    }).pipe(

      catchError(error => {
        this.logout();
        return throwError(() => error);
      })
    );
  }
}
