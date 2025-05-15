import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '@app/shared/shared.module';
import { CurrencyPipe, DatePipe } from '@angular/common';

import { ProductsComponent } from './products/products.component';
import { UsersComponent } from './users/users.component';
import { TransactsComponent } from './transacts/transacts.component';
import { AdminNavigationComponent } from './navigation/navigation.component';

@NgModule({
  declarations: [
    ProductsComponent,
    UsersComponent,
    TransactsComponent,
    AdminNavigationComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule
  ],
  providers: [
    CurrencyPipe,
    DatePipe
  ],
  exports: [
    ProductsComponent,
    UsersComponent,
    TransactsComponent,
    AdminNavigationComponent
  ]
})
export class AdminModule { }
