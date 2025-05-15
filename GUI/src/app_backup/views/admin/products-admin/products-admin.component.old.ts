import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormGroupDirective, FormControl } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { ApiConnectService } from 'src/app/services/api-connect.service';
import { Observable } from 'rxjs';
import { ConfirmDialogComponent } from 'src/app/components/confirm-dialog/confirm-dialog.component';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  impuestos: number;
  descuento: number;
  stock: number;
  image?: string;
  creator: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface User {
  id: number;
  email: string;
  name: string;
  is_active: boolean;
  is_staff: boolean;
  balance: number;
  groups: string[];
  client_profile?: {
    cupos: number;
    telefono: string;
    correo: string;
    image?: string;
  };
}

@Component({
  selector: 'app-products-admin',
  templateUrl: './products-admin.component.html',
  styleUrls: ['./products-admin.component.css']
})
export class ProductsAdminComponent implements OnInit {
  // Properties for products table
  displayedColumns: string[] = ['image', 'name', 'price', 'stock', 'impuestos', 'descuento', 'actions'];
  usersDisplayedColumns: string[] = ['name', 'email', 'balance', 'actions'];
  
  dataSource: MatTableDataSource<Product>;
  usersDataSource: MatTableDataSource<User>;
  
  products: Product[] = [];
  users: User[] = [];
  
  loading = true;
  isSubmitting = false;
  selectedFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;
  isEditing = false;
  currentProductId: number | null = null;
  
  productForm: FormGroup;
  userForm: FormGroup;
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('userPaginator') userPaginator!: MatPaginator;
  @ViewChild('userSort') userSort!: MatSort;
  @ViewChild('fileInput') fileInput!: ElementRef;

  constructor(
    private fb: FormBuilder,
    private api: ApiConnectService,
    private _snackBar: MatSnackBar,
    public dialog: MatDialog
  ) {
    this.dataSource = new MatTableDataSource<Product>([]);
    this.usersDataSource = new MatTableDataSource<User>([]);
    
    // Initialize product form with validators
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      price: [0, [Validators.required, Validators.min(0)]],
      impuestos: [0, [Validators.min(0), Validators.max(100)]],
      descuento: [0, [Validators.min(0), Validators.max(100)]],
      stock: [0, [Validators.required, Validators.min(0)]],
      image: [null]
    });

    // Initialize user form with validators
    this.userForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      name: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.usersDataSource.paginator = this.userPaginator;
    this.usersDataSource.sort = this.userSort;
  }

  // Helper method to show success messages
  private showSuccess(message: string): void {
    this._snackBar.open(message, 'Cerrar', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  // Helper method to show error messages
  private showError(message: string): void {
    this._snackBar.open(message, 'Cerrar', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  // Reset form to initial state
  private resetForm(): void {
    this.productForm.reset({
      name: '',
      description: '',
      price: 0,
      impuestos: 0,
      descuento: 0,
      stock: 0,
      image: null
    });
    this.imagePreview = null;
    this.currentProductId = null;
    this.isEditing = false;
    this.selectedFile = null;
  }

  // Mark all form controls as touched
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  ngOnInit(): void {
    this.loadProducts();
    this.loadUsers();
    
    // Suscribirse a cambios en los controles del formulario para calcular el precio final
    this.setupFormListeners();
  }
  
  private setupFormListeners(): void {
    const priceControl = this.productForm.get('price');
    const impuestosControl = this.productForm.get('impuestos');
    const descuentoControl = this.productForm.get('descuento');
    
    if (priceControl && impuestosControl && descuentoControl) {
      priceControl.valueChanges.subscribe(() => this.calculateFinalPrice());
      impuestosControl.valueChanges.subscribe(() => this.calculateFinalPrice());
      descuentoControl.valueChanges.subscribe(() => this.calculateFinalPrice());
    }
  }
  
  calculateFinalPrice() {
    const price = parseFloat(this.productForm.get('price')?.value) || 0;
    const impuestos = parseFloat(this.productForm.get('impuestos')?.value) || 0;
    const descuento = parseFloat(this.productForm.get('descuento')?.value) || 0;
    
    // Calcular precio con impuestos y descuento
    const precioConImpuestos = price * (1 + (impuestos / 100));
    const precioConDescuento = precioConImpuestos * (1 - (descuento / 100));
    
    return precioConDescuento;
  }

  loadProducts(): void {
    this.loading = true;
    this.api.get<Product[]>('/products/')
      .subscribe({
        next: (response: any) => {
          const products = response.results || response;
          this.products = Array.isArray(products) ? products : [];
          this.dataSource.data = this.products.map(product => ({
            ...product,
            image: product.image ? this.api.getImageUrl(product.image) : 'assets/images/placeholder.png'
          }));
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al obtener productos:', error);
          this.showError('Error al cargar los productos');
          this.loading = false;
        }
      });
  }
  
  loadUsers(): void {
    this.loading = true;
    this.api.get<User[]>('/users/')
      .subscribe({
        next: (response: any) => {
          const users = response.results || response;
          this.users = Array.isArray(users) ? users : [];
          this.usersDataSource.data = this.users;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al obtener usuarios:', error);
          this.showError('Error al cargar los usuarios');
          this.loading = false;
        }
      });
  }

  // Handle file selection
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedFile = file;
      
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result) {
          this.imagePreview = e.target.result;
        }
      };
      reader.readAsDataURL(file);
    }
  }

  // Clear selected image
  clearImage(): void {
    this.imagePreview = null;
    this.selectedFile = null;
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
    const imageControl = this.productForm.get('image');
    if (imageControl) {
      imageControl.setValue(null);
    }
  }
  
  // Save product
  saveProduct(): void {
    if (this.productForm.invalid) {
      this.markFormGroupTouched(this.productForm);
      return;
    }

    this.isSubmitting = true;
    const formData = new FormData();
    
    // Append form data
    const formValue = this.productForm.value;
    Object.keys(formValue).forEach(key => {
      if (key !== 'image' && formValue[key] !== null && formValue[key] !== undefined) {
        formData.append(key, formValue[key].toString());
      }
    });

    // Append image if selected
    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    const request = this.isEditing && this.currentProductId
      ? this.api.put(`/products/${this.currentProductId}/`, formData)
      : this.api.post('/products/', formData);

    request.subscribe({
      next: () => {
        const message = this.isEditing ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente';
        this.showSuccess(message);
        this.resetForm();
        this.loadProducts();
      },
      error: (error: any) => {
        console.error('Error al guardar el producto:', error);
        const errorMessage = error.error?.message || 'Error al guardar el producto';
        this.showError(errorMessage);
      },
      complete: () => {
        this.isSubmitting = false;
      }
    });
  }

  private resetForm(): void {
    this.productForm.reset({
      name: '',
      description: '',
      price: 0,
      impuestos: 0,
      descuento: 0,
      stock: 0
    });
    
    this.selectedFile = null;
    this.imagePreview = null;
    this.isEditing = false;
    this.currentProductId = null;
    this.isSubmitting = false;
    
    // Reset file input
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  private showSuccess(message: string): void {
    this._snackBar.open(message, 'Cerrar', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  // Delete product
  deleteProduct(product: Product): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: {
        title: 'Eliminar Producto',
        message: `¿Estás seguro de que deseas eliminar ${product.name}?`
      }
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.api.delete(`/products/${product.id}/`).subscribe({
          next: () => {
            this.showSuccess('Producto eliminado exitosamente');
            this.loadProducts();
          },
          error: (error: any) => {
            console.error('Error al eliminar el producto:', error);
            this.showError('Error al eliminar el producto');
          }
        });
      }
    });
  }
    this.deleteProduct(id);
  }

  // Método para manejar la actualización de productos (compatibilidad con la plantilla)
  updateProductAdm(data: any): void {
    if (this.currentProductId) {
      this.updateProduct(this.currentProductId, {
        ...data,
        id: this.currentProductId
      });
    }
  }

  // Mark all form controls as touched
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      if (control instanceof FormControl) {
        control.markAsTouched();
      } else if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
  
  // Show success message
  private showSuccess(message: string): void {
    this._snackBar.open(message, 'Cerrar', {
      duration: 5000,
      panelClass: ['success-snackbar']
    });
  }
  
  // Show error message
  private showError(message: string): void {
    this._snackBar.open(message, 'Cerrar', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
  
  // Reset form
  resetForm(formDirective?: FormGroupDirective): void {
    this.productForm.reset({
      name: '',
      description: '',
      price: 0,
      impuestos: 0,
      descuento: 0,
      stock: 0
    });
    
    if (formDirective) {
    };
    reader.readAsDataURL(file);
  }
}

// Clear selected image
clearImage(): void {
  this.imagePreview = null;
  this.selectedFile = null;
  if (this.fileInput && this.fileInput.nativeElement) {
    this.fileInput.nativeElement.value = '';
  }
  const imageControl = this.productForm.get('image');
  if (imageControl) {
    imageControl.setValue(null);
  }
}

// Save product
saveProduct(): void {
  if (this.productForm.invalid) {
    this.markFormGroupTouched(this.productForm);
    return;
  }

  this.isSubmitting = true;
  const formData = new FormData();
  
  // Append form data
  const formValue = this.productForm.value;
  Object.keys(formValue).forEach(key => {
    if (key !== 'image' && formValue[key] !== null && formValue[key] !== undefined) {
      formData.append(key, formValue[key].toString());
    }
  });

  // Append image if selected
  if (this.selectedFile) {
    formData.append('image', this.selectedFile);
  }

  const request = this.isEditing && this.currentProductId
    ? this.api.put(`/products/${this.currentProductId}/`, formData)
    : this.api.post('/products/', formData);

  request.subscribe({
    next: () => {
      const message = this.isEditing ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente';
      this.showSuccess(message);
      this.resetForm();
      this.loadProducts();
    },
    error: (error: any) => {
      console.error('Error al guardar el producto:', error);
      const errorMessage = error.error?.message || 'Error al guardar el producto';
      this.showError(errorMessage);
    },
    complete: () => {
      this.isSubmitting = false;
    }
  });
}

private resetForm(): void {
  this.productForm.reset({
    name: '',
    description: '',
    price: 0,
    impuestos: 0,
    descuento: 0,
    stock: 0
  });
  
  this.selectedFile = null;
  this.imagePreview = null;
  this.isEditing = false;
  this.currentProductId = null;
  this.isSubmitting = false;
  
  // Reset file input
  if (this.fileInput) {
    this.fileInput.nativeElement.value = '';
  }
}

private showSuccess(message: string): void {
  this._snackBar.open(message, 'Cerrar', {
    duration: 3000,
    panelClass: ['success-snackbar']
  });
}

// Delete product
deleteProduct(product: Product): void {
  const dialogRef = this.dialog.open(ConfirmDialogComponent, {
    width: '350px',
    data: {
      title: 'Eliminar Producto',
      message: `¿Estás seguro de que deseas eliminar ${product.name}?`
    }
  });

  dialogRef.afterClosed().subscribe((result: boolean) => {
    if (result) {
      this.api.delete(`/products/${product.id}/`).subscribe({
        next: () => {
          this.showSuccess('Producto eliminado exitosamente');
          this.loadProducts();
        },
        error: (error: any) => {
          console.error('Error al eliminar el producto:', error);
          this.showError('Error al eliminar el producto');
        }
      });
    }
  });
}

// Edit product
editProduct(product: Product): void {
  this.isEditing = true;
  this.currentProductId = product.id;
  this.productForm.patchValue({
    name: product.name,
    description: product.description || '',
    price: product.price,
    impuestos: product.impuestos || 0,
    descuento: product.descuento || 0,
    stock: product.stock || 0
  });
  
  if (product.image) {
    this.imagePreview = product.image;
  } else {
    this.clearImage();
  }
  
  // Scroll to form
  const formElement = document.getElementById('product-form');
  if (formElement) {
    formElement.scrollIntoView({ behavior: 'smooth' });
  }
}

// Cancel edit
cancelEdit(): void {
  this.isEditing = false;
  this.currentProductId = null;
  this.resetForm();
}

// Mark all form controls as touched
private markFormGroupTouched(formGroup: FormGroup): void {
  Object.values(formGroup.controls).forEach(control => {
    if (control instanceof FormControl) {
      control.markAsTouched();
    } else if (control instanceof FormGroup) {
      this.markFormGroupTouched(control);
    }
  });
}

// Show success message
private showSuccess(message: string): void {
  this._snackBar.open(message, 'Cerrar', {
    duration: 5000,
    panelClass: ['success-snackbar']
  });
}

// Show error message
private showError(message: string): void {
  this._snackBar.open(message, 'Cerrar', {
    duration: 5000,
    panelClass: ['error-snackbar']
  });
}

// Reset form
resetForm(formDirective?: FormGroupDirective): void {
  this.productForm.reset({
    name: '',
    description: '',
    price: 0,
    impuestos: 0,
    descuento: 0,
    stock: 0
  });
  
  if (formDirective) {
    formDirective.resetForm();
  }
  
  this.imagePreview = null;
  this.selectedFile = null;
  this.editingProductId = null;
  this.isEditing = false;
  this.currentProductId = null;
  this.productData = {
    name: '',
    description: '',
    price: 0,
    impuestos: 0,
    descuento: 0,
    stock: 0,
    is_active: true
  };
}
