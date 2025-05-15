import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<any>;
  public currentUser: Observable<any>;
  public redirectUrl: string = '';
  private apiUrl = 'http://localhost:8000/api/';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.currentUserSubject = new BehaviorSubject<any>(JSON.parse(localStorage.getItem('currentUser') || 'null'));
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue() {
    return this.currentUserSubject.value;
  }

  login(email: string, password: string, rememberMe: boolean = false) {
    return this.http.post<any>(this.apiUrl + 'login/', { email, password })
      .pipe(map(response => {
        // Store user details and jwt token in local storage to keep user logged in between page refreshes
        if (response && response.access) {
          const user = {
            email: email,
            token: response.access,
            refresh: response.refresh
          };
          
          if (rememberMe) {
            localStorage.setItem('currentUser', JSON.stringify(user));
            localStorage.setItem('savedEmail', email);
          } else {
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            localStorage.removeItem('savedEmail');
          }
          
          this.currentUserSubject.next(user);
        }
        return response;
      }));
  }

  getCurrentUser() {
    return this.http.get(this.apiUrl + 'user/');
  }

  logout() {
    // Remove user from local storage and set current user to null
    return this.http.post(this.apiUrl + 'logout/', {})
      .pipe(map(() => {
        localStorage.removeItem('currentUser');
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
      }));
  }

  socialLogin(provider: string, token: string) {
    return this.http.post<any>('api/account/social-login', { provider, token })
      .pipe(map(user => {
        if (user && user.token) {
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.currentUserSubject.next(user);
        }
        return user;
      }));
  }
}
