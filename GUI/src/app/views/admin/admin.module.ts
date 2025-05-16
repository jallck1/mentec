import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '@app/shared/shared.module';
import { RouterModule } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { NavigationComponent } from './navigation/navigation.component';
import { ProductsComponent } from './products/products.component';
import { UsersComponent } from './users/users.component';
import { TransactsComponent } from './transacts/transacts.component';
import { DashboardComponent } from './dashboard/dashboard.component';

@NgModule({
  declarations: [
    ProductsComponent,
    UsersComponent,
    TransactsComponent,
    NavigationComponent,
    DashboardComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    RouterModule.forChild([
      { path: '', component: DashboardComponent },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'products', component: ProductsComponent },
      { path: 'users', component: UsersComponent },
      { path: 'transacts', component: TransactsComponent }
    ])
  ],
  providers: [
    CurrencyPipe,
    DatePipe
  ],
  exports: [
    ProductsComponent,
    UsersComponent,
    TransactsComponent,
    NavigationComponent,
    DashboardComponent
  ]
})
export class AdminModule { }
