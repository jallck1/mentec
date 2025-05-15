import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { ApiConnectService } from './api-connect.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuardAdminService {

  constructor(private router:Router, private _apiConnect:ApiConnectService) { } 
  canActivate(
    next: ActivatedRouteSnapshot,  
    state: RouterStateSnapshot): boolean {
      console.log('=== Admin Guard Activated ===');
      console.log('Route:', state.url);
      
      // Intentar obtener el token de sessionStorage o localStorage
      let token = sessionStorage.getItem('tkn');
      console.log('Token from sessionStorage:', token ? 'Found' : 'Not found');
      
      if (!token) {
        token = localStorage.getItem('access_token');
        console.log('Token from localStorage:', token ? 'Found' : 'Not found');
        
        if (!token) {
          console.error('No se encontró token de autenticación');
          this.router.navigate(['/login']);
          return false;
        }
      }
      
      try {
        console.log('Decoding token...');
        const objectDecoded: any = this._apiConnect.decodeCookie();
        console.log('Token decodificado en guardia admin:', objectDecoded);
        
        if (!objectDecoded) {
          console.error('No se pudo decodificar el token');
          this.router.navigate(['/login']);
          return false;
        }
        
        // Verificar si el usuario tiene el grupo 'admin'
        if (objectDecoded.groups) {
          const groups = Array.isArray(objectDecoded.groups) ? objectDecoded.groups : [objectDecoded.groups];
          console.log('User groups:', groups);
          
          if (groups.includes('admin')) {
            console.log('User is admin, access granted');
            return true;
          }
        }
        
        console.warn('Usuario sin permisos de administrador. Grupos:', objectDecoded.groups || 'No groups found');
        this.router.navigate(['/login']);
        return false;
      } catch (error) {
        console.error('Error al decodificar el token:', error);
        this.router.navigate(['/login']);
        return false;
      }
  }
}
