import { Component, OnInit } from '@angular/core';
import { ApiConnectService } from 'src/app/services/api-connect.service';

@Component({
  selector: 'app-transacts-admin',
  templateUrl: './transacts-admin.component.html',
  styleUrls: ['./transacts-admin.component.css']
})
export class TransactsAdminComponent implements OnInit {
  transactsData: any[] = []; // Todos los datos originales
  filteredData: any[] = []; // Datos filtrados que se mostrarán en la tabla
  totalSis: number = 0;
  searchBuyer: string = '';
  searchDate: string = '';

  constructor(private _apiConnect: ApiConnectService) {}

  ngOnInit() {
    this.getTransacts();
  }

  getTransacts() {
    this._apiConnect.getSecure('transacts')
      .subscribe({
        next: (response: any) => {
          this.transactsData = response.data;
          this.filteredData = [...this.transactsData];
          this.totalSis = this.calculateTotalTransacts(this.transactsData);
        },
        error: (error: any) => {
          console.log(error);
        }
      });
  }

  calculateTotalTransacts(transacts: any[]) {
    return transacts.reduce((total, item) => total + parseFloat(item.total), 0);
  }

  applyFilters() {
    this.filteredData = this.transactsData.filter((transact) => {
      const buyerMatch = this.searchBuyer
        ? transact.buyer.toLowerCase().includes(this.searchBuyer.toLowerCase())
        : true;
      const dateMatch = this.searchDate
        ? transact.createdAt.startsWith(this.searchDate)
        : true;
      return buyerMatch && dateMatch;
    });
    this.totalSis = this.calculateTotalTransacts(this.filteredData);
  }

  resetFilters() {
    this.searchBuyer = '';
    this.searchDate = '';
    this.filteredData = [...this.transactsData];
    this.totalSis = this.calculateTotalTransacts(this.transactsData);
  }

  // **NUEVOS MÉTODOS PARA SOLUCIONAR EL ERROR**
  handleAccept(transactionId: number) {
    console.log(`Transacción con ID ${transactionId} aceptada.`);
    // Aquí puedes agregar la lógica para actualizar el estado en la base de datos.
  }

  handleReject(transactionId: number) {
    console.log(`Transacción con ID ${transactionId} rechazada.`);
    // Aquí puedes agregar la lógica para actualizar el estado en la base de datos.
  }
}
