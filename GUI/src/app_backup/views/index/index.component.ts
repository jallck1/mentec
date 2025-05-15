import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-index',
  templateUrl: './index.component.html',
  styleUrls: ['./index.component.css']
})
export class IndexComponent implements OnInit {
  is_buyer_view: boolean = false;  // Define si es vista de comprador o admin
  activeRoute: string = '';        // Guarda la ruta activa

  constructor(private router: Router) {}

  ngOnInit() {
    // Subscribe to route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.checkActiveRoute();
    });
    
    // Initial check
    this.checkActiveRoute();
  }

  checkActiveRoute() {
    const url = this.router.url;
    this.activeRoute = url.split('/').pop() || '';
    this.is_buyer_view = url.includes('buyers');
  }

  downloadRep() {
    console.log('Descargando reporte...');
    // Lógica para descargar el reporte
  }
}
