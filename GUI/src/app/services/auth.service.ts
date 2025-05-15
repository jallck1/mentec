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
  role: 'admin' | 'user';
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
    const user = this.currentUserSubject.value;
    return !!user;
  }

  isAdministrator(): boolean {
    const user = this.currentUserSubject.value;
    return user?.is_admin || false;
  }

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    const user = localStorage.getItem('user');
    this.currentUserSubject = new BehaviorSubject<User | null>(user ? JSON.parse(user) : null);
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
    return this.http.post<User>(`${this.apiUrl}/auth/login/`, {
      email,
      password
    }).pipe(
      tap((user: User) => {
        localStorage.setItem('token', user.token);
        localStorage.setItem('user', JSON.stringify(user));
        this.currentUserSubject.next(user);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
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

  getUserRole(): string {
    return localStorage.getItem('userRole') || '';
  }
}
