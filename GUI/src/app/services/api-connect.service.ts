import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import jwtDecode from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class ApiConnectService  {

  private transactionUpdate = new BehaviorSubject<boolean>(false);
  transactionUpdate$ = this.transactionUpdate.asObservable();

  constructor(private _http: HttpClient) { }

  host = "http://127.0.0.1:8000/";

  decodeCookie() {
    const token = sessionStorage.getItem('tkn');
    return token ? jwtDecode(token) : {};
  }

  getNormalData(nombre: string) {
    return this._http.get(`${this.host}mensaje/${nombre}`);
  }

  getSecure(path: string) {
    return this._http.get(`${this.host}${path}`);
  }

  postSecure(path: string, data: any) {
    return this._http.post(`${this.host}${path}`, data).pipe();
  }

  post(path: string, data: any) {
    return this._http.post(`${this.host}${path}`, data);
  }

  putSecure(path: string, data: any) {
    return this._http.put(`${this.host}${path}`, data).pipe();
  }

  deleteSecure(path: string) {
    return this._http.delete(`${this.host}${path}`).pipe();
  }

  getExcelReport(path: string) {
    return this._http.get(this.host + path, { responseType: 'blob' });
  }

  // 🔹 Método para notificar actualización de transacciones
  notifyTransactionUpdate() {
    this.transactionUpdate.next(true);
  }
}
