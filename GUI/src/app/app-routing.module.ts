import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProductsComponent } from './views/admin/products/products.component';
import { UsersComponent } from './views/admin/users/users.component';
import { LoginComponent } from './components/login/login.component';
import { AdminGuard } from './guards/admin.guard';
import { AuthGuard } from './guards/auth.guard';
import { BuyerGuard } from './guards/buyer.guard';
import { ProductsComponent as BuyerProductsComponent } from './views/buyer/products/products.component';
import { TransactsComponent } from './views/admin/transacts/transacts.component';
import { IndexComponent } from './pages/index/index.component';

import { ProfileComponent } from './views/buyer/profile/profile.component';
import { TransactsComponent as BuyerTransactsComponent } from './views/buyer/transacts/transacts.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'index',
    component: IndexComponent
  },
  {
    path: 'admin',
    canActivate: [AdminGuard],
    children: [
      {path: '', redirectTo: 'index', pathMatch: 'full'},
      {path: 'products', component: ProductsComponent},
      {path: 'users', component: UsersComponent},
      {path: 'transacts', component: TransactsComponent}
    ]
  },
  {
    path: 'buyer',
    canActivate: [BuyerGuard],
    children: [
      { path: '', redirectTo: 'products', pathMatch: 'full' },
      { path: 'products', component: BuyerProductsComponent },
      { path: 'transacts', component: BuyerTransactsComponent },
      { path: 'profile', component: ProfileComponent }
    ]
  },

  // Add a redirect from old 'buyers' path to new 'buyer' path
  {
    path: 'buyers',
    redirectTo: 'buyer'
  },
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }