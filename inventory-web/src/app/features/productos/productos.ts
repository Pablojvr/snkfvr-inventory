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

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, ButtonModule, DialogModule, TableModule, SelectModule, FormsModule, InputTextModule, InputNumberModule, DatePickerModule, TimelineModule, TooltipModule, MenuModule, DialogGastoComponent],
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
  displayNuevaVenta: boolean = false;
  guardandoVenta: boolean = false;
  editandoVenta: boolean = false;
  ventaEditId: number | null = null;
  nuevaVentaData: any = {};
  estadoVentaOpciones: any[] = [
    { label: 'Vendido (Entregado)', value: 'Vendido' },
    { label: 'Reservado (Pendiente)', value: 'Reservado' }
  ];

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
      this.dialogGasto.showDialog(productoId, 'Comisión');
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

  venderProducto(prod: Producto) {
    const fabriUser = this.usuarios.find(u => u.nombre.toLowerCase().includes('fabri'));
    const suggestedPrice = (prod.costoCalculado || 0) + 15;

    this.nuevaVentaData = {
        productoPreseleccionado: true,
        productoSeleccionado: prod,
        precioVenta: suggestedPrice,
        costoEnvio: null,
        costosAdicionales: null,
        estado: 'Reservado',
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

      const v: any = {
          productoId: this.nuevaVentaData.productoSeleccionado.id!,
          costoEnvio: this.nuevaVentaData.costoEnvio || 0,
          costosAdicionales: this.nuevaVentaData.costosAdicionales || 0,
          precioVenta: this.nuevaVentaData.precioVenta || 0,
          usuarioId: Number(localStorage.getItem('usuarioActivoId')) || 1, 
          estado: this.nuevaVentaData.estado,
          nombreComprador: this.nuevaVentaData.nombreComprador,
          lugarDestino: this.nuevaVentaData.lugarDestino,
          fechaVenta: new Date(),
          comisionMonto: this.nuevaVentaData.estado === 'Vendido' ? this.nuevaVentaData.comisionMonto : null,
          comisionUsuarioId: this.nuevaVentaData.comisionUsuarioId
      };
      this.guardandoVenta = true;
      if (this.editandoVenta && this.ventaEditId) {
          this.api.editarVenta(this.ventaEditId, v).subscribe({
              next: () => {
                  this.guardandoVenta = false;
                  this.displayNuevaVenta = false;
                  this.toastManager.showSuccess('Éxito', 'Venta actualizada correctamente');
                  this.cargarDatos();
              },
              error: (err) => {
                  this.guardandoVenta = false;
                  this.toastManager.showError('Error', 'No se pudo actualizar la venta');
              }
          });
      } else {
          this.api.crearVenta(v).subscribe({
              next: () => {
                  this.guardandoVenta = false;
                  this.displayNuevaVenta = false;
                  this.toastManager.showSuccess('Éxito', 'Venta registrada correctamente');
                  this.cargarDatos();
              },
              error: (err) => {
                  this.guardandoVenta = false;
                  this.toastManager.showError('Error', 'No se pudo registrar la venta');
              }
          });
      }
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
