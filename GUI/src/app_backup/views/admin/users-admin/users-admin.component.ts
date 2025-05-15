import { Component, OnInit, ViewChild } from '@angular/core';
import { ImgInputComponent } from 'src/app/components/img-input/img-input.component';
import { ModalComponent } from 'src/app/components/modal/modal.component';
import { ApiConnectService } from 'src/app/services/api-connect.service';

@Component({
  selector: 'app-users-admin',
  templateUrl: './users-admin.component.html',
  styleUrls: ['./users-admin.component.css']
})
export class UsersAdminComponent implements OnInit {
  ngOnInit(): void {
    this.getUsers()
  }
 

  formData:any = {
    name:"",
    password:"",
    telefono:"",
    image:null,
    correo:""
  }

  constructor(private _apiConnect:ApiConnectService) {}
  internalHeaders:string[] = ['Id', 'Nombre','Total de Compras','Activo']
  internalData:any[] = []

  getUsers() {
    this._apiConnect.get('clients/')
    .subscribe({
      next:(response:any) => {
        // Verificar si la respuesta tiene una propiedad 'data' (formato común en APIs REST)
        this.internalData = response.data || response;
      },
      error:(error:any) => {
        console.error('Error al obtener usuarios:', error);
      }
    });
  }

  getUserImage(name: string | null): string {
    if (!name) return '';
    // Si la imagen ya es una URL completa, devolverla directamente
    if (name.startsWith('http')) return name;
    // Si no, construir la URL completa
    return `${this._apiConnect.host}${name.startsWith('/') ? '' : '/'}${name}`;
  }

  deleteUser(evt:any) {
    this._apiConnect.delete(`clients/${evt}/`)
    .subscribe({
      next:(response:any) => {
        this.getUsers();
        console.log('Usuario eliminado:', response);
      },
      error:(error:any) => {
        console.error('Error al eliminar usuario:', error);
      }
    });
  }

  cleanFormObj() {
    this.formData = {
      name:"",
      password:"",
      telefono:"",
      image:null,
      correo:""
    }
  }

  createUser(data:any) {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });
    
    this._apiConnect.post('clients/', formData)
    .subscribe({
      next:(response:any) => {
        this.getUsers();
        this.cleanFormObj(); // Limpiar el formulario después de crear el usuario
      },
      error:(error:any) => {
        console.error('Error al crear usuario:', error);
      }
    });
  }
}
