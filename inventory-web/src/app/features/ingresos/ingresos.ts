import { Component, OnInit, ViewChild, HostListener, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { ApiService, Ingreso, Usuario } from '../../core/services/api';
import { ToastManagerService } from '../../core/services/toast-manager.service';
import { Router, ActivatedRoute } from '@angular/router';
import { PaginatorModule } from 'primeng/paginator';

@Component({
  selector: 'app-ingresos',
  standalone: true,
  imports: [CommonModule, ButtonModule, DialogModule, FormsModule, InputTextModule, InputNumberModule, DatePickerModule, SelectModule, TooltipModule, MenuModule, PaginatorModule],
  templateUrl: './ingresos.html',
})
export class Ingresos implements OnInit, AfterViewInit {
  ingresos: Ingreso[] = [];
  usuarios: Usuario[] = [];
  displayDialog: boolean = false;
  ingreso: Ingreso = { motivo: '', fecha: new Date(), usuarioId: 0, monto: 0 };

  editando: boolean = false;
  submitted: boolean = false;
  guardando: boolean = false;

  textoFiltro: string = '';
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

  constructor(private api: ApiService, private toastManager: ToastManagerService, private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.textoFiltro = params['search'] || '';
    });
    this.cargarDatos();
  }

  onFilterChange() {
      this.first = 0;
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
        ingresos: this.api.getIngresos(),
        usuarios: this.api.getUsuarios()
      }).subscribe(({ ingresos, usuarios }) => {
        this.usuarios = usuarios;
        this.ingresos = ingresos.map(i => ({
          ...i,
          usuarioNombre: usuarios.find(u => u.id === i.usuarioId)?.nombre || 'Desconocido'
        })).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      });
    });
  }

  get ingresosFiltrados() {
    if (!this.textoFiltro) return this.ingresos;
    const text = this.textoFiltro.toLowerCase();
    return this.ingresos.filter(i => 
      i.motivo.toLowerCase().includes(text) ||
      (i.usuarioNombre && i.usuarioNombre.toLowerCase().includes(text))
    );
  }

  toggleMenu(event: any, ingreso: Ingreso, menu: any) {
    this.menuItems = [
      { label: 'Editar', icon: 'pi pi-pencil', command: () => this.editar(ingreso) },
      { label: 'Eliminar', icon: 'pi pi-trash', command: () => this.eliminar(ingreso.id!) }
    ];
    menu.toggle(event);
  }

  showDialog() {
    const savedUser = localStorage.getItem('usuarioActivoId');
    const defaultUsuarioId = savedUser ? parseInt(savedUser, 10) : 0;
    this.ingreso = { motivo: '', fecha: new Date(), usuarioId: defaultUsuarioId, monto: 0 };
    this.editando = false;
    this.submitted = false;
    this.displayDialog = true;
  }

  editar(ingreso: Ingreso) {
    this.ingreso = { ...ingreso, fecha: new Date(ingreso.fecha) };
    this.editando = true;
    this.submitted = false;
    this.displayDialog = true;
  }

  guardar() {
    this.submitted = true;
    if (this.guardando) return;
    if (!this.ingreso.motivo || !this.ingreso.usuarioId || !this.ingreso.monto || this.ingreso.monto <= 0) {
      return;
    }

    this.guardando = true;
    if (this.editando && this.ingreso.id) {
      this.api.editarIngreso(this.ingreso.id, this.ingreso).subscribe({
        next: () => {
          this.guardando = false;
          this.displayDialog = false;
          this.cargarDatos();
          this.toastManager.showSuccess('Éxito', `Se editó el ingreso: ${this.ingreso.motivo}`);
        },
        error: () => this.guardando = false
      });
    } else {
      this.api.crearIngreso(this.ingreso).subscribe({
        next: () => {
          this.guardando = false;
          this.displayDialog = false;
          this.cargarDatos();
          this.toastManager.showSuccess('Éxito', `Se registró el ingreso: ${this.ingreso.motivo}`);
        },
        error: () => this.guardando = false
      });
    }
  }

  eliminar(id: number) {
    if(confirm('¿Seguro que desea desactivar este ingreso?')) {
      this.api.eliminarIngreso(id).subscribe(() => {
        this.cargarDatos();
        this.toastManager.showSuccess('Éxito', `Se eliminó el ingreso con ID ${id}`);
      });
    }
  }
}
