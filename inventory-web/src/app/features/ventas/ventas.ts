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
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, ButtonModule, InputTextModule, TooltipModule, MenuModule, FormsModule, DialogModule, SelectModule, InputNumberModule],
  templateUrl: './ventas.html',
})
export class Ventas implements OnInit {
  productos: any[] = [];
  ventasRaw: Venta[] = [];
  usuarios: Usuario[] = [];

  textoFiltro: string = '';
  estadoFiltro: string = 'Disponible';
  estadoOpciones: any[] = [
    { label: 'Disponibles', value: 'Disponible' },
    { label: 'Reservados', value: 'Reservado' },
    { label: 'Vendidos', value: 'Vendido' },
    { label: 'Todos', value: 'Todos' }
  ];

  estadoVentaOpciones: any[] = [
    { label: 'Reservado', value: 'Reservado' },
    { label: 'Vendido', value: 'Vendido' },
    { label: 'Disponible (Anular)', value: 'Disponible' }
  ];

  menuItems: MenuItem[] = [];

  // New Sale modal
  displayNuevaVenta: boolean = false;
  nuevaVentaData: any = {};
  
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
           
           const gastosProd = gastos.filter(g => g.productoId === p.id && g.activo && g.tipo !== 'Calzado');
           const totalGastos = gastosProd.reduce((acc, curr) => acc + curr.monto, 0);
           const costoCalculado = (p.costo || 0) + totalGastos;

           return {
               ...p,
               costoCalculado: costoCalculado,
               ventaAsociada: venta,
               estadoActual: venta ? venta.estado : 'Disponible',
               nombreComprador: venta?.nombreComprador || '',
               lugarDestino: venta?.lugarDestino || '',
               precioVenta: venta?.precioVenta || 0
           };
        });
      });
    });
  }

  get productosFiltrados() {
    let filtradas = this.productos;
    
    if (this.estadoFiltro !== 'Todos') {
        filtradas = filtradas.filter(p => p.estadoActual === this.estadoFiltro);
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

  showDialog(producto: any) {
    this.nuevaVentaData = {
        productoPreseleccionado: true,
        productoSeleccionado: producto,
        precioVenta: producto.costoCalculado || producto.costo || 0,
        costoEnvio: 0,
        costosAdicionales: 0,
        estado: 'Reservado',
        nombreComprador: '',
        lugarDestino: ''
    };
    this.displayNuevaVenta = true;
  }

  nuevaVentaRapida() {
    this.nuevaVentaData = {
        productoPreseleccionado: false,
        productoSeleccionado: null,
        precioVenta: 0,
        costoEnvio: 0,
        costosAdicionales: 0,
        estado: 'Reservado',
        nombreComprador: '',
        lugarDestino: ''
    };
    this.displayNuevaVenta = true;
  }

  onProductoSeleccionadoModal(producto: any) {
      if (producto) {
          this.nuevaVentaData.precioVenta = producto.costoCalculado || producto.costo || 0;
      }
  }

  guardarNuevaVenta() {
      if (!this.nuevaVentaData.productoSeleccionado) return;

      const v: Venta = {
          productoId: this.nuevaVentaData.productoSeleccionado.id!,
          costoEnvio: this.nuevaVentaData.costoEnvio || 0,
          costosAdicionales: this.nuevaVentaData.costosAdicionales || 0,
          precioVenta: this.nuevaVentaData.precioVenta || 0,
          usuarioId: Number(localStorage.getItem('userId')) || 1, 
          estado: this.nuevaVentaData.estado,
          nombreComprador: this.nuevaVentaData.nombreComprador,
          lugarDestino: this.nuevaVentaData.lugarDestino,
          fechaVenta: new Date()
      };

      this.api.crearVenta(v).subscribe({
          next: () => {
              this.displayNuevaVenta = false;
              this.toastManager.showSuccess('Éxito', 'Venta registrada correctamente');
              this.cargarDatos();
          },
          error: (err) => this.toastManager.showError('Error', 'No se pudo registrar la venta')
      });
  }

  toggleMenu(event: any, producto: any, menu: any) {
    event.stopPropagation();
    this.menuItems = [
      { label: 'Ver Detalle Producto', icon: 'pi pi-eye', command: () => this.router.navigate(['/productos', producto.id]) },
    ];
    if (producto.estadoActual === 'Disponible') {
      this.menuItems.push({ label: 'Registrar Venta', icon: 'pi pi-shopping-cart', command: () => this.showDialog(producto) });
    } else if (producto.estadoActual === 'Reservado') {
      this.menuItems.push({ label: 'Marcar como Vendido', icon: 'pi pi-check', command: () => this.marcarComoVendido(producto) });
      this.menuItems.push({ label: 'Marcar como Disponible', icon: 'pi pi-undo', command: () => this.anularVenta(producto.ventaAsociada.id) });
    } else if (producto.estadoActual === 'Vendido') {
       // Si es vendido, la unica accion sobre la venta podría ser anularla para volver a disponible. 
       this.menuItems.push({ label: 'Marcar como Disponible', icon: 'pi pi-undo', command: () => this.anularVenta(producto.ventaAsociada.id) });
    }
    menu.toggle(event);
  }

  marcarComoVendido(producto: any) {
      if (producto.ventaAsociada) {
          const ventaActualizada = { ...producto.ventaAsociada, estado: 'Vendido' };
          this.api.editarVenta(producto.ventaAsociada.id, ventaActualizada).subscribe(() => {
              this.toastManager.showSuccess('Éxito', 'El producto ahora está Vendido');
              this.cargarDatos();
          });
      }
  }

  anularVenta(ventaId: number) {
      if(confirm('¿Seguro que desea anular esta venta y devolver el producto a Disponible?')) {
          this.api.eliminarVenta(ventaId).subscribe(() => {
              this.cargarDatos();
              this.toastManager.showSuccess('Éxito', 'Venta anulada correctamente');
          });
      } else {
         this.cargarDatos();
      }
  }

  abrirDetalle(producto: any) {
    // Si clickean la card, abrimos el menú (o si está disponible abrimos modal, depende de la lógica del template)
    // El template puede llamar a toggleMenu directamente o a abrirDetalle.
    // Si la idea es que el click en tarjeta muestre el menu (3 puntos):
    // El template pasará el click al menu.
  }

}
