import { Component, OnInit } from '@angular/core';
import { TransactionsService } from '../../../services/transactions.service';
import { Transaction, ProductReference } from '../../../services/transactions.service';
import { AuthService } from '../../../services/auth.service';
import { ProductsService } from '../../../services/products.service';

@Component({
  selector: 'app-transacts',
  templateUrl: './transacts.component.html',
  styleUrls: ['./transacts.component.css']
})
export class TransactsComponent implements OnInit {
  transactions: Transaction[] = [];
  loading = true;
  error = '';
  statusFilter: string = '';
  dateRange = {
    start: '',
    end: ''
  };

  constructor(
    private transactionsService: TransactionsService,
    private authService: AuthService,
    private productsService: ProductsService
  ) {}

  ngOnInit(): void {
    this.loadTransactions();
  }

  loadTransactions(): void {
    this.loading = true;
    this.error = '';

    const userId = this.authService.getUserId();
    if (!userId) {
      this.transactions = [];
      this.loading = false;
      return;
    }

    this.transactionsService.getTransactions().subscribe(
      (data) => {
        const filtered = data.filter(t => t.buyer === userId);
        
        // Fetch product details for each transaction
        Promise.all<Transaction>(filtered.map(transaction => {
          return new Promise<Transaction>((resolve) => {
            if (typeof transaction.product === 'number') {
              // If product is just an ID, fetch the product
              this.productsService.getProduct(transaction.product).subscribe(
                product => {
                  resolve({
                    ...transaction,
                    product: {
                      id: product.id,
                      name: product.name
                    }
                  });
                },
                error => {
                  // If we can't fetch the product, keep the ID
                  resolve(transaction);
                }
              );
            } else {
              // If product is already a ProductReference, just resolve
              resolve(transaction);
            }
          });
        })).then(updatedTransactions => {
          this.transactions = this.applyFilters(updatedTransactions);
          this.loading = false;
        });
      },
      (error) => {
        this.error = 'Error al cargar las transacciones';
        this.loading = false;
      }
    );
  }

  applyFilters(transactions: Transaction[] = this.transactions): Transaction[] {
    return transactions.filter(t => {
      let matches = true;

      if (this.statusFilter && this.statusFilter !== 'all') {
        matches = matches && t.status === this.statusFilter;
      }

      if (this.dateRange.start) {
        const startDate = new Date(this.dateRange.start);
        matches = matches && new Date(t.createdAt) >= startDate;
      }

      if (this.dateRange.end) {
        const endDate = new Date(this.dateRange.end);
        matches = matches && new Date(t.createdAt) <= endDate;
      }

      return matches;
    });
  }

  calculateTotal(transaction: Transaction): number {
    return transaction.quantity * transaction.unit_price;
  }

  clearFilters(): void {
    this.statusFilter = '';
    this.dateRange.start = '';
    this.dateRange.end = '';
    this.loadTransactions();
  }

  getTransactionStatusClass(status: string): string {
    return {
      pending: 'warning',
      completed: 'success',
      cancelled: 'danger'
    }[status] || 'secondary';
  }

  getProductName(product: number | ProductReference): string {
    return typeof product === 'number' ? 'Producto #' + product : product.name;
  }

  cancelTransaction(transaction: Transaction): void {
    if (transaction.status !== 'pending') {
      alert('Solo se pueden cancelar transacciones en estado pendiente');
      return;
    }

    const confirm = window.confirm('¿Estás seguro de que deseas cancelar esta transacción?');
    if (!confirm) return;

    const updateData = {
      status: 'cancelled' as const
    };

    this.transactionsService.updateTransaction(transaction.id, updateData).subscribe(
      () => {
        this.loadTransactions();
        alert('Transacción cancelada exitosamente');
      },
      (error) => {
        alert('Error al cancelar la transacción');
      }
    );
  }
}
