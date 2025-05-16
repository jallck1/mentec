import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  impuestos: number;
  descuento: number;
  stock: number;
  image: string;
  creator: number;
  createdAt: string;
  updatedAt: string;
  is_active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
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

  private handleError(error: any): Observable<never> {
    console.error('Error en el servicio:', error);
    return throwError(() => new Error(error.message || 'Error desconocido'));
  }

  getProducts(params?: {
    page?: number;
    search?: string;
    category?: string;
    sort?: string;
  }): Observable<Product[]> {
    const queryParams = new URLSearchParams();
    if (params) {
      if (params.page) queryParams.set('page', params.page.toString());
      if (params.search) queryParams.set('search', params.search);
      if (params.category) queryParams.set('category', params.category);
      if (params.sort) queryParams.set('sort', params.sort);
    }

    return this.http.get<Product[]>(`${this.apiUrl}/products/`, {
      params: queryParams.toString() ? { params: queryParams.toString() } : undefined,
      headers: this.getHeaders()
    }).pipe(
      catchError((error: any) => this.handleError(error))
    );
  }

  getCategories(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/categories/`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error al obtener categorías:', error);
        return throwError(() => error);
      })
    );
  }

  getProduct(id: number): Observable<{ id: number, name: string }> {
    return this.http.get<Product>(`${this.apiUrl}/products/${id}/`, {
      headers: this.getHeaders()
    }).pipe(
      map((product: Product) => ({
        id: product.id,
        name: product.name
      })),
      catchError(this.handleError)
    );
  }

  createProduct(product: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(`${this.apiUrl}/products/`, product, {
      headers: this.getHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error al crear producto:', error);
        return throwError(() => error);
      })
    );
  }

  updateProduct(id: number, product: Partial<Product>): Observable<Product> {
    return this.http.patch<Product>(`${this.apiUrl}/products/${id}/`, product, {
      headers: this.getHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error al actualizar producto:', error);
        return throwError(() => error);
      })
    );
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/products/${id}/`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error al eliminar producto:', error);
        return throwError(() => error);
      })
    );
  }

  calculateFinalPrice(price: number, impuestos: number, descuento: number): number {
    const taxAmount = price * (impuestos / 100);
    const discountAmount = price * (descuento / 100);
    return Number((price + taxAmount - discountAmount).toFixed(2));
  }
}
