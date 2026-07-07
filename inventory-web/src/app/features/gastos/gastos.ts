import { Component, OnInit, ViewChild, HostListener, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ApiService, Gasto, Producto, Usuario } from '../../core/services/api';
import { ToastManagerService } from '../../core/services/toast-manager.service';
import { Router } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { DialogGastoComponent } from '../../shared/components/dialog-gasto/dialog-gasto.component';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PaginatorModule } from 'primeng/paginator';

@Component({
  selector: 'app-gastos',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, InputTextModule, SelectModule, TooltipModule, FormsModule, MenuModule, DialogGastoComponent, PaginatorModule],
  templateUrl: './gastos.html',
})
export class Gastos implements OnInit, AfterViewInit {
  gastos: Gasto[] = [];
  productos: Producto[] = [];
  usuarios: Usuario[] = [];

  textoFiltro: string = '';
  tipoFiltro: string | null = null;
  opcionesFiltro: any[] = [
    { label: 'Seleccionar todo', value: null },
    { label: 'Calzado', value: 'Calzado' }
  ];
  
  menuItems: MenuItem[] = [];

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

  @ViewChild(DialogGastoComponent) dialogGasto!: DialogGastoComponent;


  constructor(private api: ApiService, private toastManager: ToastManagerService, private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
        this.textoFiltro = params['search'] || '';
        this.tipoFiltro = params['tipo'] || null;
    });
    this.cargarDatos();
  }

  onFilterChange() {
      this.first = 0;
      this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {
              search: this.textoFiltro || null,
              tipo: this.tipoFiltro || null
          },
          queryParamsHandling: 'merge'
      });
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
        })).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      });
    });
  }

  showDialog() {
    this.dialogGasto.showDialog();
  }

  toggleMenu(event: any, gasto: Gasto, menu: any) {
    this.menuItems = [
      { label: 'Ver Detalle Compra', icon: 'pi pi-eye', command: () => this.router.navigate(['/gastos', gasto.id]) },
      { label: 'Eliminar Compra', icon: 'pi pi-trash', command: () => this.eliminar(gasto.id!) }
    ];
    menu.toggle(event);
  }

  editar(gasto: Gasto) {
    this.dialogGasto.showDialog(undefined, undefined, gasto);
  }

  agregarComision(productoId: number) {
    this.dialogGasto.showDialog(productoId, 3);
  }

  agregarEnvio(productoId: number) {
    this.dialogGasto.showDialog(productoId, 2);
  }

  venderProducto(productoId: number) {
    this.router.navigate(['/venta-masiva'], { queryParams: { productoId: productoId } });
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
    let filtrados = this.gastos;
    if (this.tipoFiltro) {
        filtrados = filtrados.filter(g => g.tipoGastoNombre === this.tipoFiltro);
    }
    if (this.textoFiltro) {
        const text = this.textoFiltro.toLowerCase();
        filtrados = filtrados.filter(g => 
          g.motivo.toLowerCase().includes(text) || 
          (g.productoDescripcion && g.productoDescripcion.toLowerCase().includes(text))
        );
    }
    return filtrados;
  }
}
