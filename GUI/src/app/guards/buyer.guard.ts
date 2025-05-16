import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class BuyerGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    console.log('BuyerGuard: Checking access for route:', state.url);
    
    // Get the current user observable
    return this.authService.currentUser$.pipe(
      map(user => {
        if (!user) {
          console.error('BuyerGuard: No user data');
          this.router.navigate(['/login']);
          return false;
        }

        // Verificar que el usuario tenga las propiedades requeridas
        if (!user.id || !user.email || user.is_staff === undefined || user.is_superuser === undefined) {
          console.error('BuyerGuard: User missing required properties');
          console.error('User data:', {
            id: user.id,
            email: user.email,
            is_staff: user.is_staff,
            is_superuser: user.is_superuser
          });
          this.router.navigate(['/login']);
          return false;
        }

        // Verificar que la ruta sea válida para el buyer
        const isValidBuyerRoute = state.url.startsWith('/buyer');
        if (!isValidBuyerRoute) {
          console.error('BuyerGuard: Invalid buyer route:', state.url);
          this.router.navigate(['/login']);
          return false;
        }

        // Verificar que el usuario sea buyer
        const isBuyer = !user.is_staff && !user.is_superuser;
        if (!isBuyer) {
          console.log('BuyerGuard: User is not buyer, redirecting to admin');
          this.router.navigate(['/admin']);
          return false;
        }

        console.log('BuyerGuard: User is buyer, allowing access');
        return true;
        if (!isBuyer) {
          console.log('BuyerGuard: User is not buyer, redirecting to admin');
          this.router.navigate(['/admin']);
          return false;
        }

        console.log('BuyerGuard: User is buyer, allowing access');
        return true;
      }),
      catchError(err => {
        console.error('BuyerGuard: Error:', err);
        this.router.navigate(['/login']);
        return of(false);
        this.router.navigate(['/login']);
        return of(false);
      })
    );
  }
}
