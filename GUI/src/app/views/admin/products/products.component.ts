import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductsService } from '../../../services/products.service';
import { Product } from '../../../services/products.service';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css']
})
export class ProductsComponent implements OnInit {
  products: Product[] = [];
  loading = true;
  error = '';
  selectedProduct: Product | null = null;
  productForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private productsService: ProductsService
  ) {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: ['', [Validators.required, Validators.minLength(5)]],
      price: ['', [Validators.required, Validators.min(0), Validators.pattern('^[0-9]+(\.[0-9]{1,2})?$')]],
      impuestos: ['', [Validators.required, Validators.min(0), Validators.max(100)]],
      descuento: ['', [Validators.required, Validators.min(0), Validators.max(100)]],
      stock: ['', [Validators.required, Validators.min(0)]],
      image: ['', Validators.pattern('^(http|https)://.*$')],
      is_active: [true]
    });
  }

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;
    this.error = '';

    this.productsService.getProducts().subscribe(
      (response: any) => {
        // Asegurarnos de que recibimos un array
        if (Array.isArray(response)) {
          this.products = response;
        } else if (response.results) { // Si viene en formato paginado
          this.products = response.results;
        } else {
          this.products = [];
        }
        this.loading = false;
      },
      (error: any) => {
        this.error = 'Error al cargar los productos: ' + error.message;
        this.loading = false;
        console.error('Error:', error);
      }
    );
  }

  selectProduct(product: Product): void {
    this.selectedProduct = product;
    this.productForm.patchValue({
      name: product.name,
      description: product.description,
      price: product.price,
      impuestos: product.impuestos,
      descuento: product.descuento,
      stock: product.stock,
      is_active: product.is_active
    });
  }

  createProduct(): void {
    if (this.productForm.invalid) {
      return;
    }

    const productData = this.productForm.value;
    
    this.productsService.createProduct(productData).subscribe(
      (product: Product) => {
        this.products.unshift(product);
        this.clearForm();
        alert('Producto creado exitosamente');
      },
      (error: any) => {
        this.error = 'Error al crear el producto';
      }
    );
  }

  updateProduct(): void {
    if (!this.selectedProduct || this.productForm.invalid) {
      return;
    }

    const productData = this.productForm.value;
    
    this.productsService.updateProduct(this.selectedProduct.id, productData).subscribe(
      (product: Product) => {
        const index = this.products.findIndex(p => p.id === product.id);
        if (index !== -1) {
          this.products[index] = product;
        }
        this.clearForm();
        alert('Producto actualizado exitosamente');
      },
      (error: any) => {
        this.error = 'Error al actualizar el producto';
      }
    );
  }

  deleteProduct(product: Product): void {
    const confirm = window.confirm('¿Estás seguro de que deseas eliminar este producto?');
    if (!confirm) return;

    this.productsService.deleteProduct(product.id).subscribe(
      () => {
        const index = this.products.findIndex(p => p.id === product.id);
        if (index !== -1) {
          this.products.splice(index, 1);
        }
        alert('Producto eliminado exitosamente');
      },
      (error: any) => {
        this.error = 'Error al eliminar el producto';
      }
    );
  }

  clearForm(): void {
    this.productForm.reset();
    this.selectedProduct = null;
  }

  calculateFinalPrice(product: Product): number {
    return this.productsService.calculateFinalPrice(
      product.price,
      product.impuestos,
      product.descuento
    );
  }

  getProductStatusClass(product: Product): string {
    return product.is_active ? 'text-success' : 'text-danger';
  }
}
