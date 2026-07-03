import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { ApiService, TipoGasto } from '../../core/services/api';
import { ToastManagerService } from '../../core/services/toast-manager.service';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

@Component({
  selector: 'app-tipos-gasto',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, InputTextModule, FormsModule, DialogModule, MessageModule, TagModule, ConfirmDialogModule],
  templateUrl: './tipos-gasto.html',
  providers: [ConfirmationService]
})
export class TiposGastoComponent implements OnInit {
  tipos: TipoGasto[] = [];
  loading: boolean = true;
  
  displayDialog: boolean = false;
  tipoActual: TipoGasto = { nombre: '' };
  editando: boolean = false;
  guardando: boolean = false;
  submitted: boolean = false;

  constructor(private api: ApiService, private toastManager: ToastManagerService, private confirmationService: ConfirmationService) {}

  ngOnInit() {
    this.cargarTipos();
  }

  cargarTipos() {
    this.loading = true;
    this.api.getTiposGasto().subscribe({
      next: (data) => {
        this.tipos = data;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  showDialog() {
    this.tipoActual = { nombre: '' };
    this.editando = false;
    this.submitted = false;
    this.displayDialog = true;
  }

  editar(tipo: TipoGasto) {
    this.tipoActual = { ...tipo };
    this.editando = true;
    this.submitted = false;
    this.displayDialog = true;
  }

  guardar() {
    this.submitted = true;
    if (!this.tipoActual.nombre) return;
    
    this.guardando = true;
    
    if (this.editando && this.tipoActual.id) {
      this.api.editarTipoGasto(this.tipoActual.id, this.tipoActual).subscribe({
        next: () => {
          this.guardando = false;
          this.displayDialog = false;
          this.toastManager.showSuccess('Éxito', 'Tipo modificado correctamente.');
          this.cargarTipos();
        },
        error: () => this.guardando = false
      });
    } else {
      this.api.crearTipoGasto(this.tipoActual).subscribe({
        next: () => {
          this.guardando = false;
          this.displayDialog = false;
          this.toastManager.showSuccess('Éxito', 'Tipo creado correctamente.');
          this.cargarTipos();
        },
        error: () => this.guardando = false
      });
    }
  }

  eliminar(id: number, esSistema: boolean | undefined) {
    if (esSistema) {
        this.toastManager.showError('Error', 'No se puede eliminar un tipo de sistema.');
        return;
    }
    
    this.confirmationService.confirm({
      message: '¿Está seguro que desea desactivar este tipo? Los gastos asociados mantendrán este tipo, pero ya no aparecerá en el selector para nuevos registros.',
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, Desactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.api.eliminarTipoGasto(id).subscribe({
          next: () => {
            this.toastManager.showSuccess('Éxito', 'Tipo desactivado correctamente.');
            this.cargarTipos();
          }
        });
      }
    });
  }
}
