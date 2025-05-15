import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'GUI';
  constructor(private router: Router) {}

  isBuyerRoute(): boolean {
    return this.router.url.startsWith('/buyers');
  }

  isAdminRoute(): boolean {
    return this.router.url.startsWith('/admin');
  }
}
