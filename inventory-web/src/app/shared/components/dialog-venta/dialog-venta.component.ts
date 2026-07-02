import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { ApiService, Venta, Producto, Usuario } from '../../../core/services/api';
import { ToastManagerService } from '../../../core/services/toast-manager.service';

@Component({
  selector: 'app-dialog-venta',
  standalone: true,
  imports: [CommonModule, DialogModule, FormsModule, InputTextModule, InputNumberModule, DatePickerModule, SelectModule, ButtonModule],
  templateUrl: './dialog-venta.component.html',
})
export class DialogVentaComponent {
  displayDialog: boolean = false;
  venta: Venta = { productoId: 0, usuarioId: 0, precioVenta: 0, costoEnvio: 0, costosAdicionales: 0, estado: 'Reservado' };
  
  editando: boolean = false;
  submitted: boolean = false;
  
  productos: Producto[] = [];
  usuarios: Usuario[] = [];
  
  @Output() onSaved = new EventEmitter<void>();

  constructor(private api: ApiService, private toastManager: ToastManagerService) {}

  showDialog(productoId?: number, ventaExistente?: Venta) {
    this.cargarDatos();
    
    if (ventaExistente) {
        this.venta = { ...ventaExistente, fechaVenta: ventaExistente.fechaVenta ? new Date(ventaExistente.fechaVenta) : undefined };
        this.editando = true;
    } else {
        const savedUser = localStorage.getItem('usuarioActivoId');
        const defaultUsuarioId = savedUser ? parseInt(savedUser, 10) : 0;
        this.venta = { productoId: productoId || 0, usuarioId: defaultUsuarioId, precioVenta: 0, costoEnvio: 0, costosAdicionales: 0, estado: 'Reservado' };
        this.editando = false;
    }
    
    this.submitted = false;
    this.displayDialog = true;
  }

  cargarDatos() {
    import('rxjs').then(({ forkJoin }) => {
      forkJoin({
        productos: this.api.getProductos(),
        usuarios: this.api.getUsuarios()
      }).subscribe(({ productos, usuarios }) => {
        this.productos = productos;
        this.usuarios = usuarios;
      });
    });
  }

  guardar() {
    this.submitted = true;
    if (!this.venta.productoId || !this.venta.usuarioId || !this.venta.precioVenta || this.venta.precioVenta <= 0) {
      return;
    }

    if (this.venta.productoId && typeof this.venta.productoId === 'object') {
        this.venta.productoId = (this.venta.productoId as any).id;
    }

    if (this.editando && this.venta.id) {
      this.api.editarVenta(this.venta.id, this.venta).subscribe(() => {
        this.displayDialog = false;
        this.onSaved.emit();
        this.toastManager.showSuccess('Éxito', 'Se editó la venta exitosamente.');
      });
    } else {
      this.api.crearVenta(this.venta).subscribe(() => {
        this.displayDialog = false;
        this.onSaved.emit();
        this.toastManager.showSuccess('Éxito', 'Se registró la venta exitosamente.');
      });
    }
  }
}
