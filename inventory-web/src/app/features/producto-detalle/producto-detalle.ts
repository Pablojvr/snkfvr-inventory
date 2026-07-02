import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TimelineModule } from 'primeng/timeline';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { ApiService, Producto, Movimiento } from '../../core/services/api';
import { DialogGastoComponent } from '../../shared/components/dialog-gasto/dialog-gasto.component';
import { DialogVentaComponent } from '../../shared/components/dialog-venta/dialog-venta.component';

@Component({
  selector: 'app-producto-detalle',
  standalone: true,
  imports: [CommonModule, ButtonModule, TimelineModule, CardModule, TooltipModule, DialogGastoComponent, DialogVentaComponent],
  templateUrl: './producto-detalle.html',
  styles: [`
    .detail-card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .header-actions { display: flex; gap: 1rem; align-items: center; }
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

  @ViewChild(DialogGastoComponent) dialogGasto!: DialogGastoComponent;
  @ViewChild(DialogVentaComponent) dialogVenta!: DialogVentaComponent;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService
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
            movimientos: this.api.getMovimientosPorProducto(this.productoId)
        }).subscribe(({ productos, usuarios, movimientos }) => {
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
        });
    });
  }

  generarGasto() {
    this.dialogGasto.showDialog(this.productoId);
  }
  
  agregarComision() {
    this.dialogGasto.showDialog(this.productoId, 'Comisión');
  }

  venderProducto() {
    this.dialogVenta.showDialog(this.productoId);
  }

  volver() {
    this.router.navigate(['/dashboard']);
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
