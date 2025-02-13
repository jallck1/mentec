import { Component, OnDestroy, OnInit } from '@angular/core';
import { ApiConnectService } from 'src/app/services/api-connect.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-see-transacts-byr',
  templateUrl: './see-transacts-byr.component.html',
  styleUrls: ['./see-transacts-byr.component.css']
})
export class SeeTransactsByrComponent implements OnInit, OnDestroy {
  transactsData: any[] = [];
  user_id: number = 0;
  username: string = "";
  balance: number = 0;
  private transactionSub!: Subscription;

  constructor(private _apiConnect: ApiConnectService) {}

  ngOnInit(): void {
    this.getUserInfo();

    // 🔹 Suscribirse a los cambios de transacciones
    this.transactionSub = this._apiConnect.transactionUpdate$.subscribe(() => {
      console.log("🔄 Actualización detectada, recargando transacciones...");
      this.getTransactsUserBased();
    });
  }

  ngOnDestroy(): void {
    // 🛑 Evitar fugas de memoria
    if (this.transactionSub) {
      this.transactionSub.unsubscribe();
    }
  }

  getUserInfo() {
    const objUs: any = this._apiConnect.decodeCookie();
    this.username = objUs.name;
    this.user_id = objUs.user_id;

    this._apiConnect.getSecure(`users/${this.user_id}`)
      .subscribe({
        next: (response: any) => {
          this.balance = response.balance;
          this.getTransactsUserBased();
        },
        error: (error: any) => {
          console.error("Error obteniendo balance:", error);
        }
      });
  }

  getTransactsUserBased() {
    if (!this.user_id) return; 

    this._apiConnect.getSecure(`transacts/user/${this.user_id}`)
      .subscribe({
        next: (response: any) => {
          console.log(response.data);
          this.transactsData = response.data;
        },
        error: (error: any) => {
          console.error("Error obteniendo transacciones:", error);
        }
      });
  }
}
