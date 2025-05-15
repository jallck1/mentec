import { Component, EventEmitter, Input, Output, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-present-table',
  templateUrl: './present-table.component.html',
  styleUrls: ['./present-table.component.css']
})
export class PresentTableComponent {
  @Input() typeTable:string =""
  @Input() headerTable:string[] =[]
  @Input() data:any[] =[]
  @Input() isUserData:boolean =false
  @Output() productoCSave:EventEmitter<any> = new EventEmitter()
  @Output() productoESave:EventEmitter<any> = new EventEmitter()
  @Output() createUserEvt:EventEmitter<any> = new EventEmitter()
  @Output() deleteEvent:EventEmitter<any> = new EventEmitter()
  @Output() deleteEventUser:EventEmitter<any> = new EventEmitter()
  @Output() imageSelected: EventEmitter<File> = new EventEmitter<File>();
  
  typeAction:string = ""
  imagePreview: string | ArrayBuffer | null = null;
  @ViewChild('fileInput') fileInput!: ElementRef;
  formData: any = {
    name: '',
    description: '',
    price: 0,
    impuestos: 0,
    descuento: 0,
    stock: 0,
    is_active: true
  }

  formDataUser:any = {
    name:'',
    password:''
  }

  createUser() {
   this.createUserEvt.emit(this.formDataUser)
    
  }

  openAddModalUser() {
    console.log(222)
    this.typeAction = "Agregar Usuario"
  }

  openAddModal() {
    this.typeAction = "Añadir Producto"
    this.formData = {
      name: '',
      description: '',
      price: 0,
      impuestos: 0,
      descuento: 0,
      stock: 0,
      is_active: true
    };
    this.imagePreview = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }
  objectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  crearProducto() {
    this.productoCSave.emit(this.formData)
  }

  editarProducto() {
    this.productoESave.emit(this.formData)
  }




  onImageSelected(event: any): void {
    const file = event?.target?.files?.[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.match('image.*')) {
        return;
      }
      
      // Validar tamaño del archivo (máximo 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        return;
      }
      
      // Mostrar vista previa
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
      
      // Emitir el archivo al componente padre
      this.imageSelected.emit(file);
    }
  }
  
  removeImage(): void {
    this.imagePreview = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
    this.imageSelected.emit(null as any);
  }

  openEditModal(item: any) {
    this.formData = {
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: item.price,
      impuestos: item.impuestos || 0,
      descuento: item.descuento || 0,
      stock: item.stock || 0,
      is_active: item.is_active !== false
    };
    
    // Mostrar vista previa de la imagen si existe
    if (item.image) {
      this.imagePreview = item.image;
    } else {
      this.imagePreview = null;
    }
    
    this.typeAction = "Editar Producto";
  }
  
}
