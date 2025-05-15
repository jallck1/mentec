import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProductsAdminComponent } from './views/admin/products-admin/products-admin.component';
import { UsersAdminComponent } from './views/admin/users-admin/users-admin.component';
import { LoginComponent } from './views/login/login.component';
import { AuthGuardAdminService } from './services/auth-guard-admin.service';
import { BuyProductsComponent } from './views/buyers/buy-products/buy-products.component';
import { AuthGuardBuyerService } from './services/auth-guard-buyer.service';
import { SeeTransactsByrComponent } from './views/buyers/see-transacts-byr/see-transacts-byr.component';
import { TransactsAdminComponent } from './views/admin/transacts-admin/transacts-admin.component';
import { IndexComponent } from './views/index/index.component';
import { RoleGuard } from './guards/role.guard';

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
    path: 'buyers',
    canActivate: [AuthGuardBuyerService],
    children: [
      {path: '', redirectTo: 'productos', pathMatch: 'full'},
      {path: 'productos', component: BuyProductsComponent},
      {path: 'transacts', component: SeeTransactsByrComponent}
    ]
  },
  {
    path: 'admin',
    canActivate: [RoleGuard],
    children: [
      {path: '', redirectTo: 'index', pathMatch: 'full'},
      {path: 'index', component: IndexComponent},
      {path: 'productos', component: ProductsAdminComponent},
      {path: 'users', component: UsersAdminComponent},
      {path: 'transactions', component: TransactsAdminComponent}
    ]
  },
  // Ruta comodín para cualquier otra ruta no definida
  {
    path: '**',
    redirectTo: 'login'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }