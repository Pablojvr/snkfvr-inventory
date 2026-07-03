import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ApiService, Venta, Producto, Usuario } from '../../core/services/api';
import { ToastManagerService } from '../../core/services/toast-manager.service';
import { Router } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, ButtonModule, InputTextModule, TooltipModule, MenuModule, FormsModule, DialogModule],
  templateUrl: './ventas.html',
})
export class Ventas implements OnInit {
  ventas: Venta[] = [];
  productos: Producto[] = [];
  usuarios: Usuario[] = [];

  textoFiltro: string = '';
  menuItems: MenuItem[] = [];

  // Detail modal
  displayDetalleVenta: boolean = false;
  ventaSeleccionada: any = null;

  constructor(private api: ApiService, private toastManager: ToastManagerService, private router: Router) {}

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    import('rxjs').then(({ forkJoin }) => {
      forkJoin({
        ventas: this.api.getVentas(),
        productos: this.api.getProductos(),
        usuarios: this.api.getUsuarios()
      }).subscribe(({ ventas, productos, usuarios }) => {
        this.productos = productos;
        this.usuarios = usuarios;
        this.ventas = ventas.map(v => ({
          ...v,
          productoDescripcion: productos.find(p => p.id === v.productoId)?.descripcion || 'Desconocido',
          usuarioNombre: usuarios.find(u => u.id === v.usuarioId)?.nombre || 'Desconocido'
        }));
      });
    });
  }

  showDialog() {
    this.router.navigate(['/venta-masiva']);
  }

  get ventasFiltradas() {
    if (!this.textoFiltro) return this.ventas;
    const text = this.textoFiltro.toLowerCase();
    return this.ventas.filter(v => 
      (v.productoDescripcion && v.productoDescripcion.toLowerCase().includes(text)) ||
      (v.usuarioNombre && v.usuarioNombre.toLowerCase().includes(text)) ||
      (v.estado && v.estado.toLowerCase().includes(text))
    );
  }

  abrirDetalle(venta: any) {
    this.ventaSeleccionada = venta;
    this.displayDetalleVenta = true;
  }

  toggleMenu(event: any, venta: Venta, menu: any) {
    event.stopPropagation();
    this.menuItems = [
      { label: 'Ver Producto', icon: 'pi pi-eye', command: () => this.router.navigate(['/productos', venta.productoId]) },
    ];
    if (venta.estado === 'Reservado') {
      this.menuItems.push({ label: 'Marcar Entregado', icon: 'pi pi-check-circle', command: () => this.marcarEntregado(venta) });
      this.menuItems.push({ label: 'Liberar Producto', icon: 'pi pi-undo', command: () => this.liberarProducto(venta) });
    }
    this.menuItems.push({ label: 'Eliminar', icon: 'pi pi-trash', command: () => this.eliminar(venta.id!) });
    
    menu.toggle(event);
  }

  marcarEntregado(venta: Venta) {
    const ventaActualizada = { ...venta, estado: 'Vendido', fechaVenta: new Date() };
    this.api.editarVenta(venta.id!, ventaActualizada).subscribe(() => {
        this.cargarDatos();
        this.displayDetalleVenta = false;
        this.toastManager.showSuccess('Éxito', 'Venta marcada como entregada.');
    });
  }

  liberarProducto(venta: Venta) {
    const ventaActualizada = { ...venta, estado: 'Disponible' };
    this.api.editarVenta(venta.id!, ventaActualizada).subscribe(() => {
      this.cargarDatos();
      this.displayDetalleVenta = false;
      this.toastManager.showSuccess('Producto Liberado', 'El producto vuelve a estar disponible para venta.');
    });
  }

  eliminar(id: number) {
    if(confirm('¿Seguro que desea desactivar esta venta?')) {
      this.api.eliminarVenta(id).subscribe(() => {
        this.cargarDatos();
        this.displayDetalleVenta = false;
        this.toastManager.showSuccess('Éxito', `Se eliminó la venta con ID ${id}`);
      });
    }
  }
}
