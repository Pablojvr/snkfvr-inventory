import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastModule, TooltipModule, MenuModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('inventory-web');
  sidebarVisible = signal(false);
  mobileMenuOptions: MenuItem[] = [];

  constructor(private router: Router) {}

  ngOnInit() {
    this.mobileMenuOptions = [
      { label: 'Añadir Masivo', icon: 'pi pi-plus-circle', command: () => this.router.navigate(['/anadir-masivo']) },
      { label: 'Venta Masiva', icon: 'pi pi-cart-plus', command: () => this.router.navigate(['/venta-masiva']) },
      { separator: true },
      { label: 'Usuarios', icon: 'pi pi-users', command: () => this.router.navigate(['/usuarios']) },
      { label: 'Bitácora', icon: 'pi pi-list', command: () => this.router.navigate(['/movimientos']) },
      { label: 'Ingresos', icon: 'pi pi-arrow-down-left', command: () => this.router.navigate(['/ingresos']) },
    ];
  }

  toggleSidebar() {
    this.sidebarVisible.update(v => !v);
  }

  closeSidebar() {
    this.sidebarVisible.set(false);
  }
}
