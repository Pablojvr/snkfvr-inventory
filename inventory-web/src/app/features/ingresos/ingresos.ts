import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { ApiService, Ingreso, Usuario } from '../../core/services/api';
import { ToastManagerService } from '../../core/services/toast-manager.service';

@Component({
  selector: 'app-ingresos',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, DialogModule, FormsModule, InputTextModule, InputNumberModule, DatePickerModule, SelectModule],
  templateUrl: './ingresos.html',
})
export class Ingresos implements OnInit {
  ingresos: Ingreso[] = [];
  usuarios: Usuario[] = [];
  displayDialog: boolean = false;
  ingreso: Ingreso = { motivo: '', fecha: new Date(), usuarioId: 0, monto: 0 };

  editando: boolean = false;
  submitted: boolean = false;

  constructor(private api: ApiService, private toastManager: ToastManagerService) {}

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    import('rxjs').then(({ forkJoin }) => {
      forkJoin({
        ingresos: this.api.getIngresos(),
        usuarios: this.api.getUsuarios()
      }).subscribe(({ ingresos, usuarios }) => {
        this.usuarios = usuarios;
        this.ingresos = ingresos.map(i => ({
          ...i,
          usuarioNombre: usuarios.find(u => u.id === i.usuarioId)?.nombre || 'Desconocido'
        }));
      });
    });
  }

  showDialog() {
    const savedUser = localStorage.getItem('usuarioActivoId');
    const defaultUsuarioId = savedUser ? parseInt(savedUser, 10) : 0;
    this.ingreso = { motivo: '', fecha: new Date(), usuarioId: defaultUsuarioId, monto: 0 };
    this.editando = false;
    this.submitted = false;
    this.displayDialog = true;
  }

  editar(ingreso: Ingreso) {
    this.ingreso = { ...ingreso, fecha: new Date(ingreso.fecha) };
    this.editando = true;
    this.submitted = false;
    this.displayDialog = true;
  }

  guardar() {
    this.submitted = true;
    if (!this.ingreso.motivo || !this.ingreso.usuarioId || !this.ingreso.monto || this.ingreso.monto <= 0) {
      return;
    }

    if (this.editando && this.ingreso.id) {
      this.api.editarIngreso(this.ingreso.id, this.ingreso).subscribe(() => {
        this.displayDialog = false;
        this.cargarDatos();
        this.toastManager.showSuccess('Éxito', `Se editó el ingreso: ${this.ingreso.motivo}`);
      });
    } else {
      this.api.crearIngreso(this.ingreso).subscribe(() => {
        this.displayDialog = false;
        this.cargarDatos();
        this.toastManager.showSuccess('Éxito', `Se registró el ingreso: ${this.ingreso.motivo}`);
      });
    }
  }

  eliminar(id: number) {
    if(confirm('¿Seguro que desea desactivar este ingreso?')) {
      this.api.eliminarIngreso(id).subscribe(() => {
        this.cargarDatos();
        this.toastManager.showSuccess('Éxito', `Se eliminó el ingreso con ID ${id}`);
      });
    }
  }
}
