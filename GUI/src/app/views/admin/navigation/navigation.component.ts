import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.css']
})
export class NavigationComponent implements OnInit {
  title = 'Administración';
  isAdministrator = false;
  isBuyer = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.checkUserRoles();
  }

  ngOnInit(): void {
    this.checkUserRoles();
  }

  private checkUserRoles(): void {
    const user = this.authService.getUser();
    if (user) {
      this.title = user.name;
      this.isAdministrator = this.authService.isAdministrator();
      this.isBuyer = !this.isAdministrator;

      // Redirigir según el rol
      if (this.isAdministrator) {
        if (!this.router.url.includes('admin')) {
          this.router.navigate(['/admin/products']);
        }
      } else {
        if (!this.router.url.includes('buyers')) {
          this.router.navigate(['/buyers']);
        }
      }
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  isActive(route: string): boolean {
    return this.router.isActive(route, true);
  }

  navigate(route: string): void {
    if (this.isAdmin()) {
      this.router.navigate([`/admin/${route}`]);
    } else {
      this.router.navigate(['/buyers']);
    }
  }

  isAdmin(): boolean {
    return this.authService.isAdministrator();
  }
}
