import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'GUI';

  constructor(public router: Router) {}

  ngOnInit() {
    // Agregar logs de navegación
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        console.log('Ruta actual:', event.url);
        console.log('Es ruta buyer?', this.isBuyerRoute());
        console.log('Es ruta admin?', this.isAdminRoute());
      }
    });
  }

  isBuyerRoute(): boolean {
    return this.router.url.startsWith('/buyer');
  }

  isAdminRoute(): boolean {
    return this.router.url.startsWith('/admin');
  }
}
