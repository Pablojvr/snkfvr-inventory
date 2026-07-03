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
import { ApiService, Usuario } from './core/services/api';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastModule, TooltipModule, MenuModule, DialogModule, SelectModule, FormsModule, ButtonModule],
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

  constructor(private router: Router, private api: ApiService) {}

  ngOnInit() {
    this.mobileMenuOptions = [
      { label: 'Productos / Inventario', icon: 'pi pi-box', command: () => this.router.navigate(['/productos']) },
      { label: 'Venta Masiva', icon: 'pi pi-cart-plus', command: () => this.router.navigate(['/venta-masiva']) },
      { label: 'Añadir Masivo', icon: 'pi pi-plus-circle', command: () => this.router.navigate(['/anadir-masivo']) },
      { separator: true },
      { label: 'Usuarios', icon: 'pi pi-users', command: () => this.router.navigate(['/usuarios']) },
      { label: 'Bitácora', icon: 'pi pi-list', command: () => this.router.navigate(['/movimientos']) },
      { label: 'Ingresos', icon: 'pi pi-arrow-down-left', command: () => this.router.navigate(['/ingresos']) },
    ];

    const userId = localStorage.getItem('userId');
    if (!userId) {
      this.api.getUsuarios().subscribe(users => {
        this.usuarios = users;
        this.displayUserModal = true;
      });
    }
  }

  guardarUsuario() {
    if (this.selectedUserId) {
      localStorage.setItem('userId', this.selectedUserId.toString());
      this.displayUserModal = false;
    }
  }

  toggleSidebar() {
    this.sidebarVisible.update(v => !v);
  }

  closeSidebar() {
    this.sidebarVisible.set(false);
  }
}
