import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { ApiService, Usuario } from './core/services/api';
import { ToastManagerService } from './core/services/toast-manager.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ToastModule, TooltipModule, MenuModule, DialogModule, SelectModule, FormsModule, ButtonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('inventory-web');
  sidebarVisible = signal(false);
  mobileMenuOptions: MenuItem[] = [];
  
  displayUserModal = false;
  usuarios: Usuario[] = [];
  selectedUserId: number | null = null;

  userMenuOptions: MenuItem[] = [];
  displayResumenPreview = false;
  cargandoPreview = false;
  resumenPreviewText = '';
  enviandoResumen = false;

  constructor(private router: Router, private api: ApiService, private toastManager: ToastManagerService) {}

  ngOnInit() {
    this.mobileMenuOptions = [
      { label: 'Venta Masiva', icon: 'pi pi-cart-plus', command: () => this.router.navigate(['/venta-masiva']) },
      { label: 'Compra Masiva', icon: 'pi pi-plus-circle', command: () => this.router.navigate(['/anadir-masivo']) },
      { label: 'Ingresos', icon: 'pi pi-arrow-down-left', command: () => this.router.navigate(['/ingresos']) },
      { label: 'Movimientos', icon: 'pi pi-list', command: () => this.router.navigate(['/movimientos']) }
    ];

    this.userMenuOptions = [
      { 
        label: 'Enviar Resumen a WhatsApp', 
        icon: 'pi pi-whatsapp', 
        command: () => this.abrirPreviewResumen() 
      },
      { 
        label: 'Cambiar Usuario', 
        icon: 'pi pi-users', 
        command: () => this.displayUserModal = true 
      }
    ];

    const userId = localStorage.getItem('userId');
    this.api.getUsuarios().subscribe(users => {
      this.usuarios = users;
      if (!userId) {
        this.displayUserModal = true;
      } else {
        this.selectedUserId = parseInt(userId, 10);
      }
    });
  }

  guardarUsuario() {
    if (this.selectedUserId) {
      localStorage.setItem('userId', this.selectedUserId.toString());
      this.displayUserModal = false;
    }
  }

  getSelectedUserName(): string {
      if (!this.selectedUserId) return 'Usuario';
      const u = this.usuarios.find(x => x.id === this.selectedUserId);
      return u ? u.nombre : 'Usuario';
  }

  getSelectedUserInitial(): string {
      const name = this.getSelectedUserName();
      return name.charAt(0).toUpperCase();
  }

  toggleSidebar() {
    this.sidebarVisible.update(v => !v);
  }

  closeSidebar() {
    this.sidebarVisible.set(false);
  }

  abrirPreviewResumen() {
    this.displayResumenPreview = true;
    this.cargandoPreview = true;
    this.resumenPreviewText = '';

    this.api.getPreviewMasivo().subscribe({
      next: (res: any) => {
        this.resumenPreviewText = res.msg;
        this.cargandoPreview = false;
      },
      error: (err: any) => {
        console.error('Error previsualizando resumen masivo', err);
        this.toastManager.showError('Error', 'No se pudo cargar la previsualización.');
        this.cargandoPreview = false;
        this.displayResumenPreview = false;
      }
    });
  }

  confirmarEnvioResumen() {
    this.enviandoResumen = true;
    this.api.enviarRecordatorioMasivo().subscribe({
      next: (res: any) => {
        if (res.enviado === false) {
          this.toastManager.showError('Error de Envío', 'El bot local de WhatsApp está dormido o desconectado.');
        } else {
          this.toastManager.showSuccess('WhatsApp Enviado', 'Se ha enviado el resumen diario a tu WhatsApp.');
          this.displayResumenPreview = false;
        }
        this.enviandoResumen = false;
      },
      error: (err: any) => {
        console.error('Error enviando recordatorio masivo', err);
        this.toastManager.showError('Error', 'No se pudo enviar el reporte de WhatsApp.');
        this.enviandoResumen = false;
      }
    });
  }
}
