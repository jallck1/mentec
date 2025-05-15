import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApiConnectService {
  private readonly baseUrl = 'http://127.0.0.1:8000/api';

  constructor(
    private _http: HttpClient,
    private router: Router
  ) {}

  // Obtener el token de acceso del almacenamiento local o de sesión
  get accessToken(): string | null {
    return sessionStorage.getItem('tkn') || localStorage.getItem('access_token');
  }

  // Verificar si el usuario está autenticado
  isAuthenticated(): boolean {
    const token = this.accessToken;
    if (!token) return false;

    try {
      const decoded: any = this.decodeCookie();
      return decoded && decoded.exp * 1000 > Date.now();
    } catch (e) {
      return false;
    }
  }

  // Obtener información del usuario actual
  getCurrentUser(): any {
    return this.decodeCookie();
  }

  // Método para manejar la autenticación
  login(credentials: { email: string; password: string; username?: string }): Observable<any> {
    return this._http.post(`${this.baseUrl}/auth/token/`, credentials).pipe(
      catchError(error => this.handleError(error))
    );
  }

  // Método para refrescar el token
  refreshToken(refresh: string): Observable<any> {
    return this._http.post(`${this.baseUrl}/auth/token/refresh/`, { refresh }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  // Método genérico para peticiones GET
  get<T>(endpoint: string, params?: any): Observable<T> {
    // Si el endpoint comienza con http, usarlo directamente
    let url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/v1/') ? '' : '/v1/'}${endpoint}`;
    
    // Asegurarse de que no haya doble barra en la URL
    url = url.replace(/([^:]\/)\/+/g, '$1');
    
    return this._http.get<T>(url, {
      headers: this.getAuthHeaders(),
      params: this.createParams(params)
    }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  // Método genérico para peticiones POST
  post<T>(endpoint: string, data: any): Observable<T> {
    let url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/v1/') ? '' : '/v1/'}${endpoint}`;
    // Asegurarse de que no haya doble barra en la URL
    url = url.replace(/([^:]\/)\/+/g, '$1');
    
    return this._http.post<T>(url, data, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  // Método genérico para peticiones PUT
  put<T>(endpoint: string, data: any): Observable<T> {
    let url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/v1/') ? '' : '/v1/'}${endpoint}`;
    // Asegurarse de que no haya doble barra en la URL
    url = url.replace(/([^:]\/)\/+/g, '$1');
    
    return this._http.put<T>(url, data, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  // Método genérico para peticiones DELETE
  delete<T>(endpoint: string): Observable<T> {
    let url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/v1/') ? '' : '/v1/'}${endpoint}`;
    // Asegurarse de que no haya doble barra en la URL
    url = url.replace(/([^:]\/)\/+/g, '$1');
    
    return this._http.delete<T>(url, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  // Método para subir un archivo con datos adicionales
  postFile<T = any>(endpoint: string, formData: FormData, method: 'POST' | 'PUT' = 'POST'): Observable<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/v1/') ? '' : '/v1/'}${endpoint}`;
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.accessToken}`
    });

    let request: Observable<any>;
    if (method === 'PUT') {
      request = this._http.put<T>(url, formData, { headers });
    } else {
      request = this._http.post<T>(url, formData, { headers });
    }

    return request.pipe(
      catchError(error => this.handleError(error))
    );
  }

  // Método para subir un archivo con datos adicionales (compatibilidad hacia atrás)
  uploadFile<T = any>(endpoint: string, file: File, data: any): Observable<T> {
    const formData = new FormData();
    formData.append('image', file);
    
    // Agregar datos adicionales al formData
    Object.keys(data).forEach(key => {
      formData.append(key, data[key]);
    });

    return this.postFile<T>(endpoint, formData);
  }

  // Método para obtener la URL completa de una imagen
  getImageUrl(path: string): string {
    if (!path) return 'assets/images/placeholder.png'; // Imagen por defecto
    return path.startsWith('http') ? path : `${this.baseUrl}${path}`;
  }

  // Método para manejar errores
  private handleError(error: HttpErrorResponse | any) {
    let errorMessage = 'Ocurrió un error inesperado';
    
    if (error instanceof HttpErrorResponse) {
      // Error del lado del servidor
      console.error(`Backend returned code ${error.status}, body was:`, error.error);
      
      if (error.status === 0) {
        // Error de conexión
        errorMessage = 'No se pudo conectar al servidor. Verifica tu conexión a internet.';
      } else if (error.status === 401) {
        // Token expirado o no válido
        errorMessage = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
        this.logout();
      } else if (error.status === 403) {
        // No autorizado
        errorMessage = 'No tienes permiso para realizar esta acción.';
      } else if (error.status === 404) {
        // Recurso no encontrado
        errorMessage = 'El recurso solicitado no fue encontrado.';
      } else if (error.status >= 500) {
        // Error del servidor
        errorMessage = 'Error en el servidor. Por favor, inténtalo de nuevo más tarde.';
      }
      
      // Intentar obtener el mensaje de error del servidor
      if (error.error && typeof error.error === 'object') {
        if (error.error.message) {
          errorMessage = error.error.message;
        } else if (error.error.detail) {
          errorMessage = error.error.detail;
        }
      }
    } else {
      // Error del lado del cliente
      console.error('An error occurred:', error);
      errorMessage = error.message || 'Ocurrió un error inesperado';
    }
    
    return throwError(() => new Error(errorMessage));
  }

  // Cerrar sesión
  logout(): void {
    // Limpiar tokens del almacenamiento local y de sesión
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    sessionStorage.removeItem('tkn');
    sessionStorage.removeItem('refresh_token');
    
    // Forzar una recarga completa de la página para limpiar el estado de la aplicación
    window.location.href = '/login';
  }

  // Obtener encabezados de autenticación
  private getAuthHeaders(json: boolean = true): HttpHeaders {
    let headers = new HttpHeaders();
    
    if (this.accessToken) {
      headers = headers.set('Authorization', `Bearer ${this.accessToken}`);
    }
    
    if (json) {
      headers = headers.set('Content-Type', 'application/json');
    }
    
    return headers;
  }

  // Crear parámetros de consulta
  private createParams(params: any): HttpParams {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    return httpParams;
  }

  // Métodos adicionales para compatibilidad
  getSecure<T>(endpoint: string): Observable<T> {
    return this.get<T>(endpoint);
  }

  postSecure<T>(endpoint: string, data: any): Observable<T> {
    return this.post<T>(endpoint, data);
  }

  deleteSecure<T>(endpoint: string): Observable<T> {
    return this.delete<T>(endpoint);
  }

  // Decodificar cookie de autenticación
  decodeCookie(): any {
    const token = this.accessToken;
    if (!token) return null;
    
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(window.atob(base64));
    } catch (e) {
      console.error('Error al decodificar el token:', e);
      return null;
    }
  }

  // Obtener reporte en Excel
  getExcelReport(endpoint: string): Observable<Blob> {
    return this._http.get(`${this.baseUrl}${endpoint}`, {
      headers: this.getAuthHeaders(),
      responseType: 'blob'
    }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  // Propiedad host para compatibilidad
  get host(): string {
    return this.baseUrl;
  }
}
