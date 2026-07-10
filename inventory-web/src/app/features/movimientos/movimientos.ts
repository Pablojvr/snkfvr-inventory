import { Component, OnInit, HostListener, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimelineModule } from 'primeng/timeline';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ApiService, Movimiento } from '../../core/services/api';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { PaginatorModule } from 'primeng/paginator';

@Component({
  selector: 'app-movimientos',
  standalone: true,
  imports: [CommonModule, TimelineModule, InputTextModule, FormsModule, DialogModule, PaginatorModule],
  templateUrl: './movimientos.html',
  styleUrls: ['./movimientos.css'],
  styles: [`
    :host ::ng-deep .p-timeline-event-content {
      padding-bottom: 2rem;
    }
  `]
})
export class Movimientos implements OnInit, AfterViewInit {
  movimientos: Movimiento[] = [];
  textoFiltro: string = '';
  filtroTipoActivo: string = 'Todos';
  
  displayDetalle: boolean = false;
  movimientoSeleccionado: Movimiento | null = null;
  
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
  
  categorias = [
    { label: 'Todos', value: 'Todos' },
    { label: 'Compras', value: 'Compra' },
    { label: 'Ventas', value: 'Venta' },
    { label: 'Gastos', value: 'Gasto' },
    { label: 'Comisiones', value: 'Comisión' },
    { label: 'Envíos', value: 'Envío' },
    { label: 'Ingresos', value: 'Ingreso' },
    { label: 'Reservas', value: 'Reserva' }
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

  getConteoFiltro(tipo: string): number {
    if (tipo === 'Todos') return this.movimientos.length;
    
    let filtrados = this.movimientos;
    if (tipo === 'Envío') {
        return filtrados.filter(m => m.descripcion.includes('ENV |')).length;
    } else if (tipo === 'Gasto') {
        return filtrados.filter(m => m.tipo === 'Salida de dinero' && !m.descripcion.includes('ENV |')).length;
    } else if (tipo === 'Compra') {
        return filtrados.filter(m => m.tipo === 'Compra' && !m.descripcion.includes('ENV |')).length;
    } else {
        return filtrados.filter(m => m.tipo === tipo).length;
    }
  }

  setFiltro(tipo: string | null) {
      this.filtroTipoActivo = tipo || 'Todos';
      this.first = 0;
  }

  getTiempoRelativo(fecha: Date | string): string {
    if (!fecha) return '';
    let dateObj = new Date(fecha);
    let diff = new Date().getTime() - dateObj.getTime();
    
    if (diff < -60000 && typeof fecha === 'string' && !fecha.endsWith('Z')) {
        const utcDate = new Date(fecha + 'Z');
        const utcDiff = new Date().getTime() - utcDate.getTime();
        if (utcDiff >= 0 || utcDiff > diff) {
            diff = utcDiff;
        }
    }
    
    if (diff < 0) diff = 0;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Hace un momento';
    if (minutes === 1) return 'Hace un minuto';
    if (minutes < 60) return `Hace ${minutes} minutos`;
    if (hours === 1) return 'Hace una hora';
    if (hours < 24) return `Hace ${hours} horas`;
    if (days === 1) return 'Hace un día';
    return `Hace ${days} días`;
  }

  formatearFecha(fecha: Date | string): string {
    if (!fecha) return '';
    const dateObj = new Date(fecha);
    const opcionesFecha: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const strFecha = dateObj.toLocaleDateString('es-ES', opcionesFecha);
    const strHora = dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    // Capitalizar primera letra
    const strFechaCap = strFecha.charAt(0).toUpperCase() + strFecha.slice(1);
    return `${strFechaCap} a las ${strHora}`;
  }

  abrirDetalle(mov: Movimiento) {
    this.movimientoSeleccionado = mov;
    this.displayDetalle = true;
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
      case 'Reserva': return 'pi-bookmark';
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
      case 'Reserva': return { bg: '#fef3c7', text: '#d97706' }; // Amber
      default: return { bg: '#f1f5f9', text: '#64748b' }; // Slate
    }
  }
}
