import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimelineModule } from 'primeng/timeline';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { ApiService, Movimiento } from '../../core/services/api';

@Component({
  selector: 'app-movimientos',
  standalone: true,
  imports: [CommonModule, TimelineModule, InputTextModule, FormsModule],
  templateUrl: './movimientos.html',
  styles: [`
    :host ::ng-deep .p-timeline-event-content {
      padding-bottom: 2rem;
    }
  `]
})
export class Movimientos implements OnInit {
  movimientos: Movimiento[] = [];
  textoFiltro: string = '';
  filtroTipoActivo: string = 'Todos';
  
  categorias = [
    { label: 'Todos', value: 'Todos' },
    { label: 'Compras', value: 'Compra' },
    { label: 'Ventas', value: 'Venta' },
    { label: 'Gastos', value: 'Gasto' },
    { label: 'Comisiones', value: 'Comisión' },
    { label: 'Envíos', value: 'Envío' },
    { label: 'Ingresos', value: 'Ingreso' }
  ];

  constructor(private api: ApiService) {}

  ngOnInit() {
    import('rxjs').then(({ forkJoin }) => {
        forkJoin({
            movs: this.api.getMovimientos(),
            productos: this.api.getProductos(),
            usuarios: this.api.getUsuarios()
        }).subscribe(({ movs, productos, usuarios }) => {
            let movimientosList = movs.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
            
            this.movimientos = movimientosList.map(mov => {
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

  get movimientosFiltrados() {
    let filtrados = this.movimientos;
    
    if (this.filtroTipoActivo !== 'Todos') {
      if (this.filtroTipoActivo === 'Envío') {
        filtrados = filtrados.filter(m => m.descripcion.includes('ENV |'));
      } else if (this.filtroTipoActivo === 'Gasto') {
        filtrados = filtrados.filter(m => m.tipo === 'Salida de dinero' && !m.descripcion.includes('ENV |'));
      } else if (this.filtroTipoActivo === 'Compra') {
        filtrados = filtrados.filter(m => m.tipo === 'Compra' && !m.descripcion.includes('ENV |'));
      } else {
        filtrados = filtrados.filter(m => m.tipo === this.filtroTipoActivo);
      }
    }
    
    if (this.textoFiltro) {
      const text = this.textoFiltro.toLowerCase();
      filtrados = filtrados.filter(m => 
        m.descripcion.toLowerCase().includes(text) ||
        m.tipo.toLowerCase().includes(text)
      );
    }
    return filtrados;
  }

  setFiltro(tipo: string) {
    this.filtroTipoActivo = tipo;
  }

  getIconoPorMov(mov: Movimiento): string {
    if (mov.descripcion.includes('ENV |')) return 'pi-truck';
    
    switch(mov.tipo) {
      case 'Compra': return 'pi-shopping-cart';
      case 'Venta': return 'pi-dollar';
      case 'Ingreso': return 'pi-arrow-down-left';
      case 'Comisión': return 'pi-wallet';
      case 'Salida de dinero': return 'pi-arrow-up-right';
      case 'Cambio de Estado': return 'pi-sync';
      default: return 'pi-list';
    }
  }

  getColorPorMov(mov: Movimiento): { bg: string, text: string } {
    if (mov.descripcion.includes('ENV |')) return { bg: '#e0f2fe', text: '#0284c7' }; // Blue
    
    switch(mov.tipo) {
      case 'Compra': return { bg: '#e0e7ff', text: '#4f46e5' }; // Indigo
      case 'Venta': return { bg: '#dcfce7', text: '#16a34a' }; // Green
      case 'Ingreso': return { bg: '#dcfce7', text: '#16a34a' }; // Green
      case 'Comisión': return { bg: '#ffedd5', text: '#ea580c' }; // Orange
      case 'Salida de dinero': return { bg: '#fee2e2', text: '#dc2626' }; // Red
      case 'Cambio de Estado': return { bg: '#f3f4f6', text: '#4b5563' }; // Gray
      default: return { bg: '#f1f5f9', text: '#64748b' }; // Slate
    }
  }
}
