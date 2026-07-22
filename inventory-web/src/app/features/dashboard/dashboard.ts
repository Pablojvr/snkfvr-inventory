import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { TimelineModule } from 'primeng/timeline';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { MenuItem } from 'primeng/api';
import { ApiService, Venta, Producto, Usuario, Movimiento } from '../../core/services/api';
import { ToastManagerService } from '../../core/services/toast-manager.service';

import { DialogVentaComponent } from '../../shared/components/dialog-venta/dialog-venta.component';
import { DialogGastoComponent } from '../../shared/components/dialog-gasto/dialog-gasto.component';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { DialogCierreDiaComponent } from '../../shared/components/dialog-cierre-dia/dialog-cierre-dia.component';

// Interface extendida para Venta en el Dashboard
interface VentaDashboard extends Venta {
    productoDescripcion?: string;
    usuarioNombre?: string;
    adelantoMonto?: number;
    saldoPendiente?: number;
    ganancia?: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ButtonModule, TimelineModule, SelectModule, FormsModule, DialogModule, MenuModule, TooltipModule, DialogGastoComponent, DialogVentaComponent, InputNumberModule, InputTextModule, DialogCierreDiaComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit {
  
  ventasReservadas: VentaDashboard[] = [];
  ventasPorCobrar: VentaDashboard[] = [];
  entregasDeHoy: VentaDashboard[] = [];
  activeTab: 'pendientes' | 'cobrar' = 'pendientes';
  movimientos: Movimiento[] = [];
  productos: Producto[] = [];
  usuarios: Usuario[] = [];
  
  productosParaBuscador: Producto[] = [];
  productoBuscado: Producto | null = null;

  // Estadísticas Reales
  efectivoEnCaja: number = 0;
  inventarioTotal: number = 0;
  ventasTotales: number = 0;
  articulosDisponibles: number = 0;

  // Detail modal
  displayDetalleVenta: boolean = false;
  ventaSeleccionada: VentaDashboard | null = null;
  displayConfirmarEntrega: boolean = false;
  confirmandoEntrega: boolean = false;
  
  // Anular Venta modal
  displayAnularVenta: boolean = false;
  ventaAAnular: VentaDashboard | null = null;
  montoMaximoDevolucion: number = 0;
  montoDevolucionIngresado: number = 0;
  anulandoVenta: boolean = false;

  // Cobro
  marcandoCobrado: boolean = false;

  // Recordatorios
  enviandoRecordatorio: boolean = false;

  displayDetalleMovimiento: boolean = false;
  movimientoSeleccionado: Movimiento | null = null;

  displayCierreDia: boolean = false;

  // Menu
  menuItems: MenuItem[] = [];
  
  // Dialog Gasto
  @ViewChild(DialogGastoComponent) dialogGasto!: DialogGastoComponent;

  // Dialog Venta
  @ViewChild(DialogVentaComponent) dialogVenta!: DialogVentaComponent;

  constructor(private api: ApiService, private router: Router, private toastManager: ToastManagerService) {}

  ngOnInit() {
    this.cargarDatos();
  }
  
  getTiempoRelativo(fecha: Date | string | null | undefined): string {
    if (!fecha) return '';
    let dateObj = new Date(fecha);
    let diff = new Date().getTime() - dateObj.getTime();
    
    // Corrección para fechas UTC
    if (diff < -60000 && typeof fecha === 'string' && !fecha.endsWith('Z')) {
        const utcDate = new Date(fecha + 'Z');
        const utcDiff = new Date().getTime() - utcDate.getTime();
        if (utcDiff >= 0 || utcDiff > diff) {
            diff = utcDiff;
        }
    }
    
    if (diff < 0) diff = 0;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Hace un momento';
    if (minutes === 1) return 'Hace un minuto';
    if (minutes < 60) return `Hace ${minutes} minutos`;
    if (hours === 1) return 'Hace una hora';
    if (hours < 24) return `Hace ${hours} horas`;
    if (days === 1) return 'Ayer';
    return `Hace ${days} días`;
  }

  esAtrasado(fechaStr: string | Date | null | undefined): boolean {
      if (!fechaStr) return false;
      const fecha = new Date(fechaStr);
      const hoy = new Date();
      const fechaNormalizada = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
      const hoyNormalizado = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
      return fechaNormalizada.getTime() < hoyNormalizado.getTime();
  }

  formatearFechaEntrega(fechaStr: string | Date | null | undefined): string {
      if (!fechaStr) return 'Por definir';
      
      const fecha = new Date(fechaStr);
      const hoy = new Date();
      
      const fechaNormalizada = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
      const hoyNormalizado = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
      
      const diffTiempo = fechaNormalizada.getTime() - hoyNormalizado.getTime();
      const diffDias = Math.round(diffTiempo / (1000 * 60 * 60 * 24));

      if (diffDias === 0) return 'Entrega hoy';
      if (diffDias === 1) return 'Entrega mañana';
      if (diffDias > 1 && diffDias <= 6) {
          const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
          return `Entrega el ${diasSemana[fechaNormalizada.getDay()]}`;
      }
      if (diffDias >= 7 && diffDias <= 14) return 'En una semana';
      if (diffDias > 14) return `En ${diffDias} días`;
      
      if (diffDias === -1) return 'Atrasado (Ayer)';
      return `Atrasado (${Math.abs(diffDias)} días)`;
  }

  getIconForMovimiento(tipo: string): string {
    switch (tipo?.toLowerCase()) {
      case 'compra':
      case 'salida de dinero':
        return 'pi pi-shopping-bag';
      case 'venta':
      case 'ingreso':
        return 'pi pi-arrow-down-left';
      case 'comisión':
        return 'pi pi-percentage';
      case 'adelanto por reserva':
        return 'pi pi-clock';
      case 'cambio de estado':
        return 'pi pi-sync';
      default:
        return 'pi pi-info-circle';
    }
  }

  getColorForMovimiento(tipo: string, monto: number): string {
    if (monto < 0) return '#ef4444'; // Red
    if (monto > 0) return '#10b981'; // Green
    
    // Fallbacks
    switch (tipo?.toLowerCase()) {
      case 'comisión': return '#f59e0b';
      case 'cambio de estado': return '#3b82f6';
      default: return '#64748b';
    }
  }

  cargarDatos() {
    import('rxjs').then(({ forkJoin }) => {
        forkJoin({
          ventas: this.api.getVentas(),
          productos: this.api.getProductos(),
          usuarios: this.api.getUsuarios(),
          gastos: this.api.getGastos(),
          movimientos: this.api.getMovimientos()
        }).subscribe(({ ventas, productos, usuarios, gastos, movimientos }) => {
          this.productosParaBuscador = productos;
          this.productos = productos.map(p => {
             const gastosProducto = gastos.filter(g => g.productoId === p.id && g.activo);
             const costoCalculado = gastosProducto.reduce((acc, curr) => acc + (curr.monto || 0), 0);
             return { ...p, costoCalculado: costoCalculado };
          });
          this.usuarios = usuarios;
          
          this.ventasReservadas = ventas
            .filter(v => v.estado === 'Reservado')
            .map(v => {
              const movAdelanto = movimientos.find(m => m.referenciaId === v.id && m.descripcion.startsWith('Adelanto por reserva'));
              const adelantoMonto = movAdelanto ? movAdelanto.montoTotal : 0;
              const precio = v.precioVenta || 0;
              const saldoPendiente = precio - adelantoMonto;

              const productoInfo = this.productos.find(p => p.id === v.productoId);

              return {
                ...v,
                productoDescripcion: productoInfo?.descripcion || 'Desconocido',
                usuarioNombre: usuarios.find(u => u.id === v.usuarioId)?.nombre || 'Desconocido',
                adelantoMonto: adelantoMonto,
                saldoPendiente: saldoPendiente > 0 ? saldoPendiente : 0,
                ganancia: precio - (productoInfo?.costoCalculado || 0)
              };
            })
            .sort((a, b) => {
                const isValidA = a.fechaEntrega && !isNaN(new Date(a.fechaEntrega).getTime());
                const isValidB = b.fechaEntrega && !isNaN(new Date(b.fechaEntrega).getTime());
                const dateA = isValidA ? new Date(a.fechaEntrega!).getTime() : Number.MAX_SAFE_INTEGER;
                const dateB = isValidB ? new Date(b.fechaEntrega!).getTime() : Number.MAX_SAFE_INTEGER;
                return dateA - dateB;
            });

          this.entregasDeHoy = this.ventasReservadas.filter(v => {
              if (!v.fechaEntrega) return false;
              const fecha = new Date(v.fechaEntrega);
              const hoy = new Date();
              const fechaNormalizada = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
              const hoyNormalizado = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
              return fechaNormalizada.getTime() <= hoyNormalizado.getTime();
          });

          this.ventasPorCobrar = ventas
            .filter(v => v.estado === 'Vendido' && (!v.estadoPago || v.estadoPago === 'Pendiente'))
            .map(v => {
              const precio = v.precioVenta || 0;
              const movAdelanto = movimientos.find(m => m.referenciaId === v.id && m.descripcion.startsWith('Adelanto por reserva'));
              const adelantoMonto = movAdelanto ? movAdelanto.montoTotal : 0;
              const saldoPendiente = precio - adelantoMonto;
              const productoInfo = this.productos.find(p => p.id === v.productoId);

              return {
                ...v,
                productoDescripcion: productoInfo?.descripcion || 'Desconocido',
                usuarioNombre: usuarios.find(u => u.id === v.usuarioId)?.nombre || 'Desconocido',
                adelantoMonto: adelantoMonto,
                saldoPendiente: saldoPendiente > 0 ? saldoPendiente : 0,
                ganancia: precio - (productoInfo?.costoCalculado || 0)
              };
            })
            .sort((a, b) => {
                const dateA = a.fechaRegistro ? new Date(a.fechaRegistro).getTime() : 0;
                const dateB = b.fechaRegistro ? new Date(b.fechaRegistro).getTime() : 0;
                return dateB - dateA;
            });
            
          // Calcular estadísticas reales
          this.efectivoEnCaja = movimientos.reduce((acc, m) => acc + (m.montoTotal || 0), 0);
          this.inventarioTotal = this.productos.reduce((acc, p) => acc + (p.costoCalculado || 0), 0);
          this.ventasTotales = ventas.filter(v => v.estado === 'Vendido').reduce((acc, v) => acc + (v.precioVenta || 0), 0);
          this.articulosDisponibles = this.productos.filter(p => p.estado === 'Disponible').length;
            
          this.movimientos = movimientos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 10).map(mov => {
              let desc = mov.descripcion;
              
              // Limpiar prefijos redundantes
              desc = desc.replace(/^Gasto\/Compra:\s*/, '');
              desc = desc.replace(/^Comisión:\s*/, '');
              desc = desc.replace(/^Comisión de venta:\s*/, '');
              
              desc = desc.replace(/usuario con ID (\d+)/g, (match, p1) => {
                  const u = usuarios.find(x => x.id === parseInt(p1, 10));
                  return u ? u.nombre : match;
              });
              desc = desc.replace(/producto (\d+)/g, (match, p1) => {
                  const p = productos.find(x => x.id === parseInt(p1, 10));
                  return p ? `<a href="/productos/${p.id}" style="color: #3b82f6; text-decoration: none; font-weight: 600; cursor: pointer;">producto ${p.descripcion}</a>` : match;
              });
              return { ...mov, descripcion: desc };
          });
        });
    });
  }

  onProductoSeleccionado(event: any) {
    if (event.value && event.value.id) {
        this.router.navigate(['/productos', event.value.id]);
    }
  }

  nuevaVentaRapida() {
      if (this.productoBuscado) {
          this.dialogVenta.showDialog(this.productoBuscado);
      } else {
          this.dialogVenta.showDialog();
      }
  }

  nuevoGastoRapido() {
    this.dialogGasto.showDialog(undefined, 1);
  }

  // --- Card actions ---
  abrirDetalleMovimiento(mov: Movimiento) {
      this.movimientoSeleccionado = mov;
      this.displayDetalleMovimiento = true;
  }

  abrirDetalle(venta: VentaDashboard) {
    this.ventaSeleccionada = venta;
    this.displayDetalleVenta = true;
  }

  toggleMenuVenta(event: Event, venta: VentaDashboard, menu: any) {
    event.stopPropagation(); // Don't open detail modal
    this.menuItems = [
      { label: 'Ver Producto', icon: 'pi pi-eye', command: () => this.router.navigate(['/productos', venta.productoId]) }
    ];

    if (venta.estado === 'Reservado') {
      this.menuItems.push({ label: 'Marcar como Entregado', icon: 'pi pi-check-circle', command: () => this.marcarEntregado(venta) });
      this.menuItems.push({ label: 'Liberar Producto', icon: 'pi pi-undo', command: () => this.liberarProducto(venta) });
    } else if (venta.estado === 'Vendido' && (!venta.estadoPago || venta.estadoPago === 'Pendiente')) {
      this.menuItems.push({ label: 'Marcar como Cobrado', icon: 'pi pi-money-bill', command: () => this.marcarCobrado(venta) });
    }

    menu.toggle(event);
  }

  marcarEntregado(venta: VentaDashboard | null) {
      if (!venta) return;
      this.displayConfirmarEntrega = true;
  }

  confirmarEntrega(estadoPago: string) {
      if (!this.ventaSeleccionada || !this.ventaSeleccionada.id) return;
      this.confirmandoEntrega = true;
      
      const ventaActualizada: Venta = {
          ...this.ventaSeleccionada,
          estado: 'Vendido',
          estadoPago: estadoPago
      };

      this.api.editarVenta(this.ventaSeleccionada.id, ventaActualizada).subscribe({
          next: () => {
              this.confirmandoEntrega = false;
              this.cargarDatos();
              this.displayConfirmarEntrega = false;
              this.displayDetalleVenta = false;
              this.toastManager.showSuccess('Entrega Confirmada', 'El estado del producto ha sido actualizado.');
          },
          error: () => {
              this.confirmandoEntrega = false;
              this.toastManager.showError('Error', 'No se pudo confirmar la entrega. Intenta de nuevo.');
          }
      });
  }

  liberarProducto(venta: VentaDashboard | null) {
      if (!venta) return;
      this.ventaAAnular = venta;
      let montoAbonado = 0;
      
      // Calcular monto que el cliente ya dio
      if (venta.estado === 'Vendido' && venta.estadoPago === 'Cobrado') {
          montoAbonado = venta.precioVenta || 0;
      } else if (venta.estado === 'Reservado' && venta.adelantoMonto && venta.adelantoMonto > 0) {
          montoAbonado = venta.adelantoMonto;
      }
      
      this.montoMaximoDevolucion = montoAbonado;
      this.montoDevolucionIngresado = 0;
      this.displayAnularVenta = true;
  }

  confirmarAnulacion() {
      if (!this.ventaAAnular || !this.ventaAAnular.id) return;
      this.anulandoVenta = true;
      this.api.eliminarVenta(this.ventaAAnular.id, this.montoDevolucionIngresado).subscribe({
          next: () => {
              this.anulandoVenta = false;
              this.cargarDatos();
              this.displayAnularVenta = false;
              this.displayDetalleVenta = false;
              this.toastManager.showSuccess('Éxito', 'Venta anulada y producto liberado');
          },
          error: () => {
              this.anulandoVenta = false;
              this.toastManager.showError('Error', 'No se pudo anular la venta. Intenta de nuevo.');
          }
      });
  }

  marcarCobrado(venta: VentaDashboard) {
      if (!venta || !venta.id) return;
      this.marcandoCobrado = true;
      
      const ventaActualizada: Venta = {
          ...venta,
          estadoPago: 'Cobrado'
      };

      this.api.editarVenta(venta.id, ventaActualizada).subscribe({
          next: () => {
              this.marcandoCobrado = false;
              this.cargarDatos();
              this.toastManager.showSuccess('Cobro Registrado', `Se marcó como cobrado: ${venta.productoDescripcion}`);
          },
          error: () => {
              this.marcandoCobrado = false;
              this.toastManager.showError('Error', 'No se pudo registrar el cobro. Intenta de nuevo.');
          }
      });
  }

  // --- Recordatorios de WhatsApp ---

  enviarRecordatorioIndividual(venta: Venta) {
    if (!venta.id) return;
    this.enviandoRecordatorio = true;
    this.api.enviarRecordatorioIndividual(venta.id).subscribe({
      next: (res: any) => {
        if (res.enviado === false) {
            this.toastManager.showError('Error de Envío', 'El bot local de WhatsApp está dormido o desconectado.');
        } else {
            let destinatario = res.destino === 'Cliente' ? 'al cliente' : 'a tu WhatsApp';
            this.toastManager.showSuccess('WhatsApp Enviado', `Recordatorio enviado exitosamente ${destinatario}.`);
        }
        this.enviandoRecordatorio = false;
      },
      error: (err: any) => {
        console.error('Error enviando recordatorio individual', err);
        this.toastManager.showError('Error', 'No se pudo enviar el recordatorio.');
        this.enviandoRecordatorio = false;
      }
    });
  }
}
