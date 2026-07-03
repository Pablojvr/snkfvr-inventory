import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { TimelineModule } from 'primeng/timeline';
import { TooltipModule } from 'primeng/tooltip';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { ApiService, Producto, Movimiento, Usuario } from '../../core/services/api';
import { ToastManagerService } from '../../core/services/toast-manager.service';
import { DialogGastoComponent } from '../../shared/components/dialog-gasto/dialog-gasto.component';

import { DialogVentaComponent } from '../../shared/components/dialog-venta/dialog-venta.component';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, ButtonModule, DialogModule, TableModule, SelectModule, FormsModule, InputTextModule, InputNumberModule, DatePickerModule, TimelineModule, TooltipModule, MenuModule, DialogGastoComponent, DialogVentaComponent],
  templateUrl: './productos.html',
})
export class Productos implements OnInit {
  productos: Producto[] = [];
  usuarios: Usuario[] = [];
  displayDialog: boolean = false;
  producto: Producto = { descripcion: '', fechaCompra: new Date() };
  
  editando: boolean = false;
  submitted: boolean = false;
  guardando: boolean = false;

  textoFiltro: string = '';
  menuItems: MenuItem[] = [];

  // Venta Modal
  @ViewChild(DialogVentaComponent) dialogVenta!: DialogVentaComponent;

  @ViewChild(DialogGastoComponent) dialogGasto!: DialogGastoComponent;


  constructor(
    private api: ApiService, 
    private toastManager: ToastManagerService, 
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.textoFiltro = params['search'] || '';
    });
    this.cargarDatos();
  }

  onFilterChange() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: this.textoFiltro || null
      },
      queryParamsHandling: 'merge'
    });
  }

  cargarDatos() {
    import('rxjs').then(({ forkJoin }) => {
      forkJoin({
        productos: this.api.getProductos(),
        gastos: this.api.getGastos(),
        usuarios: this.api.getUsuarios()
      }).subscribe(({ productos, gastos, usuarios }) => {
        this.usuarios = usuarios;
        this.productos = productos.map(p => {
            const gastosProducto = gastos.filter(g => g.productoId === p.id && g.activo);
            const costoCalculado = gastosProducto.reduce((sum, g) => sum + (g.monto || 0), 0);
            return {
                ...p,
                costoCalculado: costoCalculado
            };
        });
      });
    });
  }

  get productosFiltrados() {
    if (!this.textoFiltro) return this.productos;
    const text = this.textoFiltro.toLowerCase();
    return this.productos.filter(p => 
      p.descripcion.toLowerCase().includes(text) ||
      (p.estado && p.estado.toLowerCase().includes(text))
    );
  }

  toggleMenu(event: any, prod: Producto, menu: any) {
      event.stopPropagation();
      this.menuItems = [
          { label: 'Ver Producto (Individual)', icon: 'pi pi-eye', command: () => this.router.navigate(['/productos', prod.id]) },
          { label: 'Editar Rápido', icon: 'pi pi-pencil', command: () => this.editar(prod) },
          { label: 'Eliminar', icon: 'pi pi-trash', command: () => this.eliminar(prod.id!) }
      ];
      menu.toggle(event);
  }

  agregarComision(productoId: number) {
      this.dialogGasto.showDialog(productoId, 3);
  }

  showDialog() {
    this.producto = { descripcion: '', fechaCompra: new Date() };
    this.editando = false;
    this.submitted = false;
    this.displayDialog = true;
  }

  editar(prod: Producto) {
    this.producto = { ...prod, fechaCompra: new Date(prod.fechaCompra) };
    this.editando = true;
    this.submitted = false;
    this.displayDialog = true;
  }

  guardar() {
    this.submitted = true;
    if (this.guardando) return;
    if (!this.producto.descripcion) {
      return;
    }

    this.guardando = true;
    if (this.editando && this.producto.id) {
      this.api.editarProducto(this.producto.id, this.producto).subscribe({
        next: () => {
          this.guardando = false;
          this.displayDialog = false;
          this.cargarDatos();
          this.toastManager.showSuccess('Éxito', `Se editó el producto: ${this.producto.descripcion}`);
        },
        error: () => this.guardando = false
      });
    } else {
      this.api.crearProducto(this.producto).subscribe({
        next: () => {
          this.guardando = false;
          this.displayDialog = false;
          this.cargarDatos();
          this.toastManager.showSuccess('Éxito', `Se registró el producto: ${this.producto.descripcion}`);
        },
        error: () => this.guardando = false
      });
    }
  }



  registrarVenta(prod: Producto) {
      this.dialogVenta.showDialog(prod);
  }

  eliminar(id: number) {
    if(confirm('¿Seguro que desea desactivar este producto?')) {
      this.api.eliminarProducto(id).subscribe(() => {
        this.cargarDatos();
        this.toastManager.showSuccess('Éxito', `Se eliminó el producto con ID ${id}`);
      });
    }
  }
}
