import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TimelineModule } from 'primeng/timeline';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { ApiService, Venta, Producto, Usuario } from '../../core/services/api';
import { DialogVentaComponent } from '../../shared/components/dialog-venta/dialog-venta.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, TimelineModule, SelectModule, FormsModule, DialogVentaComponent],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  
  ventasReservadas: any[] = [];
  movimientos: any[] = [];
  
  productosParaBuscador: Producto[] = [];
  productosFiltrados: Producto[] = [];
  productoBuscado: any;

  @ViewChild(DialogVentaComponent) dialogVenta!: DialogVentaComponent;
  
  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.cargarDatos();
  }
  
  cargarDatos() {

    import('rxjs').then(({ forkJoin }) => {
        forkJoin({
          ventas: this.api.getVentas(),
          productos: this.api.getProductos(),
          usuarios: this.api.getUsuarios(),
          movimientos: this.api.getMovimientos()
        }).subscribe(({ ventas, productos, usuarios, movimientos }) => {
          this.productosParaBuscador = productos;
          
          this.ventasReservadas = ventas
            .filter(v => v.estado === 'Reservado')
            .map(v => ({
              ...v,
              productoDescripcion: productos.find(p => p.id === v.productoId)?.descripcion || 'Desconocido',
              usuarioNombre: usuarios.find(u => u.id === v.usuarioId)?.nombre || 'Desconocido'
            }));
            
          this.movimientos = movimientos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 10).map(mov => {
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

  filtrarProductos(event: any) {
    let query = event.query;
    this.productosFiltrados = this.productosParaBuscador.filter(p => p.descripcion.toLowerCase().includes(query.toLowerCase()));
  }

  onProductoSeleccionado(event: any) {
    if (event.value && event.value.id) {
        this.router.navigate(['/productos', event.value.id]);
    }
  }

  nuevaVentaRapida() {
      this.dialogVenta.showDialog();
  }

  nuevoGastoRapido() {
    this.router.navigate(['/anadir-masivo']);
  }
}
