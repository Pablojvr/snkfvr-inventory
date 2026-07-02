import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ApiService, Venta, Producto, Usuario } from '../../core/services/api';
import { ToastManagerService } from '../../core/services/toast-manager.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, InputTextModule, TooltipModule],
  templateUrl: './ventas.html',
})
export class Ventas implements OnInit {
  ventas: Venta[] = [];
  productos: Producto[] = [];
  usuarios: Usuario[] = [];

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

  marcarEntregado(venta: Venta) {
    if(confirm('¿Confirmar que el cliente recibió el producto? Esto cambiará el estado a Vendido y registrará la fecha actual.')) {
        const ventaActualizada = { ...venta, estado: 'Vendido', fechaVenta: new Date() };
        this.api.editarVenta(venta.id!, ventaActualizada).subscribe(() => {
            this.cargarDatos();
            this.toastManager.showSuccess('Éxito', 'Venta marcada como entregada.');
        });
    }
  }

  eliminar(id: number) {
    if(confirm('¿Seguro que desea desactivar esta venta?')) {
      this.api.eliminarVenta(id).subscribe(() => {
        this.cargarDatos();
        this.toastManager.showSuccess('Éxito', `Se eliminó la venta con ID ${id}`);
      });
    }
  }
}
