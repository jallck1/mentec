import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ProductsService } from '../../../services/products.service';
import { TransactionsService } from '../../../services/transactions.service';
import { AuthService } from '../../../services/auth.service';
import { Product } from '../../../services/products.service';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css']
})
export class ProductsComponent implements OnInit {
  products: Product[] = [];
  categories: any[] = [];
  filteredProducts: Product[] = []; // We'll keep this as any[] since it's filtered

  calculateFinalPrice(product: Product): number {
    // Calculate final price: base price + taxes - discount
    return product.price * (1 + (product.impuestos / 100)) * (1 - (product.descuento / 100));
  }
  loading: boolean = true;
  error: string = '';
  searchTerm: string = '';
  categoryFilter: string = '';
  sortOrder: string = 'price_asc';
  currentPage: number = 1;
  totalPages: number = 1;
  pageNumbers: number[] = [];

  constructor(
    private productsService: ProductsService,
    private transactionsService: TransactionsService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategories();
  }

  private loadProducts(): void {
    this.loading = true;
    this.error = '';

    const params = {
      page: this.currentPage,
      search: this.searchTerm,
      category: this.categoryFilter,
      sort: this.sortOrder
    };

    this.productsService.getProducts(params).subscribe(
      (response: any) => {
        this.products = response.results;
        this.totalPages = response.total_pages;
        this.updatePageNumbers();
        this.filterProducts();
        this.loading = false;
      },
      (error) => {
        this.error = 'Error al cargar los productos';
        this.loading = false;
      }
    );
  }

  private loadCategories(): void {
    this.productsService.getCategories().subscribe(
      (categories: any[]) => {
        this.categories = categories;
      },
      (error) => {
        console.error('Error al cargar las categorías:', error);
      }
    );
  }

  private filterProducts(): void {
    this.filteredProducts = this.products;
  }

  private updatePageNumbers(): void {
    this.pageNumbers = Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadProducts();
    }
  }

  addToCart(product: Product): void {
    const cartItem = {
      product: product.id,
      quantity: 1,
      price: this.calculateFinalPrice(product)
    };

    // Aquí implementar la lógica para agregar al carrito
    alert('Producto añadido al carrito');
  }

  buyNow(product: Product): void {
    const transaction = {
      product: product.id,
      quantity: 1,
      payment_method: 'credit' as const,
      status: 'pending' as const,
      impuestos: product.impuestos,
      descuento: product.descuento,
      total: this.calculateFinalPrice(product)
    };

    this.transactionsService.createTransaction(transaction).subscribe(
      () => {
        alert('Compra realizada exitosamente');
        this.loadProducts(); // Actualizar la lista de productos
      },
      (error) => {
        this.error = 'Error al realizar la compra';
        alert('Error al realizar la compra. Por favor, inténtelo de nuevo.');
      }
    );
  }
}
