import { Component, OnInit } from '@angular/core';
import { TransactionsService } from '../../../services/transactions.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-transacts',
  templateUrl: './transacts.component.html',
  styleUrls: ['./transacts.component.css']
})
export class TransactsComponent implements OnInit {
  transactions: any[] = [];
  loading = true;
  error = '';
  selectedTransaction: any | null = null;
  private paymentMethods = ['credit', 'visa'] as const;
  private statuses = ['pending', 'completed', 'cancelled'] as const;

  constructor(
    private transactionsService: TransactionsService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadTransactions();
  }

  private loadTransactions(): void {
    this.loading = true;
    this.error = '';

    this.transactionsService.getTransactions().subscribe(
      (transactions) => {
        this.transactions = transactions;
        this.loading = false;
      },
      (error) => {
        this.error = 'Error al cargar las transacciones';
        this.loading = false;
      }
    );
  }

  public getPaymentMethodLabel(method: string): string {
    const methods = {
      credit: 'Crédito',
      visa: 'Visa Transact'
    } as const;
    return methods[method as 'credit' | 'visa'];
  }

  public getStatusLabel(status: string): string {
    const statuses = {
      pending: 'Pendiente',
      completed: 'Completado',
      cancelled: 'Cancelado'
    } as const;
    return statuses[status as 'pending' | 'completed' | 'cancelled'];
  }

  public getStatusClass(status: string): string {
    const classes = {
      pending: 'warning',
      completed: 'success',
      cancelled: 'danger'
    } as const;
    return classes[status as 'pending' | 'completed' | 'cancelled'];
  }

  public completeTransaction(id: string): void {
    this.updateTransactionStatus(id, 'completed');
  }

  public cancelTransaction(id: string): void {
    if (!confirm('¿Estás seguro de cancelar esta transacción?')) return;

    this.updateTransactionStatus(id, 'cancelled');
  }

  public deleteTransaction(id: string): void {
    if (!confirm('¿Estás seguro de eliminar esta transacción?')) return;

    const numericId = parseInt(id, 10);
    this.transactionsService.deleteTransaction(numericId).subscribe(
      () => {
        this.loadTransactions();
      },
      (error) => {
        alert('Error al eliminar la transacción');
      }
    );
  }

  private updateTransactionStatus(id: string, status: 'pending' | 'completed' | 'cancelled'): void {
    const numericId = parseInt(id, 10);
    this.transactionsService.updateTransaction(numericId, { status }).subscribe(
      () => {
        this.loadTransactions();
      },
      (error) => {
        alert('Error al actualizar el estado de la transacción');
      }
    );
  }
}
