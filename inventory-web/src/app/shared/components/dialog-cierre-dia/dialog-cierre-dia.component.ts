import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ApiService, Venta } from '../../../core/services/api';
import { ToastManagerService } from '../../../core/services/toast-manager.service';

@Component({
  selector: 'app-dialog-cierre-dia',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule],
  templateUrl: './dialog-cierre-dia.component.html',
  styleUrls: ['./dialog-cierre-dia.component.css']
})
export class DialogCierreDiaComponent {
  @Input() visible = false;
  @Input() ventas: Venta[] = [];
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() onUpdate = new EventEmitter<void>();

  processingIds = new Set<number>();

  constructor(
    private apiService: ApiService,
    private toast: ToastManagerService
  ) {}

  cerrar() {
    this.visible = false;
    this.visibleChange.emit(this.visible);
  }

  isProcessing(id: number | undefined): boolean {
    return id ? this.processingIds.has(id) : false;
  }

  marcarEntregado(venta: Venta) {
    if (!venta.id) return;
    this.processingIds.add(venta.id);

    const updatedVenta = { ...venta, estado: 'Vendido' };

    this.apiService.editarVenta(venta.id, updatedVenta).subscribe({
      next: () => {
        this.toast.showSuccess('Entrega completada', `${venta.productoDescripcion} marcado como entregado.`);
        this.removeFromList(venta.id!);
      },
      error: (e) => {
        this.toast.showError('Error', 'No se pudo marcar como entregado.');
        this.processingIds.delete(venta.id!);
      }
    });
  }

  reprogramar(venta: Venta) {
    if (!venta.id || !venta.fechaEntrega) return;
    this.processingIds.add(venta.id);

    const fecha = new Date(venta.fechaEntrega);
    fecha.setDate(fecha.getDate() + 1);

    const updatedVenta = { ...venta, fechaEntrega: fecha.toISOString() };

    this.apiService.editarVenta(venta.id, updatedVenta).subscribe({
      next: () => {
        this.toast.showInfo('Entrega reprogramada', `Se movió la entrega al día siguiente.`);
        this.removeFromList(venta.id!);
      },
      error: (e) => {
        this.toast.showError('Error', 'No se pudo reprogramar la entrega.');
        this.processingIds.delete(venta.id!);
      }
    });
  }

  anularVenta(venta: Venta) {
    if (!venta.id) return;
    this.processingIds.add(venta.id);

    this.apiService.eliminarVenta(venta.id, 0).subscribe({
      next: () => {
        this.toast.showWarn('Venta anulada', `El producto vuelve a estar disponible.`);
        this.removeFromList(venta.id!);
      },
      error: (e) => {
        this.toast.showError('Error', 'No se pudo anular la venta.');
        this.processingIds.delete(venta.id!);
      }
    });
  }

  private removeFromList(id: number) {
    this.processingIds.delete(id);
    this.ventas = this.ventas.filter(v => v.id !== id);
    this.onUpdate.emit();
    
    if (this.ventas.length === 0) {
      setTimeout(() => this.cerrar(), 1500);
    }
  }
}
