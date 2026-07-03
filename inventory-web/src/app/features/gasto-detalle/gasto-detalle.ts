import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { ApiService, Gasto, Producto, Usuario } from '../../core/services/api';
import { ToastManagerService } from '../../core/services/toast-manager.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-gasto-detalle',
  standalone: true,
  imports: [CommonModule, ButtonModule, InputTextModule, InputNumberModule, DatePickerModule, SelectModule, FormsModule, MenuModule],
  templateUrl: './gasto-detalle.html'
})
export class GastoDetalle implements OnInit {
  gasto: Gasto | null = null;
  productoAsociado: Producto | null = null;
  usuarioNombre: string = '';
  usuarios: Usuario[] = [];
  
  editando: boolean = false;
  guardando: boolean = false;
  gastoFecha: Date | null = null;
  gastoFechaIngreso: Date | null = null;
  menuItems: MenuItem[] = [];

  tipoOpciones = [
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

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.cargarDatos(parseInt(id, 10));
      }
    });
  }

  cargarDatos(id: number) {
    import('rxjs').then(({ forkJoin }) => {
      forkJoin({
        gastos: this.api.getGastos(),
        usuarios: this.api.getUsuarios(),
        productos: this.api.getProductos()
      }).subscribe(({ gastos, usuarios, productos }) => {
        const found = gastos.find(g => g.id === id);
        if (!found) {
          this.toastManager.showError('Error', 'Gasto/Compra no encontrado');
          this.router.navigate(['/gastos']);
          return;
        }
        this.gasto = found;
        this.usuarios = usuarios;
        const u = usuarios.find(us => us.id === this.gasto!.usuarioId);
        this.usuarioNombre = u ? u.nombre : 'Desconocido';
        if (this.gasto!.productoId) {
          const p = productos.find(pr => pr.id === this.gasto!.productoId);
          this.productoAsociado = p || null;
        }
      });
    });
  }

  volver() {
    this.location.back();
  }

  habilitarEdicion() {
    this.editando = true;
    if (this.gasto) {
      this.gastoFecha = this.gasto.fecha ? new Date(this.gasto.fecha) : null;
      this.gastoFechaIngreso = this.gasto.fechaIngreso ? new Date(this.gasto.fechaIngreso) : null;
    }
  }

  cancelarEdicion() {
    this.editando = false;
    if (this.gasto && this.gasto.id) {
      this.cargarDatos(this.gasto.id);
    }
  }

  guardarEdicion() {
    if (!this.gasto || !this.gasto.motivo) return;
    this.guardando = true;
    const gastoToSave: any = {
      ...this.gasto,
      fecha: this.gastoFecha || this.gasto.fecha,
      fechaIngreso: this.gastoFechaIngreso || this.gasto.fechaIngreso
    };
    this.api.editarGasto(this.gasto.id!, gastoToSave).subscribe({
      next: () => {
        this.toastManager.showSuccess('Éxito', 'Gasto/Compra actualizado.');
        this.editando = false;
        this.guardando = false;
        this.cargarDatos(this.gasto!.id!);
      },
      error: () => {
        this.toastManager.showError('Error', 'No se pudo actualizar.');
        this.guardando = false;
      }
    });
  }

  irAProducto() {
    if (this.productoAsociado) {
      this.router.navigate(['/productos', this.productoAsociado.id]);
    }
  }

  toggleMenu(event: Event, menu: any) {
    event.stopPropagation();
    this.menuItems = [];
    if (this.gasto?.tipo === 'Calzado' && this.productoAsociado) {
       this.menuItems.push({ label: 'Ir al Producto', icon: 'pi pi-arrow-right', command: () => this.irAProducto() });
    }
    if (this.gasto?.activo) {
       this.menuItems.push({ label: 'Desactivar Gasto', icon: 'pi pi-trash', command: () => this.desactivarGasto() });
    }
    menu.toggle(event);
  }

  desactivarGasto() {
    if (!this.gasto) return;
    if (confirm('¿Seguro que desea desactivar este gasto/compra?')) {
      this.api.eliminarGasto(this.gasto.id!).subscribe(() => {
        this.toastManager.showSuccess('Éxito', 'Gasto/Compra desactivado.');
        this.cargarDatos(this.gasto!.id!);
      });
    }
  }
}
