import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ApiService, Movimiento } from '../../core/services/api';

@Component({
  selector: 'app-movimientos',
  standalone: true,
  imports: [CommonModule, TableModule, InputTextModule],
  templateUrl: './movimientos.html',
})
export class Movimientos implements OnInit {
  movimientos: Movimiento[] = [];

  constructor(private api: ApiService) {}

  ngOnInit() {
    import('rxjs').then(({ forkJoin }) => {
        forkJoin({
            movs: this.api.getMovimientos(),
            productos: this.api.getProductos(),
            usuarios: this.api.getUsuarios()
        }).subscribe(({ movs, productos, usuarios }) => {
            let movimientos = movs.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
            
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
}
