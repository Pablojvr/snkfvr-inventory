import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

import { ButtonModule } from 'primeng/button';
import { TimelineModule } from 'primeng/timeline';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { MenuItem } from 'primeng/api';
import { ApiService, Venta, Producto, Usuario } from '../../core/services/api';
import { ToastManagerService } from '../../core/services/toast-manager.service';

import { DialogVentaComponent } from '../../shared/components/dialog-venta/dialog-venta.component';
import { DialogGastoComponent } from '../../shared/components/dialog-gasto/dialog-gasto.component';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ButtonModule, TimelineModule, SelectModule, FormsModule, DialogModule, MenuModule, TooltipModule, DialogGastoComponent, DialogVentaComponent, InputNumberModule, InputTextModule],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  
  ventasReservadas: any[] = [];
  movimientos: any[] = [];
  productos: Producto[] = [];
  usuarios: Usuario[] = [];
  
  productosParaBuscador: Producto[] = [];
  productoBuscado: any;

  // Estadísticas Reales
  inventarioTotal: number = 0;
  ventasTotales: number = 0;

  // Detail modal
  displayDetalleVenta: boolean = false;
  ventaSeleccionada: any = null;

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
  
  getTiempoRelativo(fecha: Date | string): string {
    if (!fecha) return '';
    let dateObj = new Date(fecha);
    let diff = new Date().getTime() - dateObj.getTime();
    
    // Corrección para fechas que vienen del servidor UTC y se parsean en el futuro localmente
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
    if (days === 1) return 'Hace un día';
    return `Hace ${days} días`;
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

              return {
                ...v,
                productoDescripcion: this.productos.find(p => p.id === v.productoId)?.descripcion || 'Desconocido',
                usuarioNombre: usuarios.find(u => u.id === v.usuarioId)?.nombre || 'Desconocido',
                adelantoMonto: adelantoMonto,
                saldoPendiente: saldoPendiente > 0 ? saldoPendiente : 0
              };
            });
            
          // Calcular estadísticas reales
          this.inventarioTotal = this.productos.reduce((acc, p) => acc + (p.costoCalculado || 0), 0);
          this.ventasTotales = ventas.filter(v => v.estado === 'Vendido').reduce((acc, v) => acc + (v.precioVenta || 0), 0);
            
          this.movimientos = movimientos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 10).map(mov => {
              let desc = mov.descripcion;
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
  abrirDetalle(venta: any) {
    this.ventaSeleccionada = venta;
    this.displayDetalleVenta = true;
  }

  toggleMenuVenta(event: Event, venta: any, menu: any) {
    event.stopPropagation(); // Don't open detail modal
    this.menuItems = [
      { label: 'Ver Producto', icon: 'pi pi-eye', command: () => this.router.navigate(['/productos', venta.productoId]) },
      { label: 'Marcar como Entregado', icon: 'pi pi-check-circle', command: () => this.marcarEntregado(venta) },
      { label: 'Liberar Producto', icon: 'pi pi-undo', command: () => this.liberarProducto(venta) },
    ];
    menu.toggle(event);
  }

  marcarEntregado(venta: any) {
      const productoAsociado = this.productos.find(p => p.id === venta.productoId);
      this.displayDetalleVenta = false;
      this.dialogVenta.showDialog(productoAsociado, venta, 'Vendido');
  }

  liberarProducto(venta: any) {
    const msg = '¿Seguro que desea liberar este producto?\n\n' +
                'Esto significa que el usuario no recibió su producto. Se anulará la venta y el producto se habilitará para otra venta. ' +
                'Sin embargo, sus gastos asociados se mantienen (incluso los de envío), porque aunque no haya recibido el envío lo pagamos nosotros.';
    
    if (confirm(msg)) {
        this.api.eliminarVenta(venta.id!).subscribe(() => {
          this.cargarDatos();
          this.displayDetalleVenta = false;
          this.toastManager.showSuccess('Producto Liberado', 'El producto vuelve a estar disponible para venta.');
        });
    }
  }
}
