import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ApiService, Producto, Usuario } from '../../../core/services/api';
import { ToastManagerService } from '../../../core/services/toast-manager.service';

@Component({
  selector: 'app-dialog-venta',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, SelectModule, InputNumberModule, InputTextModule, ButtonModule, CheckboxModule],
  templateUrl: './dialog-venta.component.html',
})
export class DialogVentaComponent implements OnInit {
  @Output() onSaved = new EventEmitter<void>();

  display: boolean = false;
  guardando: boolean = false;
  editando: boolean = false;
  tieneAdelanto: boolean = false;
  ventaEditId?: number;

  nuevaVentaData: any = {
    productoPreseleccionado: false,
    productoSeleccionado: null,
    precioVenta: null,
    costoEnvio: null,
    costosAdicionales: null,
    estado: 'Reservado',
    nombreComprador: '',
    telefonoComprador: '',
    lugarDestino: '',
    comisionMonto: null,
    comisionUsuarioId: null,
    adelantoMonto: null,
    fechaEntrega: null,
    esEnvioPersonalizado: false,
    estadoPago: 'Pendiente'
  };

  productosDisponibles: Producto[] = [];
  usuarios: Usuario[] = [];

  constructor(private api: ApiService, private toastManager: ToastManagerService) {}

  ngOnInit() {
    this.cargarDatosAdicionales();
  }

  cargarDatosAdicionales() {
    import('rxjs').then(({ forkJoin }) => {
        forkJoin({
            productos: this.api.getProductos(),
            usuarios: this.api.getUsuarios(),
            gastos: this.api.getGastos()
        }).subscribe(({ productos, usuarios, gastos }) => {
            this.usuarios = usuarios;
            const productosCalculados = productos.map(p => {
               const gastosProd = gastos.filter(g => g.productoId === p.id && g.activo);
               const costoCalculado = gastosProd.reduce((acc, curr) => acc + (curr.monto || 0), 0);
               return { ...p, costoCalculado };
            });
            this.productosDisponibles = productosCalculados.filter(p => p.estado === 'Disponible' || !p.estado);
        });
    });
  }

  /**
   * Abre el modal.
   * @param producto - (Opcional) Si se pasa, preselecciona el producto para venta.
   * @param venta - (Opcional) Si se pasa, edita una venta existente.
   */
  showDialog(producto?: any, venta?: any, overrideState?: string) {
    const fabriUser = this.usuarios.find(u => u.nombre.toLowerCase().includes('fabri'));
    this.cargarDatosAdicionales(); // Refresh available products just in case

    this.editando = !!venta;
    this.tieneAdelanto = false;

    if (venta && producto) {
      // Editar venta
      this.ventaEditId = venta.id;
      this.nuevaVentaData = {
          productoPreseleccionado: true,
          productoSeleccionado: producto,
          precioVenta: venta.precioVenta,
          costoEnvio: venta.costoEnvio,
          costosAdicionales: venta.costosAdicionales,
          estado: overrideState || venta.estado,
          nombreComprador: venta.nombreComprador,
          telefonoComprador: venta.telefonoComprador || '',
          lugarDestino: venta.lugarDestino,
          comisionMonto: venta.comisionMonto,
          comisionUsuarioId: venta.comisionUsuarioId,
          adelantoMonto: venta.adelantoMonto,
          fechaEntrega: venta.fechaEntrega ? new Date(venta.fechaEntrega).toISOString().split('T')[0] : null,
          esEnvioPersonalizado: venta.esEnvioPersonalizado || false,
          estadoPago: venta.estadoPago || 'Pendiente'
      };
      if (venta.adelantoMonto) {
        this.tieneAdelanto = true;
      }
      if (overrideState) {
          this.onNuevaVentaChange();
      }
    } else if (producto) {
      // Registrar venta para un producto preseleccionado
      const suggestedPrice = (producto.costoCalculado || producto.costo || 0) + 15;
      this.ventaEditId = undefined;
      this.nuevaVentaData = {
          productoPreseleccionado: true,
          productoSeleccionado: producto,
          precioVenta: suggestedPrice,
          costoEnvio: null,
          costosAdicionales: null,
          estado: 'Reservado',
          nombreComprador: '',
          telefonoComprador: '',
          lugarDestino: '',
          fechaEntrega: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
          esEnvioPersonalizado: false,
          estadoPago: 'Pendiente',
          comisionMonto: null,
          comisionUsuarioId: fabriUser ? fabriUser.id : null,
          adelantoMonto: null
      };
    } else {
      // Registrar venta desde cero (Buscando producto)
      this.ventaEditId = undefined;
      this.nuevaVentaData = {
          productoPreseleccionado: false,
          productoSeleccionado: null,
          precioVenta: null,
          costoEnvio: null,
          costosAdicionales: null,
          estado: 'Reservado',
          nombreComprador: '',
          telefonoComprador: '',
          lugarDestino: '',
          fechaEntrega: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
          esEnvioPersonalizado: false,
          estadoPago: 'Pendiente',
          comisionMonto: null,
          comisionUsuarioId: fabriUser ? fabriUser.id : null,
          adelantoMonto: null
      };
    }

    this.display = true;
  }

  onNuevaVentaChange() {
      if (this.nuevaVentaData.estado === 'Vendido') {
        this.tieneAdelanto = false;
        this.nuevaVentaData.adelantoMonto = null;
      }

      if (this.nuevaVentaData.estado === 'Vendido' && this.nuevaVentaData.productoSeleccionado && this.nuevaVentaData.precioVenta) {
          const costoCalc = this.nuevaVentaData.productoSeleccionado.costoCalculado || this.nuevaVentaData.productoSeleccionado.costo || 0;
          const envio = this.nuevaVentaData.costoEnvio || 0;
          const otros = this.nuevaVentaData.costosAdicionales || 0;
          const costoTotal = costoCalc + envio + otros;
          const ganancia = this.nuevaVentaData.precioVenta - costoTotal;
          if (ganancia > 0) {
              this.nuevaVentaData.comisionMonto = ganancia / 2;
          } else {
              this.nuevaVentaData.comisionMonto = 0;
          }
      } else {
          this.nuevaVentaData.comisionMonto = null;
      }
  }

  onAdelantoChange() {
    if (!this.tieneAdelanto) {
      this.nuevaVentaData.adelantoMonto = null;
    }
  }

  onProductoSeleccionadoModal() {
      if (this.nuevaVentaData.productoSeleccionado) {
          const prod = this.nuevaVentaData.productoSeleccionado;
          this.nuevaVentaData.precioVenta = (prod.costoCalculado || prod.costo || 0) + 15;
          this.onNuevaVentaChange();
      }
  }

  guardar() {
      if (!this.nuevaVentaData.productoSeleccionado) return;

      // Validar teléfono obligatorio
      if (!this.nuevaVentaData.telefonoComprador || this.nuevaVentaData.telefonoComprador.trim().length < 10) {
          this.toastManager.showError('Teléfono Requerido', 'Ingresa el número de WhatsApp del comprador (mínimo 10 dígitos).');
          return;
      }

      if (this.nuevaVentaData.estado === 'Vendido') {
          if (!this.nuevaVentaData.nombreComprador || !this.nuevaVentaData.lugarDestino) {
              this.toastManager.showError('Error', 'Para un producto Vendido, Comprador y Lugar son obligatorios.');
              return;
          }
      }

      const v: any = {
          productoId: this.nuevaVentaData.productoSeleccionado.id!,
          costoEnvio: this.nuevaVentaData.costoEnvio || 0,
          costosAdicionales: this.nuevaVentaData.costosAdicionales || 0,
          precioVenta: this.nuevaVentaData.precioVenta || 0,
          usuarioId: Number(localStorage.getItem('userId')) || 1, 
          estado: this.nuevaVentaData.estado,
          nombreComprador: this.nuevaVentaData.nombreComprador,
          telefonoComprador: this.nuevaVentaData.telefonoComprador.trim(),
          lugarDestino: this.nuevaVentaData.lugarDestino,
          fechaVenta: this.nuevaVentaData.estado === 'Vendido' ? new Date() : undefined,
          comisionMonto: this.nuevaVentaData.estado === 'Vendido' ? this.nuevaVentaData.comisionMonto : null,
          comisionUsuarioId: this.nuevaVentaData.comisionUsuarioId,
          adelantoMonto: this.tieneAdelanto ? this.nuevaVentaData.adelantoMonto : null,
          fechaEntrega: this.nuevaVentaData.fechaEntrega ? new Date(this.nuevaVentaData.fechaEntrega) : null,
          esEnvioPersonalizado: this.nuevaVentaData.esEnvioPersonalizado,
          estadoPago: this.nuevaVentaData.estadoPago || 'Pendiente'
      };

      this.guardando = true;
      if (this.editando && this.ventaEditId) {
          this.api.editarVenta(this.ventaEditId, v).subscribe({
              next: () => {
                  this.guardando = false;
                  this.display = false;
                  this.toastManager.showSuccess('Éxito', 'Venta actualizada correctamente');
                  this.onSaved.emit();
              },
              error: (err) => {
                  this.guardando = false;
                  this.toastManager.showError('Error', 'No se pudo actualizar la venta');
              }
          });
      } else {
          v.fechaRegistro = new Date();
          this.api.crearVenta(v).subscribe({
              next: () => {
                  this.guardando = false;
                  this.display = false;
                  this.toastManager.showSuccess('Éxito', 'Venta registrada correctamente');
                  this.onSaved.emit();
              },
              error: (err) => {
                  this.guardando = false;
                  this.toastManager.showError('Error', 'No se pudo registrar la venta');
              }
          });
      }
  }
}
