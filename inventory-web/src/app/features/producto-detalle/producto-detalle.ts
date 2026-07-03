import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TimelineModule } from 'primeng/timeline';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { Tabs } from 'primeng/tabs';
import { TabList } from 'primeng/tabs';
import { Tab } from 'primeng/tabs';
import { TabPanels } from 'primeng/tabs';
import { TabPanel } from 'primeng/tabs';
import { MenuModule } from 'primeng/menu';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { MenuItem } from 'primeng/api';
import { ApiService, Producto, Movimiento, Gasto, Usuario } from '../../core/services/api';
import { ToastManagerService } from '../../core/services/toast-manager.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-producto-detalle',
  standalone: true,
  imports: [
    CommonModule, ButtonModule, TimelineModule, CardModule, TooltipModule, 
    Tabs, TabList, Tab, TabPanels, TabPanel, MenuModule, FormsModule, 
    InputTextModule, InputNumberModule, DatePickerModule, DialogModule, SelectModule
  ],
  templateUrl: './producto-detalle.html',
  styles: [`
    .detail-card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .header-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
    .header-actions { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-top: 1.5rem; }
    .info-item { display: flex; flex-direction: column; gap: 0.5rem; }
    .info-label { font-size: 0.875rem; color: #64748b; font-weight: 500; }
    .info-value { font-size: 1.125rem; font-weight: 600; color: #1e293b; }
    .status-badge { padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 600; display: inline-block; }
    .status-disponible { background-color: #dcfce7; color: #166534; }
    .status-reservado { background-color: #fef9c3; color: #854d0e; }
    .status-vendido { background-color: #f3f4f6; color: #374151; }
    .gasto-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
    .gasto-card-inactive { opacity: 0.5; }
    .gasto-info { display: flex; flex-direction: column; gap: 0.25rem; flex: 1; }
    .gasto-motivo { font-weight: 600; font-size: 0.95rem; color: #1e293b; }
    .gasto-meta { font-size: 0.8rem; color: #64748b; display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .gasto-monto { font-weight: 700; font-size: 1.1rem; color: #ef4444; white-space: nowrap; }
    .gastos-grid { display: flex; flex-direction: column; gap: 0.75rem; }
  `]
})
export class ProductoDetalle implements OnInit {
  productoId: number = 0;
  producto: Producto | null = null;
  movimientos: Movimiento[] = [];
  gastosProducto: (Gasto & { usuarioNombre?: string })[] = [];
  usuarios: Usuario[] = [];
  costoCalculado: number = 0;
  
  menuItems: MenuItem[] = [];
  activeTab: string = '0';

  // Gasto edit modal
  displayEditGasto: boolean = false;
  gastoEditando: Gasto | null = null;
  gastoEditFecha: Date | null = null;
  guardandoGasto: boolean = false;
  tipoGastoOpciones = [
    { label: 'Calzado', value: 'Calzado' },
    { label: 'Envío', value: 'Envío' },
    { label: 'Comisión', value: 'Comisión' },
    { label: 'Servicio', value: 'Servicio' },
    { label: 'Otro', value: 'Otro' }
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
            this.usuarios = usuarios;
            this.movimientos = movimientos.map(mov => {
                let desc = mov.descripcion;
                desc = desc.replace(/usuario con ID (\d+)/g, (match: string, p1: string) => {
                    const u = usuarios.find(x => x.id === parseInt(p1, 10));
                    return u ? u.nombre : match;
                });
                desc = desc.replace(/producto (\d+)/g, (match: string, p1: string) => {
                    const p = productos.find(x => x.id === parseInt(p1, 10));
                    return p ? `producto ${p.descripcion}` : match;
                });
                return { ...mov, descripcion: desc };
            });

            // All gastos associated with this product
            this.gastosProducto = gastos
                .filter(g => g.productoId === this.productoId)
                .map(g => ({
                    ...g,
                    usuarioNombre: usuarios.find(u => u.id === g.usuarioId)?.nombre || 'Desconocido'
                }));
            
            const gastosActivos = this.gastosProducto.filter(g => g.activo);
            this.costoCalculado = gastosActivos.reduce((acc, curr) => acc + (curr.monto || 0), 0);
        });
    });
  }

  toggleMenu(event: any, menu: any) {
      this.menuItems = [
          { label: 'Eliminar Producto', icon: 'pi pi-trash', command: () => this.eliminarProducto() }
      ];
      menu.toggle(event);
  }

  eliminarProducto() {
    if (confirm('¿Seguro que desea eliminar este producto? Esto desactivará el producto y sus gastos asociados.')) {
      this.api.eliminarProducto(this.productoId).subscribe({
        next: () => {
          this.toastManager.showSuccess('Éxito', 'Producto eliminado.');
          this.router.navigate(['/productos']);
        },
        error: () => this.toastManager.showError('Error', 'No se pudo eliminar.')
      });
    }
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

  // --- Gasto Edit Modal ---
  abrirEditarGasto(gasto: Gasto) {
    this.gastoEditando = { ...gasto };
    this.gastoEditFecha = gasto.fecha ? new Date(gasto.fecha) : null;
    this.displayEditGasto = true;
  }

  guardarGasto() {
    if (!this.gastoEditando) return;
    this.guardandoGasto = true;
    const toSave: any = {
      ...this.gastoEditando,
      fecha: this.gastoEditFecha || this.gastoEditando.fecha
    };
    // Clean up computed fields
    delete toSave.usuarioNombre;
    delete toSave.productoDescripcion;

    this.api.editarGasto(this.gastoEditando.id!, toSave).subscribe({
      next: () => {
        this.toastManager.showSuccess('Éxito', 'Gasto actualizado.');
        this.displayEditGasto = false;
        this.guardandoGasto = false;
        this.cargarDatos();
      },
      error: () => {
        this.toastManager.showError('Error', 'No se pudo actualizar el gasto.');
        this.guardandoGasto = false;
      }
    });
  }

  desactivarGasto(gasto: Gasto) {
    if (confirm('¿Seguro que desea desactivar este gasto? Esto afectará el costo calculado del producto.')) {
      this.api.eliminarGasto(gasto.id!).subscribe(() => {
        this.toastManager.showSuccess('Éxito', 'Gasto desactivado.');
        this.cargarDatos();
      });
    }
  }
}
