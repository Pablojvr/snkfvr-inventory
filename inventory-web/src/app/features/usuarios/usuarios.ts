import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';
import { ApiService, Usuario } from '../../core/services/api';
import { ToastManagerService } from '../../core/services/toast-manager.service';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    ToolbarModule,
    TooltipModule
  ],
  templateUrl: './usuarios.html'
})
export class Usuarios implements OnInit {
  usuarios: Usuario[] = [];
  nuevoUsuario: Usuario = { nombre: '' };
  displayModal = false;
  usuarioActivoId: number | null = null;
  
  editando: boolean = false;
  submitted: boolean = false;

  constructor(private apiService: ApiService, private toastManager: ToastManagerService) {}

  ngOnInit() {
    this.cargarUsuarios();
    const guardado = localStorage.getItem('usuarioActivoId');
    if (guardado) {
      this.usuarioActivoId = parseInt(guardado, 10);
    }
  }

  cargarUsuarios() {
    this.apiService.getUsuarios().subscribe({
      next: (data) => {
        this.usuarios = data;
      },
      error: (e) => console.error('Error cargando usuarios', e)
    });
  }

  mostrarModal() {
    this.nuevoUsuario = { nombre: '' };
    this.editando = false;
    this.submitted = false;
    this.displayModal = true;
  }

  editar(usuario: Usuario) {
    this.nuevoUsuario = { ...usuario };
    this.editando = true;
    this.submitted = false;
    this.displayModal = true;
  }

  guardarUsuario() {
    this.submitted = true;
    if (!this.nuevoUsuario.nombre || !this.nuevoUsuario.nombre.trim()) {
      return;
    }

    if (this.editando && this.nuevoUsuario.id) {
      this.apiService.editarUsuario(this.nuevoUsuario.id, this.nuevoUsuario).subscribe({
        next: (data) => {
          this.displayModal = false;
          this.cargarUsuarios();
          this.toastManager.showSuccess('Éxito', `Se editó el usuario: ${this.nuevoUsuario.nombre}`);
        },
        error: (e) => console.error('Error editando usuario', e)
      });
    } else {
      this.apiService.crearUsuario(this.nuevoUsuario).subscribe({
        next: (data) => {
          this.usuarios.push(data);
          this.displayModal = false;
          // Set it as default automatically if there is none
          if (!this.usuarioActivoId) {
            this.setUsuarioActivo(data);
          }
          this.toastManager.showSuccess('Éxito', `Se registró el usuario: ${data.nombre}`);
        },
        error: (e) => console.error('Error creando usuario', e)
      });
    }
  }

  eliminarUsuario(id: number) {
    if(confirm('¿Seguro que desea desactivar este usuario?')) {
      this.apiService.eliminarUsuario(id).subscribe({
        next: () => {
          this.usuarios = this.usuarios.filter(u => u.id !== id);
          this.toastManager.showSuccess('Éxito', `Se eliminó el usuario con ID ${id}`);
        },
        error: (e) => console.error('Error eliminando usuario', e)
      });
    }
  }

  setUsuarioActivo(usuario: Usuario) {
    if (usuario.id) {
      this.usuarioActivoId = usuario.id;
      localStorage.setItem('usuarioActivoId', usuario.id.toString());
      this.toastManager.showInfo('Usuario Local', `Se seleccionó a ${usuario.nombre} como usuario predeterminado.`);
    }
  }
}
