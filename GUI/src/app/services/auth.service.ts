import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  email: string;
  name: string;
  balance: number;
  is_admin: boolean;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  role: 'admin' | 'buyer';
  token: string;
  cupos: number;
  date_joined: string;
  last_login: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject: BehaviorSubject<User | null>;

  get currentUser$(): Observable<User | null> {
    return this.currentUserSubject.asObservable();
  }

  getUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    const user = this.currentUserSubject.value;
    return !!token && !!user;
  }

  isAdministrator(): boolean {
    const user = this.currentUserSubject.value;
    return !!user && (user.is_admin || user.is_superuser || user.is_staff);
  }

  // Add a method to refresh the user data
  refreshUser(): Observable<User | null> {
    if (!this.isAuthenticated()) {
      return of(null);
    }

    const token = localStorage.getItem('token');
    return this.http.get<User>(`${this.apiUrl}/users/me/`, {
      headers: this.getHeaders()
    }).pipe(
      tap((user: User) => {
        localStorage.setItem('user', JSON.stringify(user));
        this.currentUserSubject.next(user);
      }),
      catchError(error => {
        console.error('Error refreshing user:', error);
        this.logout();
        return throwError(() => error);
      })
    );
  }

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (token && user) {
      const parsedUser = JSON.parse(user);
      this.currentUserSubject = new BehaviorSubject<User | null>(parsedUser);
    } else {
      this.currentUserSubject = new BehaviorSubject<User | null>(null);
    }

    // Actualizar el usuario automáticamente si hay token
    if (token) {
      this.refreshUser().subscribe();
    }
  }

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users/`, {
      headers: this.getHeaders()
    });
  }

  createUser(userData: Partial<User>): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users/`, userData, {
      headers: this.getHeaders()
    });
  }

  deleteUser(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${userId}/`, {
      headers: this.getHeaders()
    });
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  login(email: string, password: string): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/auth/token/`, {
      email,
      password
    }).pipe(
      map((response: any) => {
        console.log('Login response:', response);
        const user = response.user;
        
        // Ensure we have all required fields
        user.id = user.id || response.user_id;
        user.role = user.role || (user.is_admin || user.is_staff || user.is_superuser ? 'admin' : 'buyer');
        
        // Store token and user data
        localStorage.setItem('token', response.access);
        localStorage.setItem('refresh_token', response.refresh);
        localStorage.setItem('user', JSON.stringify(user));
        this.currentUserSubject.next(user);
        
        // Start token refresh timer
        const expiresIn = response.expires_in || 3600;
        setTimeout(() => this.refreshToken(), expiresIn * 1000 - 300000); // Refresh 5 minutes before expiration
        
        return user;
      }),
      catchError(error => {
        console.error('Error al iniciar sesión:', error);
        throw error;
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

  getUserId(): number | null {
    return this.currentUserSubject.value?.id || null;
  }

  updateUserBalance(userId: number, amount: number): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/users/${userId}/update_balance/`, {
      amount
    }, {
      headers: this.getHeaders()
    });
  }

  public getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    return headers;
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

  changePassword(passwordData: {
    currentPassword: string;
    newPassword: string;
  }): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/auth/change_password/`, passwordData, {
      headers: this.getHeaders()
    });
  }

  getUserRole(): 'admin' | 'buyer' | '' {
    const user = this.getUser();
    return user?.role || '';
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
      tap((response: any) => {
        localStorage.setItem('token', response.access);
        const currentUser = this.currentUserSubject.value;
        if (currentUser) {
          currentUser.token = response.access;
          this.currentUserSubject.next(currentUser);
        }
      }),
      catchError(error => {
        this.logout();
        return throwError(() => error);
      })
    );
  }
}
