import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '@app/shared/shared.module';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: 'products', pathMatch: 'full' },
  { path: 'products', component: ProductsComponent },
  { path: 'transacts', component: TransactsComponent },
  { path: 'profile', component: ProfileComponent }
];

import { ProductsComponent } from './products/products.component';
import { TransactsComponent } from './transacts/transacts.component';
import { BuyerNavigationComponent } from './navigation/navigation.component';
import { ProfileComponent } from './profile/profile.component';

@NgModule({
  declarations: [
    ProductsComponent,
    TransactsComponent,
    BuyerNavigationComponent,
    ProfileComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    RouterModule.forChild(routes)
  ],
  providers: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe
  ],
  exports: [
    ProductsComponent,
    TransactsComponent,
    BuyerNavigationComponent,
    ProfileComponent
  ]
})
export class BuyerModule { }
