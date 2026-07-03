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
import { ApiService, Venta, Producto, Usuario } from '../../core/services/api';
import { ToastManagerService } from '../../core/services/toast-manager.service';

import { DialogGastoComponent } from '../../shared/components/dialog-gasto/dialog-gasto.component';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ButtonModule, TimelineModule, SelectModule, FormsModule, DialogModule, MenuModule, TooltipModule, DialogGastoComponent, InputNumberModule, InputTextModule],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  
  ventasReservadas: any[] = [];
  movimientos: any[] = [];
  productos: Producto[] = [];
  usuarios: Usuario[] = [];
  
  productosParaBuscador: Producto[] = [];
  productosFiltrados: Producto[] = [];
  productoBuscado: any;

  // Detail modal
  displayDetalleVenta: boolean = false;
  ventaSeleccionada: any = null;

  // Menu
  menuItems: MenuItem[] = [];
  
  // Dialog Gasto
  @ViewChild(DialogGastoComponent) dialogGasto!: DialogGastoComponent;

  // Dialog Nueva Venta
  displayNuevaVenta: boolean = false;
  editandoVenta: boolean = false;
  ventaEditId?: number;
  nuevaVentaData: any = {};
  productosDisponibles: Producto[] = [];

  constructor(private api: ApiService, private router: Router, private toastManager: ToastManagerService) {}

  ngOnInit() {
    this.cargarDatos();
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
             const gastosProd = gastos.filter(g => g.productoId === p.id && g.activo && g.tipo !== 'Calzado');
             const totalGastos = gastosProd.reduce((acc, curr) => acc + (curr.monto || 0), 0);
             return { ...p, costoCalculado: (p.costo || 0) + totalGastos };
          });
          this.usuarios = usuarios;
          
          this.ventasReservadas = ventas
            .filter(v => v.estado === 'Reservado')
            .map(v => ({
              ...v,
              productoDescripcion: this.productos.find(p => p.id === v.productoId)?.descripcion || 'Desconocido',
              usuarioNombre: usuarios.find(u => u.id === v.usuarioId)?.nombre || 'Desconocido'
            }));

          this.productosDisponibles = this.productos.filter(p => p.estado === 'Disponible' || !p.estado);
            
            
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
      const fabriUser = this.usuarios.find(u => u.nombre.toLowerCase().includes('fabri'));
      this.editandoVenta = false;
      this.ventaEditId = undefined;
      this.nuevaVentaData = { 
          productoPreseleccionado: false,
          productoSeleccionado: null, 
          precioVenta: null, 
          estado: 'Vendido',
          costoEnvio: null,
          costosAdicionales: null,
          nombreComprador: '',
          lugarDestino: '',
          comisionMonto: null,
          comisionUsuarioId: fabriUser ? fabriUser.id : null
      };
      this.displayNuevaVenta = true;
  }
  
  onNuevaVentaChange() {
      if (this.nuevaVentaData.estado === 'Vendido' && this.nuevaVentaData.productoSeleccionado && this.nuevaVentaData.precioVenta) {
          const costoCalc = this.nuevaVentaData.productoSeleccionado.costoCalculado || this.nuevaVentaData.productoSeleccionado.costo || 0;
          const ganancia = this.nuevaVentaData.precioVenta - costoCalc;
          if (ganancia > 0) {
              this.nuevaVentaData.comisionMonto = ganancia / 2;
          } else {
              this.nuevaVentaData.comisionMonto = 0;
          }
      } else {
          this.nuevaVentaData.comisionMonto = null;
      }
  }

  guardarNuevaVenta() {
      if (!this.nuevaVentaData.productoSeleccionado) return;
      
      // Validation
      if (this.nuevaVentaData.estado === 'Vendido') {
          if (!this.nuevaVentaData.nombreComprador || !this.nuevaVentaData.lugarDestino) {
              this.toastManager.showError('Error', 'Para un producto Vendido, Comprador y Lugar son obligatorios.');
              return;
          }
      }
      
      const venta: any = {
          productoId: this.nuevaVentaData.productoSeleccionado.id!,
          usuarioId: parseInt(localStorage.getItem('usuarioActivoId') || '0', 10),
          precioVenta: this.nuevaVentaData.precioVenta || 0,
          fechaRegistro: new Date(),
          fechaVenta: this.nuevaVentaData.estado === 'Vendido' ? new Date() : undefined,
          estado: this.nuevaVentaData.estado,
          costoEnvio: this.nuevaVentaData.costoEnvio || 0,
          costosAdicionales: this.nuevaVentaData.costosAdicionales || 0,
          nombreComprador: this.nuevaVentaData.nombreComprador,
          lugarDestino: this.nuevaVentaData.lugarDestino,
          comisionMonto: this.nuevaVentaData.estado === 'Vendido' ? this.nuevaVentaData.comisionMonto : null,
          comisionUsuarioId: this.nuevaVentaData.comisionUsuarioId
      };

      if (this.editandoVenta && this.ventaEditId) {
          this.api.editarVenta(this.ventaEditId, venta).subscribe({
              next: () => {
                  this.displayNuevaVenta = false;
                  this.toastManager.showSuccess('Éxito', 'Venta actualizada correctamente');
                  this.cargarDatos();
              },
              error: (err) => this.toastManager.showError('Error', 'No se pudo actualizar la venta')
          });
      } else {
          this.api.crearVenta(venta).subscribe(() => {
              this.displayNuevaVenta = false;
              this.toastManager.showSuccess('Éxito', 'Venta registrada desde el Dashboard.');
              this.cargarDatos();
          });
      }
  }

  nuevoGastoRapido() {
    this.dialogGasto.showDialog(undefined, 'Calzado', undefined, true);
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
      const fabriUser = this.usuarios.find(u => u.nombre.toLowerCase().includes('fabri'));
      const productoAsociado = this.productos.find(p => p.id === venta.productoId);
      
      this.editandoVenta = true;
      this.ventaEditId = venta.id;
      this.nuevaVentaData = {
          productoPreseleccionado: true,
          productoSeleccionado: productoAsociado,
          precioVenta: venta.precioVenta,
          costoEnvio: venta.costoEnvio || null,
          costosAdicionales: venta.costosAdicionales || null,
          estado: 'Vendido',
          nombreComprador: venta.nombreComprador || '',
          lugarDestino: venta.lugarDestino || '',
          comisionMonto: null,
          comisionUsuarioId: fabriUser ? fabriUser.id : null
      };
      this.displayDetalleVenta = false;
      this.onNuevaVentaChange();
      this.displayNuevaVenta = true;
  }

  liberarProducto(venta: any) {
    const msg = '¿Seguro que desea liberar este producto?\n\n' +
                'Esto significa que el usuario no recibió su producto. Se anulará la venta y el producto se habilitará para otra venta. ' +
                'Sin embargo, sus gastos asociados se mantienen (incluso los de envío), porque aunque no haya recibido el envío lo pagamos nosotros.';
    
    if (confirm(msg)) {
        const ventaActualizada = { ...venta, estado: 'Disponible' };
        delete ventaActualizada.productoDescripcion;
        delete ventaActualizada.usuarioNombre;
        this.api.editarVenta(venta.id!, ventaActualizada).subscribe(() => {
          this.cargarDatos();
          this.displayDetalleVenta = false;
          this.toastManager.showSuccess('Producto Liberado', 'El producto vuelve a estar disponible para venta.');
        });
    }
  }
}
