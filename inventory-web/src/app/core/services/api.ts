import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Producto {
  id?: number;
  descripcion: string;
  fechaCompra: string | Date;
  costo: number;
  estado?: string;
  activo?: boolean;
}

export interface Usuario {
  id?: number;
  nombre: string;
  activo?: boolean;
}

export interface Ingreso {
  id?: number;
  motivo: string;
  monto: number;
  fecha: string | Date;
  usuarioId: number;
  activo?: boolean;
}

export interface Gasto {
  id?: number;
  motivo: string;
  fecha: string | Date;
  fechaIngreso?: string | Date;
  usuarioId: number;
  monto: number;
  productoId?: number;
  productoDescripcion?: string;
  tipo?: string;
  activo?: boolean;
}

export interface Venta {
  id?: number;
  productoId: number;
  costoEnvio: number;
  costosAdicionales: number;
  fechaVenta?: string | Date;
  precioVenta: number;
  usuarioId: number;
  fechaRegistro?: string | Date;
  estado?: string;
  activo?: boolean;
}

export interface Movimiento {
  id?: number;
  tipo: string;
  fecha: string | Date;
  descripcion: string;
  montoTotal: number;
  referenciaId?: number;
  activo?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // --- Usuarios ---
  getUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.apiUrl}/usuarios`);
  }
  crearUsuario(usuario: Usuario): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.apiUrl}/usuarios`, usuario);
  }
  editarUsuario(id: number, usuario: Usuario): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/usuarios/${id}`, usuario);
  }
  eliminarUsuario(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/usuarios/${id}`);
  }

  // --- Productos ---
  getProductos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.apiUrl}/productos`);
  }
  crearProducto(producto: Producto): Observable<Producto> {
    return this.http.post<Producto>(`${this.apiUrl}/productos`, producto);
  }
  editarProducto(id: number, producto: Producto): Observable<Producto> {
    return this.http.put<Producto>(`${this.apiUrl}/productos/${id}`, producto);
  }
  eliminarProducto(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/productos/${id}`);
  }

  // --- Gastos ---
  getGastos(): Observable<Gasto[]> {
    return this.http.get<Gasto[]>(`${this.apiUrl}/gastos`);
  }
  crearGasto(gasto: Gasto): Observable<Gasto> {
    return this.http.post<Gasto>(`${this.apiUrl}/gastos`, gasto);
  }
  editarGasto(id: number, gasto: Gasto): Observable<Gasto> {
    return this.http.put<Gasto>(`${this.apiUrl}/gastos/${id}`, gasto);
  }
  eliminarGasto(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/gastos/${id}`);
  }

  // --- Ventas ---
  getVentas(): Observable<Venta[]> {
    return this.http.get<Venta[]>(`${this.apiUrl}/ventas`);
  }
  crearVenta(venta: Venta): Observable<Venta> {
    return this.http.post<Venta>(`${this.apiUrl}/ventas`, venta);
  }
  editarVenta(id: number, venta: Venta): Observable<Venta> {
    return this.http.put<Venta>(`${this.apiUrl}/ventas/${id}`, venta);
  }
  eliminarVenta(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/ventas/${id}`);
  }

  // --- Ingresos ---
  getIngresos(): Observable<Ingreso[]> {
    return this.http.get<Ingreso[]>(`${this.apiUrl}/ingresos`);
  }
  crearIngreso(ingreso: Ingreso): Observable<Ingreso> {
    return this.http.post<Ingreso>(`${this.apiUrl}/ingresos`, ingreso);
  }
  editarIngreso(id: number, ingreso: Ingreso): Observable<Ingreso> {
    return this.http.put<Ingreso>(`${this.apiUrl}/ingresos/${id}`, ingreso);
  }
  eliminarIngreso(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/ingresos/${id}`);
  }

  // --- Movimientos ---
  getMovimientos(): Observable<Movimiento[]> {
    return this.http.get<Movimiento[]>(`${this.apiUrl}/movimientos`);
  }
  getMovimientosPorProducto(productoId: number): Observable<Movimiento[]> {
    return this.http.get<Movimiento[]>(`${this.apiUrl}/movimientos/producto/${productoId}`);
  }
  eliminarMovimiento(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/movimientos/${id}`);
  }

  // --- Dashboard ---
  getDashboardBalance(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dashboard/balance`);
  }
}
