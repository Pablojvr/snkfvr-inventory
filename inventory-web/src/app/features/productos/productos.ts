import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { TimelineModule } from 'primeng/timeline';
import { TooltipModule } from 'primeng/tooltip';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { ApiService, Producto, Movimiento } from '../../core/services/api';
import { ToastManagerService } from '../../core/services/toast-manager.service';
import { DialogGastoComponent } from '../../shared/components/dialog-gasto/dialog-gasto.component';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, ButtonModule, DialogModule, FormsModule, InputTextModule, InputNumberModule, DatePickerModule, TimelineModule, TooltipModule, MenuModule, DialogGastoComponent],
  templateUrl: './productos.html',
})
export class Productos implements OnInit {
  productos: Producto[] = [];
  displayDialog: boolean = false;
  displayTimeline: boolean = false;
  producto: Producto = { descripcion: '', fechaCompra: new Date(), costo: 0 };
  movimientosProducto: Movimiento[] = [];
  
  editando: boolean = false;
  submitted: boolean = false;
  guardando: boolean = false;

  textoFiltro: string = '';
  menuItems: MenuItem[] = [];

  @ViewChild(DialogGastoComponent) dialogGasto!: DialogGastoComponent;


  constructor(private api: ApiService, private toastManager: ToastManagerService, private router: Router) {}

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.api.getProductos().subscribe(data => this.productos = data);
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
          { label: 'Ver Producto', icon: 'pi pi-eye', command: () => this.router.navigate(['/productos', prod.id]) },
          { label: 'Editar', icon: 'pi pi-pencil', command: () => this.editar(prod) },
      ];
      
      if (prod.estado !== 'Vendido') {
          this.menuItems.push({ label: 'Registrar Comisión', icon: 'pi pi-dollar', command: () => this.agregarComision(prod.id!) });
          this.menuItems.push({ label: 'Registrar Venta', icon: 'pi pi-shopping-cart', command: () => this.venderProducto(prod.id!) });
      }
      this.menuItems.push({ label: 'Eliminar', icon: 'pi pi-trash', command: () => this.eliminar(prod.id!) });
      
      menu.toggle(event);
  }

  agregarComision(productoId: number) {
      this.dialogGasto.showDialog(productoId, 'Comisión');
  }

  verTimeline(prod: Producto) {
    if (prod.id) {
        import('rxjs').then(({ forkJoin }) => {
            forkJoin({
                movimientos: this.api.getMovimientosPorProducto(prod.id!),
                usuarios: this.api.getUsuarios()
            }).subscribe(({ movimientos, usuarios }) => {
                this.movimientosProducto = movimientos.map(mov => {
                    let desc = mov.descripcion;
                    desc = desc.replace(/usuario con ID (\d+)/g, (match, p1) => {
                        const u = usuarios.find(x => x.id === parseInt(p1, 10));
                        return u ? u.nombre : match;
                    });
                    desc = desc.replace(/producto (\d+)/g, (match, p1) => {
                        const p = this.productos.find(x => x.id === parseInt(p1, 10));
                        return p ? `producto ${p.descripcion}` : match;
                    });
                    return { ...mov, descripcion: desc };
                });
                this.displayTimeline = true;
            });
        });
    }
  }

  showDialog() {
    this.producto = { descripcion: '', fechaCompra: new Date(), costo: 0 };
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
    if (!this.producto.descripcion || !this.producto.costo || this.producto.costo <= 0) {
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

  venderProducto(id: number) {
    this.router.navigate(['/venta-masiva'], { queryParams: { productoId: id } });
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
