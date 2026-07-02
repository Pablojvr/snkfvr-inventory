import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { ApiService, Gasto, Producto, Usuario } from '../../../core/services/api';
import { ToastManagerService } from '../../../core/services/toast-manager.service';

@Component({
  selector: 'app-dialog-gasto',
  standalone: true,
  imports: [CommonModule, DialogModule, FormsModule, InputTextModule, InputNumberModule, DatePickerModule, SelectModule, ButtonModule],
  templateUrl: './dialog-gasto.component.html',
})
export class DialogGastoComponent {
  displayDialog: boolean = false;
  gasto: Gasto = { motivo: '', fecha: new Date(), usuarioId: 0, monto: 0, tipo: 'Calzado' };
  
  editando: boolean = false;
  submitted: boolean = false;
  guardando: boolean = false;
  tiposGasto: string[] = ['Calzado', 'Comisión', 'Viático', 'Envío', 'Otros'];
  productoInicialId?: number;
  fijarProductoId: boolean = false; // Sirve para deshabilitar el dropdown cuando lo forzamos
  fijarTipo: boolean = false;
  
  productos: Producto[] = [];
  usuarios: Usuario[] = [];

  @Output() onSaved = new EventEmitter<void>();

  constructor(private api: ApiService, private toastManager: ToastManagerService) {}

  showDialog(productoId?: number, tipo?: string, gastoExistente?: Gasto) {
    this.cargarDatos();

    if (gastoExistente) {
      this.gasto = { ...gastoExistente, fecha: new Date(gastoExistente.fecha) };
      this.productoInicialId = gastoExistente.productoId;
      this.editando = true;
      this.fijarProductoId = false;
      this.fijarTipo = false;
    } else {
      const savedUser = localStorage.getItem('usuarioActivoId');
      const defaultUsuarioId = savedUser ? parseInt(savedUser, 10) : 0;
      this.gasto = { 
          motivo: '', 
          fecha: new Date(), 
          usuarioId: defaultUsuarioId, 
          monto: 0, 
          tipo: tipo || 'Calzado',
          productoId: productoId
      };
      this.productoInicialId = undefined;
      this.editando = false;
      this.fijarProductoId = productoId !== undefined;
      this.fijarTipo = tipo !== undefined;
      
      // Llamar al handler en caso de que sea comisión
      setTimeout(() => this.onTipoOProductoChange());
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
        if (this.fijarProductoId && this.gasto.tipo === 'Comisión') {
            this.onTipoOProductoChange();
        }
      });
    });
  }

  onTipoOProductoChange() {
    if (this.gasto.tipo === 'Comisión') {
      let nombreProducto = '';
      if (this.gasto.productoId) {
        let pId = this.gasto.productoId;
        if (typeof pId === 'object') {
          pId = (pId as any).id;
        }
        const prod = this.productos.find(p => p.id === pId);
        if (prod) {
          nombreProducto = prod.descripcion;
        }
      }
      this.gasto.motivo = nombreProducto ? `COM | ${nombreProducto}` : 'COM | ';
    }
  }

  guardar() {
    this.submitted = true;
    if (this.guardando) return;
    
    if (!this.gasto.motivo || !this.gasto.usuarioId || !this.gasto.monto || this.gasto.monto <= 0) {
      return;
    }

    if (this.gasto.productoId && typeof this.gasto.productoId === 'object') {
        this.gasto.productoId = (this.gasto.productoId as any).id;
    }

    if (this.gasto.productoId && this.gasto.tipo !== 'Comisión' && this.gasto.tipo !== 'Envío' && this.gasto.tipo !== 'Calzado') {
        this.toastManager.showError('Error', 'Un gasto de producto solo puede ser Comisión o Envío');
        return; 
    }

    if (this.gasto.tipo === 'Calzado' && !this.fijarProductoId && !this.productoInicialId) {
      this.gasto.productoId = undefined;
    }

    this.guardando = true;
    if (this.editando && this.gasto.id) {
      this.api.editarGasto(this.gasto.id, this.gasto).subscribe({
        next: () => {
          this.guardando = false;
          this.displayDialog = false;
          this.onSaved.emit();
          this.toastManager.showSuccess('Éxito', 'Se editó el gasto exitosamente.');
        },
        error: () => this.guardando = false
      });
    } else {
      this.api.crearGasto(this.gasto).subscribe({
        next: () => {
          this.guardando = false;
          this.displayDialog = false;
          this.onSaved.emit();
          this.toastManager.showSuccess('Éxito', 'Se registró el gasto exitosamente.');
        },
        error: () => this.guardando = false
      });
    }
  }
}
