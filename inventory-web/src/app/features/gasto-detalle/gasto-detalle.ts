import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ApiService, Gasto, Producto, Usuario } from '../../core/services/api';
import { ToastManagerService } from '../../core/services/toast-manager.service';
import { DialogGastoComponent } from '../../shared/components/dialog-gasto/dialog-gasto.component';
import { Location } from '@angular/common';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-gasto-detalle',
  standalone: true,
  imports: [CommonModule, ButtonModule, DialogGastoComponent, MenuModule],
  templateUrl: './gasto-detalle.html'
})
export class GastoDetalle implements OnInit {
  gasto: Gasto | null = null;
  productoAsociado: Producto | null = null;
  usuarioNombre: string = '';
  
  menuItems: MenuItem[] = [];

  @ViewChild(DialogGastoComponent) dialogGasto!: DialogGastoComponent;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private toastManager: ToastManagerService,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.cargarDatos(parseInt(id, 10));
      }
    });
  }

  cargarDatos(id: number) {
    this.api.getGastos().subscribe(gastos => {
        const found = gastos.find(g => g.id === id);
        if (found) {
            this.gasto = found;
            this.api.getUsuarios().subscribe(usuarios => {
                const u = usuarios.find(us => us.id === this.gasto!.usuarioId);
                this.usuarioNombre = u ? u.nombre : 'Desconocido';
            });
            if (this.gasto.productoId) {
                this.api.getProductos().subscribe(productos => {
                    const p = productos.find(pr => pr.id === this.gasto!.productoId);
                    this.productoAsociado = p || null;
                });
            }
        } else {
            this.toastManager.showError('Error', 'Gasto/Compra no encontrado');
            this.router.navigate(['/gastos']);
        }
    });
  }

  volver() {
    this.location.back();
  }

  editar() {
    if (this.gasto) {
      this.dialogGasto.showDialog(undefined, undefined, this.gasto);
    }
  }

  onSaved() {
    if (this.gasto && this.gasto.id) {
      this.cargarDatos(this.gasto.id);
    }
  }

  toggleMenu(event: Event, menu: any) {
    event.stopPropagation();
    this.menuItems = [
      { label: 'Editar Compra/Gasto', icon: 'pi pi-pencil', command: () => this.editar() }
    ];
    if (this.gasto?.tipo === 'Calzado' && this.productoAsociado) {
       this.menuItems.push({ label: 'Ir al Producto', icon: 'pi pi-arrow-right', command: () => this.router.navigate(['/productos', this.productoAsociado!.id]) });
    }
    menu.toggle(event);
  }
}
