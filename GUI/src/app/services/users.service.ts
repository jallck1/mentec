import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getUserProfile(): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/me/`);
  }

  getUserTransactions(): Observable<any> {
    return this.http.get(`${this.apiUrl}/transacts/?buyer=${localStorage.getItem('userId')}`);
  }

  updateUser(userId: number, userData: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/users/${userId}/`, userData);
  }

  changePassword(passwordData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/change-password/`, passwordData);
  }
}
