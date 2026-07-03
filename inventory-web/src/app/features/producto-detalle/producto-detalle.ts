import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TimelineModule } from 'primeng/timeline';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { MenuModule } from 'primeng/menu';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { MenuItem } from 'primeng/api';
import { ApiService, Producto, Movimiento } from '../../core/services/api';
import { ToastManagerService } from '../../core/services/toast-manager.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-producto-detalle',
  standalone: true,
  imports: [
    CommonModule, ButtonModule, TimelineModule, CardModule, TooltipModule, 
    TableModule, SelectModule, MenuModule, FormsModule, 
    InputTextModule, InputNumberModule, DatePickerModule
  ],
  templateUrl: './producto-detalle.html',
  styles: [`
    .detail-card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .header-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
    .header-actions { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; }
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-top: 1.5rem; }
    .info-item { display: flex; flex-direction: column; gap: 0.5rem; }
    .info-label { font-size: 0.875rem; color: #64748b; font-weight: 500; }
    .info-value { font-size: 1.125rem; font-weight: 600; color: #1e293b; }
    .status-badge { padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 600; display: inline-block; }
    .status-disponible { background-color: #dcfce7; color: #166534; }
    .status-reservado { background-color: #fef9c3; color: #854d0e; }
    .status-vendido { background-color: #f3f4f6; color: #374151; }
  `]
})
export class ProductoDetalle implements OnInit {
  productoId: number = 0;
  producto: Producto | null = null;
  movimientos: Movimiento[] = [];
  comisiones: any[] = [];
  costoCalculado: number = 0;
  
  editando: boolean = false;
  guardando: boolean = false;
  menuItems: MenuItem[] = [];

  vistaBitacora: string = 'historial';
  opcionesVistaBitacora: any[] = [
    { label: 'Historial de Cambios', value: 'historial' },
    { label: 'Solo Comisiones', value: 'comisiones' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private toastManager: ToastManagerService,
    private location: Location
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.productoId = +params['id'];
      this.cargarDatos();
    });
  }

  cargarDatos() {
    import('rxjs').then(({ forkJoin }) => {
        forkJoin({
            productos: this.api.getProductos(),
            usuarios: this.api.getUsuarios(),
            gastos: this.api.getGastos(),
            movimientos: this.api.getMovimientosPorProducto(this.productoId)
        }).subscribe(({ productos, usuarios, gastos, movimientos }) => {
            this.producto = productos.find(p => p.id === this.productoId) || null;
            if (!this.producto) {
                this.router.navigate(['/productos']);
                return;
            }
            this.movimientos = movimientos.map(mov => {
                let desc = mov.descripcion;
                desc = desc.replace(/usuario con ID (\d+)/g, (match, p1) => {
                    const u = usuarios.find(x => x.id === parseInt(p1, 10));
                    return u ? u.nombre : match;
                });
                desc = desc.replace(/producto (\d+)/g, (match, p1) => {
                    const p = productos.find(x => x.id === parseInt(p1, 10));
                    return p ? `<a href="/productos/${p.id}" style="color: #3b82f6; text-decoration: none; font-weight: 600; cursor: pointer;">producto ${p.descripcion}</a>` : match;
                });
                return { ...mov, descripcion: desc };
            });

            this.comisiones = gastos
                .filter(g => g.productoId === this.productoId && g.tipo === 'Comisión')
                .map(g => ({
                    ...g,
                    usuarioNombre: usuarios.find(u => u.id === g.usuarioId)?.nombre || 'Desconocido'
                }));
            
            const gastosProd = gastos.filter(g => g.productoId === this.productoId && g.activo && g.tipo !== 'Calzado');
            const totalGastos = gastosProd.reduce((acc, curr) => acc + curr.monto, 0);
            this.costoCalculado = (this.producto.costo || 0) + totalGastos;
        });
    });
  }

  toggleMenu(event: any, menu: any) {
      this.menuItems = [
          { label: 'Editar', icon: 'pi pi-pencil', command: () => this.habilitarEdicion() }
      ];
      menu.toggle(event);
  }

  habilitarEdicion() {
      this.editando = true;
      if (this.producto) {
          // ensure Date object
          this.producto.fechaCompra = new Date(this.producto.fechaCompra);
      }
  }

  cancelarEdicion() {
      this.editando = false;
      this.cargarDatos(); // revert changes
  }

  guardarEdicion() {
      if (!this.producto || !this.producto.descripcion || !this.producto.costo) return;
      this.guardando = true;
      this.api.editarProducto(this.producto.id!, this.producto).subscribe({
          next: () => {
              this.toastManager.showSuccess('Éxito', 'Producto actualizado.');
              this.editando = false;
              this.guardando = false;
              this.cargarDatos();
          },
          error: () => {
              this.toastManager.showError('Error', 'No se pudo actualizar.');
              this.guardando = false;
          }
      });
  }

  venderProducto() {
    this.router.navigate(['/venta-masiva'], { queryParams: { productoId: this.productoId } });
  }

  volver() {
    this.location.back();
  }

  getStatusClass(estado: string | undefined): string {
      if (!estado) return 'status-disponible';
      switch(estado.toLowerCase()) {
          case 'disponible': return 'status-disponible';
          case 'reservado': return 'status-reservado';
          case 'vendido': return 'status-vendido';
          default: return 'status-disponible';
      }
  }
}
