import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

import { Product } from './products.service';

export interface ProductReference {
  id: number;
  name: string;
}

export interface Transaction {
  id: number;
  product: number | ProductReference;
  buyer: number;
  quantity: number;
  unit_price: number;
  impuestos: number;
  descuento: number;
  total: number;
  payment_method: 'credit' | 'visa';
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class TransactionsService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    return headers;
  }

  getProducts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/products/`, {
      headers: this.getHeaders()
    });
  }

  getTransactions(): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${this.apiUrl}/transacts/`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error fetching transactions:', error);
        return throwError(error);
      })
    );
  }

  getTransaction(id: number): Observable<Transaction> {
    return this.http.get<Transaction>(`${this.apiUrl}/transactions/${id}/`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(error => {
        console.error(`Error fetching transaction ${id}:`, error);
        return throwError(error);
      })
    );
  }

  createTransaction(transaction: Partial<Transaction>): Observable<Transaction> {
    return this.http.post<Transaction>(`${this.apiUrl}/transactions/`, transaction, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => {
        console.log('Transaction created successfully:', response);
      }),
      catchError(error => {
        console.error('Error creating transaction:', error);
        return throwError(error);
      })
    );
  }

  updateTransaction(id: number, transaction: Partial<Transaction>): Observable<Transaction> {
    return this.http.patch<Transaction>(`${this.apiUrl}/transactions/${id}/`, transaction, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => {
        console.log(`Transaction ${id} updated successfully:`);
      }),
      catchError(error => {
        console.error(`Error updating transaction ${id}:`, error);
        return throwError(error);
      })
    );
  }

  deleteTransaction(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/transactions/${id}/`, {
      headers: this.getHeaders()
    }).pipe(
      tap(() => {
        console.log(`Transaction ${id} deleted successfully`);
      }),
      catchError(error => {
        console.error(`Error deleting transaction ${id}:`, error);
        return throwError(error);
      })
    );
  }

  calculateTransactionTotal(
    unitPrice: number,
    quantity: number,
    impuestos: number,
    descuento: number
  ): number {
    const totalPrice = unitPrice * quantity;
    const taxAmount = totalPrice * (impuestos / 100);
    const discountAmount = totalPrice * (descuento / 100);
    return Number((totalPrice + taxAmount - discountAmount).toFixed(2));
  }
}
