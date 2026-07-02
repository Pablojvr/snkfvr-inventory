import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { DialogModule } from 'primeng/dialog';
import { ApiService, Venta, Producto, Usuario } from '../../core/services/api';
import { ToastManagerService } from '../../core/services/toast-manager.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface VentaMasivaItem {
  venta: Venta;
  submitted: boolean;
  error?: string;
  costoActual?: number;
}

@Component({
  selector: 'app-venta-masiva',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    CardModule,
    MessageModule,
    DialogModule
  ],
  templateUrl: './venta-masiva.html',
})
export class VentaMasivaComponent implements OnInit {
  items: VentaMasivaItem[] = [];
  productos: Producto[] = [];
  usuarios: Usuario[] = [];

  guardando: boolean = false;
  defaultUsuarioId: number = 0;
  
  displayConfirmModal: boolean = false;

  constructor(private api: ApiService, private toastManager: ToastManagerService, private route: ActivatedRoute) {}

  ngOnInit() {
    const savedUser = localStorage.getItem('usuarioActivoId');
    this.defaultUsuarioId = savedUser ? parseInt(savedUser, 10) : 0;

    this.cargarDatosYParametros();
  }

  cargarDatosYParametros() {
    forkJoin({
      productos: this.api.getProductos(),
      usuarios: this.api.getUsuarios()
    }).subscribe({
      next: (res) => {
        this.productos = res.productos;
        this.usuarios = res.usuarios;

        this.route.queryParams.subscribe(params => {
          this.items = []; // reset
          if (params['productoId']) {
            const pId = parseInt(params['productoId'], 10);
            this.agregarFila(pId);
          } else {
            this.agregarFila();
          }
        });
      },
      error: () => this.toastManager.showError('Error', 'No se pudieron cargar los datos iniciales.')
    });
  }

  agregarFila(productoId?: number) {
    const nuevaVenta: Venta = {
      productoId: productoId || 0,
      usuarioId: this.defaultUsuarioId,
      precioVenta: 0,
      costoEnvio: 0,
      costosAdicionales: 0,
      estado: 'Reservado'
    };

    let costoActual = undefined;
    if (productoId) {
      const p = this.productos.find(x => x.id === productoId);
      if (p) costoActual = p.costo;
    }

    this.items.push({
      venta: nuevaVenta,
      submitted: false,
      costoActual: costoActual
    });
  }

  eliminarFila(index: number) {
    this.items.splice(index, 1);
    if (this.items.length === 0) {
      this.agregarFila();
    }
  }

  onProductoChange(item: VentaMasivaItem) {
    let pId = item.venta.productoId;
    if (typeof pId === 'object') {
      pId = (pId as any).id;
    }
    const prod = this.productos.find(p => p.id === pId);
    item.costoActual = prod ? prod.costo : undefined;
  }

  getNombreUsuario(id: number): string {
    return this.usuarios.find(u => u.id === id)?.nombre || 'Desconocido';
  }
  
  getNombreProducto(id: number | any): string {
    let pId = id;
    if (typeof pId === 'object') {
      pId = (pId as any).id;
    }
    return this.productos.find(u => u.id === pId)?.descripcion || 'Desconocido';
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

  validarFila(item: VentaMasivaItem): boolean {
    item.submitted = true;
    item.error = undefined;

    if (!item.venta.productoId || !item.venta.usuarioId || !item.venta.precioVenta || item.venta.precioVenta <= 0) {
      item.error = 'Faltan campos obligatorios o el precio es inválido.';
      return false;
    }

    return true;
  }

  guardarTodos() {
    this.displayConfirmModal = false;
    this.guardando = true;

    const requests = this.items.map(item => {
      const ventaPayload = { ...item.venta };
      if (ventaPayload.productoId && typeof ventaPayload.productoId === 'object') {
        ventaPayload.productoId = (ventaPayload.productoId as any).id;
      }

      // Default safety checks
      ventaPayload.costoEnvio = ventaPayload.costoEnvio || 0;
      ventaPayload.costosAdicionales = ventaPayload.costosAdicionales || 0;

      return this.api.crearVenta(ventaPayload).pipe(
        catchError(err => of({ error: err, isError: true, item }))
      );
    });

    forkJoin(requests).subscribe(results => {
      this.guardando = false;
      let exitosos = 0;
      const itemsFallidos: VentaMasivaItem[] = [];

      results.forEach((res: any, index) => {
        const originalItem = this.items[index];
        if (res && res.isError) {
          originalItem.error = res.error?.error?.message || res.error?.message || 'Error desconocido del servidor.';
          itemsFallidos.push(originalItem);
        } else {
          exitosos++;
        }
      });

      this.items = itemsFallidos;

      if (itemsFallidos.length === 0) {
        this.toastManager.showSuccess('Éxito', `Se registraron ${exitosos} ventas correctamente.`);
        this.agregarFila();
      } else {
        if (exitosos > 0) {
            this.toastManager.showSuccess('Guardado Parcial', `Se guardaron ${exitosos} ventas, pero otras fallaron.`);
        }
        this.toastManager.showError('Error', `Falló el guardado de ${itemsFallidos.length} venta(s). Revisa los mensajes de error.`);
      }
    });
  }
}
