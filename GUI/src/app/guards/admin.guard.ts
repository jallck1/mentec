import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    console.log('AdminGuard: Checking access for route:', state.url);

    return this.authService.currentUser$.pipe(
      map(user => {
        if (!user) {
          console.log('AdminGuard: No user data');
          this.router.navigate(['/login']);
          return false;
        }

        console.log('AdminGuard: Current user data:', {
          id: user.id,
          email: user.email,
          is_staff: user.is_staff,
          is_superuser: user.is_superuser
        });

        const isAdmin = user.is_staff || user.is_superuser;
        if (!isAdmin) {
          console.log('AdminGuard: User is not admin');
          this.router.navigate(['/login']);
          return false;
        }

        console.log('AdminGuard: User is admin, allowing access');
        return true;
      }),
      catchError(err => {
        console.error('AdminGuard: Error:', err);
        this.router.navigate(['/login']);
        return of(false);
      })
    );
  }
}
