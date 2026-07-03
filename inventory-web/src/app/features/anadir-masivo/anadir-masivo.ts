import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { DialogModule } from 'primeng/dialog';
import { ApiService, Gasto, Producto, Usuario, TipoGasto } from '../../core/services/api';
import { ToastManagerService } from '../../core/services/toast-manager.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface GastoMasivoItem {
  idLocal: number; // to uniquely identify row in UI
  gasto: Gasto;
  submitted: boolean;
  error?: string; // If failed on backend or local validation
}

@Component({
  selector: 'app-anadir-masivo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    DatePickerModule,
    SelectModule,
    CardModule,
    MessageModule,
    DialogModule
  ],
  templateUrl: './anadir-masivo.html',
})
export class AnadirMasivoComponent implements OnInit {
  items: GastoMasivoItem[] = [];
  nextId: number = 1;

  tiposGasto: TipoGasto[] = [];
  productos: Producto[] = [];
  usuarios: Usuario[] = [];

  guardando: boolean = false;
  defaultUsuarioId: number = 0;
  
  displayConfirmModal: boolean = false;

  constructor(private api: ApiService, private toastManager: ToastManagerService, private route: ActivatedRoute) {}

  ngOnInit() {
    this.cargarDatos();
    const savedUser = localStorage.getItem('usuarioActivoId');
    this.defaultUsuarioId = savedUser ? parseInt(savedUser, 10) : 0;
    
    this.route.queryParams.subscribe(params => {
      const tipoQuery = params['tipo'] ? parseInt(params['tipo'], 10) : 1;
      const productoIdQuery = params['productoId'] ? parseInt(params['productoId'], 10) : undefined;
      
      this.items.push({
        idLocal: this.nextId++,
        submitted: false,
        gasto: {
          motivo: '',
          fecha: new Date(),
          usuarioId: this.defaultUsuarioId,
          monto: 0,
          tipoGastoId: tipoQuery,
          productoId: productoIdQuery,
          comisionMonto: null,
          comisionUsuarioId: null
        }
      });
    });
  }

  cargarDatos() {
    forkJoin({
      productos: this.api.getProductos(),
      usuarios: this.api.getUsuarios(),
      tipos: this.api.getTiposGasto()
    }).subscribe(({ productos, usuarios, tipos }) => {
      this.productos = productos;
      this.usuarios = usuarios;
      this.tiposGasto = tipos;
      
      const aleUser = this.usuarios.find(u => u.nombre.toLowerCase().includes('ale'));
      if (aleUser) {
          this.items.forEach(item => {
              if (this.getTipoNombre(item) === 'Producto' && !item.gasto.comisionUsuarioId) {
                  item.gasto.comisionUsuarioId = aleUser.id;
              }
          });
      }
    });
  }

  getTipoNombre(item: GastoMasivoItem): string {
    const t = this.tiposGasto.find(tg => tg.id === item.gasto.tipoGastoId);
    return t ? t.nombre : 'Producto';
  }

  agregarFila() {
    const aleUser = this.usuarios.find(u => u.nombre.toLowerCase().includes('ale'));
    this.items.push({
      idLocal: this.nextId++,
      submitted: false,
      gasto: {
        motivo: '',
        fecha: new Date(),
        usuarioId: this.defaultUsuarioId,
        monto: 0,
        tipoGastoId: 1,
        comisionMonto: null,
        comisionUsuarioId: aleUser ? aleUser.id : null
      }
    });
  }

  eliminarFila(index: number) {
    if (this.items.length > 1) {
      this.items.splice(index, 1);
    } else {
      this.toastManager.showWarn('Atención', 'Debe haber al menos un formulario.');
    }
  }

  onTipoOProductoChange(item: GastoMasivoItem) {
    if (this.getTipoNombre(item) === 'Comisión' || this.getTipoNombre(item) === 'Envío') {
      let nombreProducto = '';
      if (item.gasto.productoId) {
        let pId = item.gasto.productoId;
        if (typeof pId === 'object') {
          pId = (pId as any).id;
        }
        const prod = this.productos.find(p => p.id === pId);
        if (prod) {
          nombreProducto = prod.descripcion;
        }
      }
      const prefix = this.getTipoNombre(item) === 'Comisión' ? 'COM' : 'ENV';
      item.gasto.motivo = nombreProducto ? `${prefix} | ${nombreProducto}` : `${prefix} | `;
    } else if (this.getTipoNombre(item) === 'Producto') {
        const aleUser = this.usuarios.find(u => u.nombre.toLowerCase().includes('ale'));
        if (aleUser && !item.gasto.comisionUsuarioId) {
            item.gasto.comisionUsuarioId = aleUser.id;
        }
    } else if (!item.gasto.motivo.startsWith('COM |') && !item.gasto.motivo.startsWith('ENV |')) {
      // Si cambia a otra cosa que no sea comision/envio/calzado
    }
  }

  getNombreUsuario(id: number): string {
    return this.usuarios.find(u => u.id === id)?.nombre || 'Desconocido';
  }

  confirmarGuardado() {
    let todosValidos = true;
    this.items.forEach(item => {
      if (!this.validarFila(item)) {
        todosValidos = false;
      }
    });

    if (!todosValidos) {
      this.toastManager.showError('Error de Validación', 'Hay errores en uno o más formularios. Revísalos.');
      return;
    }

    this.displayConfirmModal = true;
  }

  validarFila(item: GastoMasivoItem): boolean {
    item.submitted = true;
    item.error = undefined;

    if (!item.gasto.motivo || !item.gasto.usuarioId || !item.gasto.monto || item.gasto.monto <= 0) {
      item.error = 'Faltan campos obligatorios o el monto es inválido.';
      return false;
    }

    if (item.gasto.productoId && this.getTipoNombre(item) !== 'Comisión' && this.getTipoNombre(item) !== 'Envío' && this.getTipoNombre(item) !== 'Producto') {
      item.error = 'Un gasto de producto solo puede ser Comisión o Envío.';
      return false;
    }

    return true;
  }

  guardarTodos() {
    this.displayConfirmModal = false;
    this.guardando = true;

    // Crear array de Observables que retornen el resultado (éxito o fallo)
    const requests = this.items.map(item => {
      // Clonar el gasto para ajustar el productoId si es objeto
      const gastoPayload = { ...item.gasto };
      if (gastoPayload.productoId && typeof gastoPayload.productoId === 'object') {
        gastoPayload.productoId = (gastoPayload.productoId as any).id;
      }

      const tipoNombre = this.tiposGasto.find(t => t.id === gastoPayload.tipoGastoId)?.nombre || 'Producto';
      if (tipoNombre === 'Producto' && !gastoPayload.productoId) {
        gastoPayload.productoId = undefined;
      }

      return this.api.crearGasto(gastoPayload).pipe(
        catchError(err => of({ error: err, isError: true, item }))
      );
    });

    forkJoin(requests).subscribe(results => {
      this.guardando = false;
      let exitosos = 0;
      const itemsFallidos: GastoMasivoItem[] = [];

      results.forEach((res: any, index) => {
        const originalItem = this.items[index];
        if (res && res.isError) {
          // Falló
          originalItem.error = res.error?.error?.message || res.error?.message || 'Error desconocido del servidor.';
          itemsFallidos.push(originalItem);
        } else {
          // Éxito
          exitosos++;
        }
      });

      this.items = itemsFallidos;

      if (itemsFallidos.length === 0) {
        // Todos guardados correctamente
        this.toastManager.showSuccess('Éxito', `Se registraron ${exitosos} elementos correctamente.`);
        // Reset state with 1 empty row
        this.agregarFila();
      } else {
        // Algunos fallaron
        if (exitosos > 0) {
            this.toastManager.showSuccess('Guardado Parcial', `Se guardaron ${exitosos} elementos, pero otros fallaron.`);
        }
        this.toastManager.showError('Error', `Falló el guardado de ${itemsFallidos.length} elemento(s). Revisa los mensajes de error.`);
      }
    });
  }
}
