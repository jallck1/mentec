import { Component, Input, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ApiConnectService } from 'src/app/services/api-connect.service';
import { DatePipe } from '@angular/common';
@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  @Input() activeRoute: string = "";
  @Input() is_buyer_view: boolean = false;
  
  isMenuCollapsed = true;

  constructor(
    private _apiConnect: ApiConnectService,
    private router: Router
  ) {}

  ngOnInit() {
    // Subscribe to route changes to update active route
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateActiveRoute();
    });
  }

  private updateActiveRoute() {
    const url = this.router.url;
    this.activeRoute = url.split('/').pop() || '';
  }

  downloadRep(event: Event) {
    event.preventDefault();
    
    this._apiConnect.getExcelReport('/transacts/report')
      .subscribe({
        next: (response: Blob) => {
          this.downloadReport(response);
        },
        error: (error) => {
          console.error('Error downloading report:', error);
        }
      });
  }

  private downloadReport(data: Blob) {
    const url: string = window.URL.createObjectURL(data);
    const anchor: HTMLAnchorElement = document.createElement('a');
    const actDate: string = new Date().toString();
    const pipe = new DatePipe('en-US');
    const actualDate = pipe.transform(actDate, 'dd-MM-yyyy');
    
    anchor.href = url;
    anchor.download = `Reporte de ventas (${actualDate}).xlsx`;
    document.body.appendChild(anchor);
    anchor.click();
    
    // Clean up
    window.URL.revokeObjectURL(url);
    document.body.removeChild(anchor);
  }
  
  logout() {
    // Clear any stored tokens or user data
    localStorage.removeItem('auth_token');
    
    // Navigate to login page
    this.router.navigate(['/login']);
  }
}
