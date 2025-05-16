import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  template: `
    <div class="dashboard-container">
      <h2>Panel de Administración</h2>
      <div class="dashboard-links">
        <button routerLink="products" class="dashboard-button">
          <i class="material-icons">shopping_cart</i>
          Productos
        </button>
        <button routerLink="users" class="dashboard-button">
          <i class="material-icons">people</i>
          Usuarios
        </button>
        <button routerLink="transacts" class="dashboard-button">
          <i class="material-icons">receipt</i>
          Transacciones
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .dashboard-links {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .dashboard-button {
      background: #4285f4;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 20px;
      text-align: left;
      cursor: pointer;
      transition: background-color 0.2s;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .dashboard-button:hover {
      background: #357abd;
    }
    .material-icons {
      font-size: 24px;
    }
  `]
})
export class DashboardComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit() {
    // Redirect to products if no specific route is provided
    if (!this.router.url.includes('products') && 
        !this.router.url.includes('users') && 
        !this.router.url.includes('transacts')) {
      this.router.navigate(['products']);
    }
  }
}
