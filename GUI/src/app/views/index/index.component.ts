import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-index',
  templateUrl: './index.component.html',
  styleUrls: ['./index.component.css']
})
export class IndexComponent {
  is_buyer_view: boolean = false;  // Define si es vista de comprador o admin
  activeRoute: string = '';        // Guarda la ruta activa

  constructor(private router: Router) {
    this.checkActiveRoute();
  }

  checkActiveRoute() {
    this.activeRoute = this.router.url;  // Obtiene la ruta actual
  }

  downloadRep() {
    console.log('Descargando reporte...');
    // Lógica para descargar el reporte
  }
}
