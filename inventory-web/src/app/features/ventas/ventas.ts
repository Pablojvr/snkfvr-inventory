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
  estadoFiltro: string = 'Todos';
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
  editandoVenta: boolean = false;
  ventaEditId?: number;
  guardandoVenta: boolean = false;
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
           
           const gastosProd = gastos.filter(g => g.productoId === p.id && g.activo);
           const costoCalculado = gastosProd.reduce((acc, curr) => acc + (curr.monto || 0), 0);

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
    const fabriUser = this.usuarios.find(u => u.nombre.toLowerCase().includes('fabri'));
    const suggestedPrice = (producto.costoCalculado || producto.costo || 0) + 15;
    
    this.editandoVenta = false;
    this.ventaEditId = undefined;
    this.nuevaVentaData = {
        productoPreseleccionado: true,
        productoSeleccionado: producto,
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

  nuevaVentaRapida() {
    const fabriUser = this.usuarios.find(u => u.nombre.toLowerCase().includes('fabri'));
    this.editandoVenta = false;
    this.ventaEditId = undefined;
    this.nuevaVentaData = {
        productoPreseleccionado: false,
        productoSeleccionado: null,
        precioVenta: null,
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

  onProductoSeleccionadoModal(producto: any) {
      if (producto) {
          this.nuevaVentaData.precioVenta = (producto.costoCalculado || producto.costo || 0) + 15;
          this.onNuevaVentaChange();
      }
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
          usuarioId: Number(localStorage.getItem('userId')) || 1, 
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
      this.menuItems.push({ label: 'Marcar como Vendido', icon: 'pi pi-check', command: () => this.marcarComoVendido(producto) });
      this.menuItems.push({ label: 'Marcar como Disponible', icon: 'pi pi-undo', command: () => this.anularVenta(producto.ventaAsociada.id) });
    }
    
    menu.toggle(event);
  }

  editarVenta(producto: any) {
    if (!producto.ventaAsociada) return;
    const venta = producto.ventaAsociada;
    
    this.editandoVenta = true;
    this.ventaEditId = venta.id;
    
    this.nuevaVentaData = {
        productoPreseleccionado: true,
        productoSeleccionado: producto,
        precioVenta: venta.precioVenta,
        costoEnvio: venta.costoEnvio,
        costosAdicionales: venta.costosAdicionales,
        estado: venta.estado,
        nombreComprador: venta.nombreComprador,
        lugarDestino: venta.lugarDestino,
        comisionMonto: venta.comisionMonto,
        comisionUsuarioId: venta.comisionUsuarioId
    };
    this.displayNuevaVenta = true;
  }

  marcarComoVendido(producto: any) {
      if (producto.ventaAsociada) {
          const fabriUser = this.usuarios.find(u => u.nombre.toLowerCase().includes('fabri'));
          
          this.editandoVenta = true;
          this.ventaEditId = producto.ventaAsociada.id;
          this.nuevaVentaData = {
              productoPreseleccionado: true,
              productoSeleccionado: producto,
              precioVenta: producto.ventaAsociada.precioVenta,
              costoEnvio: producto.ventaAsociada.costoEnvio || null,
              costosAdicionales: producto.ventaAsociada.costosAdicionales || null,
              estado: 'Vendido',
              nombreComprador: producto.ventaAsociada.nombreComprador || '',
              lugarDestino: producto.ventaAsociada.lugarDestino || '',
              comisionMonto: null,
              comisionUsuarioId: fabriUser ? fabriUser.id : null
          };
          this.onNuevaVentaChange();
          this.displayNuevaVenta = true;
      }
  }

  anularVenta(ventaId: number) {
      if(confirm('¿Seguro que desea liberar este producto? (Significa que el usuario no recibió su producto). Se anula la venta, y el producto se habilita para otra venta, pero sus gastos asociados se mantienen incluso los de envío, porque aunque no haya recibido el envío lo pagamos nosotros.')) {
          this.api.eliminarVenta(ventaId).subscribe(() => {
              this.cargarDatos();
              this.toastManager.showSuccess('Éxito', 'Venta anulada correctamente');
          });
      }
  }

  abrirDetalle(producto: any) {
    // Si clickean la card, abrimos el menú (o si está disponible abrimos modal, depende de la lógica del template)
    // El template puede llamar a toggleMenu directamente o a abrirDetalle.
    // Si la idea es que el click en tarjeta muestre el menu (3 puntos):
    // El template pasará el click al menu.
  }

}
