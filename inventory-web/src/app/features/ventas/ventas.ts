import { Component, OnInit, ViewChild, HostListener, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ApiService, Venta, Producto, Usuario } from '../../core/services/api';
import { ToastManagerService } from '../../core/services/toast-manager.service';
import { Router, ActivatedRoute } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogVentaComponent } from '../../shared/components/dialog-venta/dialog-venta.component';
import { PaginatorModule } from 'primeng/paginator';

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, ButtonModule, InputTextModule, TooltipModule, MenuModule, FormsModule, DialogModule, SelectModule, InputNumberModule, DialogVentaComponent, PaginatorModule],
  templateUrl: './ventas.html',
})
export class Ventas implements OnInit, AfterViewInit {
  productos: any[] = [];
  ventasRaw: Venta[] = [];
  usuarios: Usuario[] = [];

  textoFiltro: string = '';
  estadoFiltro: string = 'Todos';
  estadoOpciones: any[] = [
    { label: 'Disponibles', value: 'Disponible' },
    { label: 'Reservados', value: 'Reservado' },
    { label: 'Vendidos', value: 'Vendido' },
    { label: 'Por Cobrar', value: 'PorCobrar' },
    { label: 'Todos', value: 'Todos' }
  ];

  estadoVentaOpciones: any[] = [
    { label: 'Reservado', value: 'Reservado' },
    { label: 'Vendido', value: 'Vendido' },
    { label: 'Disponible (Anular)', value: 'Disponible' }
  ];

  menuItems: MenuItem[] = [];
  displayConfirmarEntrega: boolean = false;
  productoSeleccionadoParaEntrega: any = null;

  displayAnularVenta: boolean = false;
  ventaAAnular: any = null;
  montoMaximoDevolucion: number = 0;
  montoDevolucionIngresado: number = 0;

  // Paginación
  first: number = 0;
  rows: number = 12;

  onPageChange(event: any) {
      this.first = event.first;
      this.rows = event.rows;
  }

  isScrolled: boolean = false;

  @HostListener('window:scroll', [])
  onWindowScroll() {
      this.checkScroll(window.scrollY || document.documentElement.scrollTop);
  }

  ngAfterViewInit() {
      const contentEl = document.querySelector('.content');
      if (contentEl) {
          contentEl.addEventListener('scroll', (e: any) => {
              this.checkScroll(e.target.scrollTop);
          });
      }
  }

  checkScroll(scrollTop: number) {
      if (scrollTop > 30 && !this.isScrolled) {
          this.isScrolled = true;
      } else if (scrollTop <= 30 && this.isScrolled) {
          this.isScrolled = false;
      }
  }

  // Dialog Venta
  @ViewChild(DialogVentaComponent) dialogVenta!: DialogVentaComponent;
  
  constructor(private api: ApiService, private toastManager: ToastManagerService, public router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
        this.textoFiltro = params['search'] || '';
        this.estadoFiltro = params['estado'] || 'Disponible';
    });
    this.cargarDatos();
  }

  onFilterChange() {
      this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {
              search: this.textoFiltro || null,
              estado: this.estadoFiltro !== 'Disponible' ? this.estadoFiltro : null
          },
          queryParamsHandling: 'merge'
      });
  }

  setEstadoFiltro(estado: string) {
      this.estadoFiltro = estado;
      this.first = 0;
      this.onFilterChange();
  }

  cargarDatos() {
    import('rxjs').then(({ forkJoin }) => {
      forkJoin({
        ventas: this.api.getVentas(),
        productos: this.api.getProductos(),
        usuarios: this.api.getUsuarios(),
        gastos: this.api.getGastos()
      }).subscribe(({ ventas, productos, usuarios, gastos }) => {
        this.ventasRaw = ventas;
        this.usuarios = usuarios;
        
        this.productos = productos.map(p => {
           const venta = ventas.find(v => v.productoId === p.id && v.activo);
           
           const gastosProd = gastos.filter(g => g.productoId === p.id && g.activo);
           const costoCalculado = gastosProd.reduce((acc, curr) => acc + (curr.monto || 0), 0);

           return {
               ...p,
               costoCalculado: costoCalculado,
               ventaAsociada: venta ? { ...venta, estadoPago: venta.estadoPago || 'Pendiente' } : undefined,
               estadoActual: venta ? venta.estado : 'Disponible',
               nombreComprador: venta?.nombreComprador || '',
               lugarDestino: venta?.lugarDestino || '',
               precioVenta: venta?.precioVenta || 0
           };
        }).sort((a, b) => {
           const dateB = b.ventaAsociada ? new Date(b.ventaAsociada.fechaVenta || b.ventaAsociada.fechaRegistro || 0).getTime() : new Date(b.fechaCompra).getTime();
           const dateA = a.ventaAsociada ? new Date(a.ventaAsociada.fechaVenta || a.ventaAsociada.fechaRegistro || 0).getTime() : new Date(a.fechaCompra).getTime();
           return dateB - dateA;
        });
      });
    });
  }

  get productosFiltrados() {
    let filtradas = this.productos;
    
    if (this.estadoFiltro !== 'Todos') {
        if (this.estadoFiltro === 'PorCobrar') {
            filtradas = filtradas.filter(p => p.ventaAsociada && p.ventaAsociada.estado === 'Vendido' && (p.ventaAsociada.estadoPago === 'Pendiente' || !p.ventaAsociada.estadoPago));
        } else {
            filtradas = filtradas.filter(p => p.estadoActual === this.estadoFiltro);
        }
    }
    
    if (this.textoFiltro) {
        const text = this.textoFiltro.toLowerCase();
        filtradas = filtradas.filter(p => 
          (p.descripcion && p.descripcion.toLowerCase().includes(text)) ||
          (p.nombreComprador && p.nombreComprador.toLowerCase().includes(text)) ||
          (p.lugarDestino && p.lugarDestino.toLowerCase().includes(text)) ||
          (p.estadoActual && p.estadoActual.toLowerCase().includes(text))
        );
    }
    return filtradas;
  }

  get productosDisponibles() {
    return this.productos.filter(p => p.estadoActual === 'Disponible');
  }

  countByState(state: string): number {
    if (state === 'Todos') return this.productos.length;
    if (state === 'PorCobrar') return this.productos.filter(p => p.ventaAsociada && p.ventaAsociada.estado === 'Vendido' && (p.ventaAsociada.estadoPago === 'Pendiente' || !p.ventaAsociada.estadoPago)).length;
    return this.productos.filter(p => p.estadoActual === state).length;
  }

  showDialog(producto: any) {
    this.dialogVenta.showDialog(producto);
  }

  nuevaVentaRapida() {
    this.dialogVenta.showDialog();
  }

  toggleMenu(event: any, producto: any, menu: any) {
    event.stopPropagation();
    this.menuItems = [
        {
            label: 'Ver Detalles de Producto',
            icon: 'pi pi-eye',
            command: () => this.router.navigate(['/productos', producto.id])
        }
    ];

    if (producto.estadoActual !== 'Disponible') {
        this.menuItems.push({
            label: 'Editar Venta',
            icon: 'pi pi-pencil',
            command: () => this.editarVenta(producto)
        });
    }

    if (producto.estadoActual === 'Disponible') {
        this.menuItems.push({
            label: 'Registrar Venta',
            icon: 'pi pi-shopping-cart',
            command: () => this.showDialog(producto)
        });
    } else if (producto.estadoActual === 'Reservado') {
      this.menuItems.push({ label: 'Marcar como Entregado', icon: 'pi pi-check', command: () => this.marcarComoVendido(producto) });
      this.menuItems.push({ label: 'Marcar como Disponible', icon: 'pi pi-undo', command: () => this.anularVenta(producto.ventaAsociada) });
    }
    
    menu.toggle(event);
  }

  editarVenta(producto: any) {
    if (!producto.ventaAsociada) return;
    this.dialogVenta.showDialog(producto, producto.ventaAsociada);
  }

  marcarComoVendido(producto: any) {
      if (producto.ventaAsociada) {
          this.productoSeleccionadoParaEntrega = producto;
          this.displayConfirmarEntrega = true;
      }
  }

  confirmarEntrega(estadoPago: string) {
      if (!this.productoSeleccionadoParaEntrega || !this.productoSeleccionadoParaEntrega.ventaAsociada) return;
      
      const ventaActualizada = {
          ...this.productoSeleccionadoParaEntrega.ventaAsociada,
          estado: 'Vendido',
          estadoPago: estadoPago
      };

      this.api.editarVenta(this.productoSeleccionadoParaEntrega.ventaAsociada.id, ventaActualizada).subscribe(() => {
          this.cargarDatos();
          this.displayConfirmarEntrega = false;
          this.toastManager.showSuccess('Entrega Confirmada', 'El estado del producto ha sido actualizado.');
      });
  }

  anularVenta(venta: any) {
      if (!venta) return;
      this.ventaAAnular = venta;
      let montoAbonado = 0;
      
      if (venta.estado === 'Vendido' && venta.estadoPago === 'Cobrado') {
          montoAbonado = venta.precioVenta || 0;
      } else if (venta.estado === 'Reservado' && venta.adelantoMonto > 0) {
          montoAbonado = venta.adelantoMonto;
      }
      
      this.montoMaximoDevolucion = montoAbonado;
      this.montoDevolucionIngresado = 0; 
      this.displayAnularVenta = true;
  }

  confirmarAnulacion() {
      if (!this.ventaAAnular) return;
      this.api.eliminarVenta(this.ventaAAnular.id, this.montoDevolucionIngresado).subscribe(() => {
          this.cargarDatos();
          this.displayAnularVenta = false;
          this.toastManager.showSuccess('Éxito', 'Venta anulada y producto liberado');
      });
  }

  abrirDetalle(producto: any) {
    // Si clickean la card, abrimos el menú (o si está disponible abrimos modal, depende de la lógica del template)
    // El template puede llamar a toggleMenu directamente o a abrirDetalle.
    // Si la idea es que el click en tarjeta muestre el menu (3 puntos):
    // El template pasará el click al menu.
  }

}
