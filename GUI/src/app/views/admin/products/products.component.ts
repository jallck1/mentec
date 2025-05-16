import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductsService } from '../../../services/products.service';
import { Product } from '../../../services/products.service';
import { AuthService } from '../../../services/auth.service';

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
  selectedImage: File | null = null;
  selectedImageURL: string | null = null;

  constructor(
    private fb: FormBuilder,
    private productsService: ProductsService,
    private authService: AuthService
  ) {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: ['', [Validators.required, Validators.minLength(5)]],
      price: ['', [Validators.required, Validators.min(0)]],
      impuestos: [0, [Validators.min(0), Validators.max(100)]],
      descuento: [0, [Validators.min(0), Validators.max(100)]],
      stock: ['', [Validators.required, Validators.min(0)]],
      image: [''],
      is_active: [true]
    });
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedImage = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.selectedImageURL = e.target?.result as string;
      };
      reader.readAsDataURL(input.files[0]);
    }
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

    // Verificar si el usuario está autenticado
    if (!this.authService.isAuthenticated()) {
      this.error = 'Debe estar autenticado para crear productos';
      return;
    }

    const formData = new FormData();
    const productData = this.productForm.value;

    // Agregar campos del formulario
    formData.append('name', productData.name);
    formData.append('description', productData.description || '');
    formData.append('price', productData.price.toString());
    formData.append('impuestos', productData.impuestos.toString());
    formData.append('descuento', productData.descuento.toString());
    formData.append('stock', productData.stock.toString());
    formData.append('is_active', productData.is_active.toString());

    // Agregar la imagen si existe
    if (this.selectedImage) {
      formData.append('image', this.selectedImage, this.selectedImage.name);
    }

    // Verificar que al menos hay un campo requerido
    if (!productData.name || !productData.price || !productData.stock) {
      this.error = 'Por favor, completa los campos requeridos';
      return;
    }

    console.log('Enviando producto:', {
      name: productData.name,
      description: productData.description,
      price: productData.price,
      impuestos: productData.impuestos,
      descuento: productData.descuento,
      stock: productData.stock,
      is_active: productData.is_active,
      image: this.selectedImage ? this.selectedImage.name : 'No image'
    });

    this.productsService.createProduct(formData).subscribe({
      next: (product: Product) => {
        console.log('Producto creado:', product);
        this.products.unshift(product);
        this.clearForm();
        alert('Producto creado exitosamente');
      },
      error: (error: any) => {
        console.error('Error al crear producto:', error);
        console.error('Detalle del error (backend):', error.error);
        
        if (error.status === 401) {
          this.error = 'No tienes permisos para crear productos. Por favor, inicia sesión.';
        } else if (error.error?.detail) {
          this.error = error.error.detail;
        } else {
          this.error = 'Error al crear el producto. Por favor, verifica los datos.';
        }
      }
    });
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
