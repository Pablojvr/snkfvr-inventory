import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ApiService, Gasto, Producto, Usuario } from '../../../core/services/api';
import { ToastManagerService } from '../../../core/services/toast-manager.service';

@Component({
  selector: 'app-dialog-gasto',
  standalone: true,
  imports: [CommonModule, DialogModule, FormsModule, InputTextModule, InputNumberModule, DatePickerModule, SelectModule, ButtonModule, MessageModule],
  templateUrl: './dialog-gasto.component.html',
})
export class DialogGastoComponent {
  displayDialog: boolean = false;
  gasto: Gasto = { motivo: '', fecha: new Date(), monto: null, usuarioId: 0, tipo: 'Calzado' };
  
  editando: boolean = false;
  submitted: boolean = false;
  guardando: boolean = false;
  productoNombre: string = '';
  costoActual: number | undefined = undefined;
  prefilledProducto: boolean = false;
  
  productos: Producto[] = [];
  usuarios: Usuario[] = [];
  tiposGasto = ['Calzado', 'Comisión', 'Envío'];
  soloCalzado: boolean = false;
  
  @Output() onSaved = new EventEmitter<void>();

  constructor(private api: ApiService, private toastManager: ToastManagerService) {}

  showDialog(productoId?: number, tipo?: string, gastoExistente?: Gasto, forceSoloCalzado: boolean = false) {
    this.productoNombre = '';
    this.costoActual = undefined;
    this.prefilledProducto = !!productoId;
    this.soloCalzado = forceSoloCalzado;
    this.cargarDatos();
    
    if (gastoExistente) {
        this.gasto = { 
            ...gastoExistente, 
            fecha: gastoExistente.fecha ? new Date(gastoExistente.fecha) : new Date(),
            fechaIngreso: gastoExistente.fechaIngreso ? new Date(gastoExistente.fechaIngreso) : undefined
        };
        this.editando = true;
        this.prefilledProducto = !!gastoExistente.productoId;
    } else {
        const savedUser = localStorage.getItem('usuarioActivoId');
        const defaultUsuarioId = savedUser ? parseInt(savedUser, 10) : 0;
        this.gasto = { 
            motivo: '', 
            fecha: new Date(), 
            monto: null, 
            usuarioId: defaultUsuarioId, 
            tipo: tipo || 'Calzado',
            productoId: productoId,
            comisionMonto: null,
            comisionUsuarioId: null
        };
        this.editando = false;
        
        if (this.gasto.tipo === 'Comisión' || this.gasto.tipo === 'Envío') {
            this.generarMotivo();
        }
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
        
        // Find Ale for default commission user
        if (!this.editando && this.gasto.tipo === 'Calzado') {
           const aleUser = this.usuarios.find(u => u.nombre.toLowerCase().includes('ale'));
           if (aleUser) {
               this.gasto.comisionUsuarioId = aleUser.id;
           }
        }
        
        this.resolveProductoInfo();
        if (!this.editando && (this.gasto.tipo === 'Comisión' || this.gasto.tipo === 'Envío')) {
            this.generarMotivo();
        }
      });
    });
  }

  resolveProductoInfo() {
    if (this.gasto.productoId) {
      let pId = this.gasto.productoId;
      if (typeof pId === 'object') pId = (pId as any).id;
      const prod = this.productos.find(p => p.id === pId);
      if (prod) {
        this.productoNombre = prod.descripcion;
        this.costoActual = prod.costoCalculado ?? undefined;
      }
    }
  }
  
  onTipoChange() {
      if (this.gasto.tipo === 'Calzado' && !this.gasto.motivo.startsWith('COM |') && !this.gasto.motivo.startsWith('ENV |')) {
          const aleUser = this.usuarios.find(u => u.nombre.toLowerCase().includes('ale'));
          if (aleUser && !this.gasto.comisionUsuarioId) {
              this.gasto.comisionUsuarioId = aleUser.id;
          }
      } else if (this.gasto.tipo === 'Comisión' || this.gasto.tipo === 'Envío') {
          this.generarMotivo();
      }
  }

  generarMotivo() {
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
      const prefix = this.gasto.tipo === 'Comisión' ? 'COM' : 'ENV';
      this.gasto.motivo = nombreProducto ? `${prefix} | ${nombreProducto}` : `${prefix} | `;
  }

  guardar() {
    this.submitted = true;
    if (this.guardando) return;
    
    if (!this.gasto.motivo || !this.gasto.usuarioId || this.gasto.monto === null || this.gasto.monto <= 0) {
      return;
    }
    
    if (this.gasto.productoId && this.gasto.tipo !== 'Comisión' && this.gasto.tipo !== 'Envío' && this.gasto.tipo !== 'Calzado') {
        this.toastManager.showError('Error', 'Un gasto de producto solo puede ser Comisión o Envío.');
        return;
    }

    let pId = this.gasto.productoId;
    if (pId && typeof pId === 'object') {
        this.gasto.productoId = (pId as any).id;
    }
    if (this.gasto.tipo === 'Calzado' && !this.gasto.productoId) {
        this.gasto.productoId = undefined;
    }

    this.guardando = true;
    if (this.editando && this.gasto.id) {
      this.api.editarGasto(this.gasto.id, this.gasto).subscribe({
        next: () => {
          this.guardando = false;
          this.displayDialog = false;
          this.onSaved.emit();
          this.toastManager.showSuccess('Éxito', 'Se editó el gasto/compra exitosamente.');
        },
        error: () => this.guardando = false
      });
    } else {
      this.api.crearGasto(this.gasto).subscribe({
        next: () => {
          this.guardando = false;
          this.displayDialog = false;
          this.onSaved.emit();
          this.toastManager.showSuccess('Éxito', 'Se registró el gasto/compra exitosamente.');
        },
        error: () => this.guardando = false
      });
    }
  }
}
