import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ApiService, Gasto, Producto, Usuario } from '../../core/services/api';
import { ToastManagerService } from '../../core/services/toast-manager.service';
import { DialogGastoComponent } from '../../shared/components/dialog-gasto/dialog-gasto.component';
import { DialogVentaComponent } from '../../shared/components/dialog-venta/dialog-venta.component';
import { Router } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-gastos',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, InputTextModule, SelectModule, TooltipModule, DialogGastoComponent, DialogVentaComponent, FormsModule, MenuModule],
  templateUrl: './gastos.html',
})
export class Gastos implements OnInit {
  gastos: Gasto[] = [];
  productos: Producto[] = [];
  usuarios: Usuario[] = [];

  tipoFiltro: string | null = null;
  opcionesFiltro: any[] = [
    { label: 'Todos', value: null },
    { label: 'Solo Calzado', value: 'Calzado' }
  ];
  
  menuItems: MenuItem[] = [];

  @ViewChild(DialogGastoComponent) dialogGasto!: DialogGastoComponent;
  @ViewChild(DialogVentaComponent) dialogVenta!: DialogVentaComponent;

  constructor(private api: ApiService, private toastManager: ToastManagerService, private router: Router) {}

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    import('rxjs').then(({ forkJoin }) => {
      forkJoin({
        gastos: this.api.getGastos(),
        productos: this.api.getProductos(),
        usuarios: this.api.getUsuarios()
      }).subscribe(({ gastos, productos, usuarios }) => {
        this.productos = productos;
        this.usuarios = usuarios;
        this.gastos = gastos.map(g => ({
          ...g,
          productoDescripcion: g.productoId ? productos.find(p => p.id === g.productoId)?.descripcion || 'Desconocido' : '',
          usuarioNombre: usuarios.find(u => u.id === g.usuarioId)?.nombre || 'Desconocido'
        }));
      });
    });
  }

  showDialog() {
    this.dialogGasto.showDialog();
  }

  toggleMenu(event: any, gasto: Gasto, menu: any) {
    this.menuItems = [
      { label: 'Editar', icon: 'pi pi-pencil', command: () => this.editar(gasto) },
      { label: 'Eliminar', icon: 'pi pi-trash', command: () => this.eliminar(gasto.id!) }
    ];

    if (gasto.tipo === 'Calzado' && gasto.productoId) {
      const prod = this.productos.find(p => p.id === gasto.productoId);
      this.menuItems.unshift({ label: 'Ver Producto', icon: 'pi pi-eye', command: () => this.router.navigate(['/productos', gasto.productoId]) });
      
      if (prod && prod.estado !== 'Vendido') {
          this.menuItems.push({ label: 'Registrar Comisión', icon: 'pi pi-dollar', command: () => this.agregarComision(gasto.productoId!) });
          this.menuItems.push({ label: 'Registrar Venta', icon: 'pi pi-shopping-cart', command: () => this.venderProducto(gasto.productoId!) });
      }
    }

    menu.toggle(event);
  }

  editar(gasto: Gasto) {
    this.dialogGasto.showDialog(undefined, undefined, gasto);
  }

  agregarComision(productoId: number) {
    this.dialogGasto.showDialog(productoId, 'Comisión');
  }

  agregarEnvio(productoId: number) {
    this.dialogGasto.showDialog(productoId, 'Envío');
  }

  venderProducto(productoId: number) {
    this.dialogVenta.showDialog(productoId);
  }

  eliminar(id: number) {
    if(confirm('¿Seguro que desea desactivar este gasto?')) {
      this.api.eliminarGasto(id).subscribe(() => {
        this.cargarDatos();
        this.toastManager.showSuccess('Éxito', `Se eliminó el gasto con ID ${id}`);
      });
    }
  }

  get gastosFiltrados() {
    if (this.tipoFiltro) {
        return this.gastos.filter(g => g.tipo === this.tipoFiltro);
    }
    return this.gastos;
  }
}
