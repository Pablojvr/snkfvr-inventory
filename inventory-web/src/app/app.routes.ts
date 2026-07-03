import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard) },
  { path: 'estadisticas', loadComponent: () => import('./features/estadisticas/estadisticas').then(m => m.Estadisticas) },
  { path: 'anadir-masivo', loadComponent: () => import('./features/anadir-masivo/anadir-masivo').then(m => m.AnadirMasivoComponent) },
  { path: 'productos', loadComponent: () => import('./features/productos/productos').then(m => m.Productos) },
  { path: 'productos/:id', loadComponent: () => import('./features/producto-detalle/producto-detalle').then(m => m.ProductoDetalle) },
  { path: 'ingresos', loadComponent: () => import('./features/ingresos/ingresos').then(m => m.Ingresos) },
  { path: 'gastos', loadComponent: () => import('./features/gastos/gastos').then(m => m.Gastos) },
  { path: 'gastos/:id', loadComponent: () => import('./features/gasto-detalle/gasto-detalle').then(m => m.GastoDetalle) },
  { path: 'ventas', loadComponent: () => import('./features/ventas/ventas').then(m => m.Ventas) },
  { path: 'venta-masiva', loadComponent: () => import('./features/venta-masiva/venta-masiva').then(m => m.VentaMasivaComponent) },
  { path: 'movimientos', loadComponent: () => import('./features/movimientos/movimientos').then(m => m.Movimientos) },
  { path: 'usuarios', loadComponent: () => import('./features/usuarios/usuarios').then(m => m.Usuarios) },
  { path: 'tipos-gasto', loadComponent: () => import('./features/tipos-gasto/tipos-gasto').then(m => m.TiposGastoComponent) },
];
