import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { ApiService, Producto, Venta, Gasto, Movimiento } from '../../core/services/api';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule, ChartModule, FormsModule, SelectModule, TableModule, DatePickerModule],
  templateUrl: './estadisticas.html',
})
export class Estadisticas implements OnInit {
  // KPIs
  gananciaNeta: number = 0;
  roiPromedio: number = 0;
  tiempoPromedioVenta: number = 0; // days
  comisionesVenta: number = 0;
  comisionesCompra: number = 0;
  gananciaPotencial: number = 0;
  stockDisponible: number = 0;
  
  // Top Productos
  topProductos: any[] = [];
  productosBajaRotacion: any[] = [];
  
  // Charts
  chartData: any;
  chartOptions: any;
  
  // Filters
  rangoOpciones: any[] = [
      { label: 'Hoy', value: 'hoy' },
      { label: 'Ayer', value: 'ayer' },
      { label: 'Esta Semana', value: 'esta_semana' },
      { label: 'Este Mes', value: 'mes_actual' },
      { label: 'Últimos 6 Meses', value: '6_meses' },
      { label: 'Año Actual', value: 'ano_actual' },
      { label: 'Histórico', value: 'historico' },
      { label: 'Personalizado', value: 'personalizado' }
  ];
  rangoSeleccionado: string = 'mes_actual';
  fechaRango: Date[] = [];

  // Raw Data
  productos: Producto[] = [];
  ventas: Venta[] = [];
  gastos: Gasto[] = [];
  movimientos: Movimiento[] = [];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.initChartOptions();
    this.cargarDatos();
  }
  
  cargarDatos() {
    forkJoin({
      productos: this.api.getProductos(),
      ventas: this.api.getVentas(),
      gastos: this.api.getGastos(),
      movimientos: this.api.getMovimientos()
    }).subscribe(({ productos, ventas, gastos, movimientos }) => {
      this.productos = productos;
      this.ventas = ventas;
      this.gastos = gastos;
      this.movimientos = movimientos;
      this.procesarEstadisticas();
    });
  }

  onRangoChange() {
      if (this.rangoSeleccionado === 'personalizado') {
          if (!this.fechaRango || this.fechaRango.length === 0) return; // Esperar a que seleccione
          if (this.fechaRango[0] && !this.fechaRango[1]) return; // Esperar rango completo
      }
      this.procesarEstadisticas();
  }

  procesarEstadisticas() {
      const { ventasFiltradas, gastosFiltrados, movimientosFiltrados } = this.filtrarPorFecha();
      
      this.calcularKPIs(ventasFiltradas, gastosFiltrados, movimientosFiltrados);
      this.calcularTopProductos(ventasFiltradas, gastosFiltrados);
      this.generarGrafico(ventasFiltradas, gastosFiltrados);

      // Calcular ganancia potencial de los productos en inventario
      const disponibles = this.productos.filter(p => p.estado === 'Disponible' || !p.estado);
      this.stockDisponible = disponibles.length;
      this.gananciaPotencial = this.stockDisponible * 20;

      // Calcular Baja Rotación (solo inventario disponible que supera el promedio)
      const hoyTime = new Date().getTime();
      this.productosBajaRotacion = disponibles.map(p => {
          const diasEnInventario = p.fechaCompra ? Math.ceil(Math.abs(hoyTime - new Date(p.fechaCompra).getTime()) / (1000 * 60 * 60 * 24)) : 0;
          const gastosProd = this.gastos.filter(g => g.productoId === p.id && g.activo);
          const costoProd = gastosProd.reduce((sum, g) => sum + (g.monto || 0), 0);
          return {
              descripcion: p.descripcion,
              diasEnInventario: diasEnInventario,
              costo: costoProd
          };
      })
      .filter(p => p.diasEnInventario > this.tiempoPromedioVenta && this.tiempoPromedioVenta > 0)
      .sort((a, b) => b.diasEnInventario - a.diasEnInventario);
  }

  filtrarPorFecha() {
      const hoy = new Date();
      let fechaInicio = new Date(2000, 0, 1); // fallback histórico
      let fechaFin = new Date(2100, 0, 1);

      if (this.rangoSeleccionado === 'hoy') {
          fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
          fechaFin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999);
      } else if (this.rangoSeleccionado === 'ayer') {
          fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
          fechaFin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1, 23, 59, 59, 999);
      } else if (this.rangoSeleccionado === 'esta_semana') {
          const day = hoy.getDay() || 7; // Lunes = 1
          fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - day + 1);
      } else if (this.rangoSeleccionado === 'mes_actual') {
          fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      } else if (this.rangoSeleccionado === '6_meses') {
          fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1);
      } else if (this.rangoSeleccionado === 'ano_actual') {
          fechaInicio = new Date(hoy.getFullYear(), 0, 1);
      } else if (this.rangoSeleccionado === 'personalizado' && this.fechaRango && this.fechaRango.length === 2 && this.fechaRango[1]) {
          fechaInicio = this.fechaRango[0];
          fechaFin = this.fechaRango[1];
          fechaFin.setHours(23, 59, 59, 999);
      }

      const ventasFiltradas = this.ventas.filter(v => {
          const d = new Date(v.fechaVenta || v.fechaRegistro || hoy);
          return d >= fechaInicio && d <= fechaFin && v.activo;
      });
      const gastosFiltrados = this.gastos.filter(g => {
          const d = new Date(g.fecha);
          return d >= fechaInicio && d <= fechaFin && g.activo;
      });
      const movimientosFiltrados = this.movimientos.filter(m => {
          const d = new Date(m.fecha);
          return d >= fechaInicio && d <= fechaFin && m.activo !== false;
      });

      return { ventasFiltradas, gastosFiltrados, movimientosFiltrados };
  }

  calcularKPIs(ventasFiltradas: Venta[], gastosFiltrados: Gasto[], movimientosFiltrados: Movimiento[]) {
      // 1. Ingresos: Solo las ventas completadas generan ingresos reales
      const ventasCompletadas = ventasFiltradas.filter(v => v.estado === 'Vendido');
      const ingresosVentas = ventasCompletadas.reduce((sum, v) => sum + (v.precioVenta || 0), 0);
      
      // 2. Costos: El costo solo se resta si el producto ya se vendió (Costo de Bienes Vendidos - COGS)
      // IMPORTANT: COGS must include ALL expenses tied to the product, regardless of the date range selected.
      const idsProductosVendidos = ventasCompletadas.map(v => v.productoId).filter(id => id !== undefined) as number[];
      const gastosDeProductosVendidos = this.gastos.filter(g => g.activo && g.productoId !== undefined && idsProductosVendidos.includes(g.productoId));
      const costosTotales = gastosDeProductosVendidos.reduce((sum, g) => sum + (g.monto || 0), 0);

      this.gananciaNeta = ingresosVentas - costosTotales;

      // ROI Promedio = Ganancia Neta / Costos Totales * 100
      if (costosTotales > 0) {
          this.roiPromedio = (this.gananciaNeta / costosTotales) * 100;
      } else {
          this.roiPromedio = 0;
      }

      // Tiempo Promedio de Venta
      let diasTotales = 0;
      let cantidadVendidos = 0;

      ventasCompletadas.forEach(v => {
          const producto = this.productos.find(p => p.id === v.productoId);
          if (producto && producto.fechaCompra && v.fechaVenta) {
              const compraDate = new Date(producto.fechaCompra).getTime();
              const ventaDate = new Date(v.fechaVenta).getTime();
              const diffTime = Math.abs(ventaDate - compraDate);
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              diasTotales += diffDays;
              cantidadVendidos++;
          }
      });

      this.tiempoPromedioVenta = cantidadVendidos > 0 ? (diasTotales / cantidadVendidos) : 0;
      
      this.comisionesVenta = movimientosFiltrados
          .filter(m => m.tipo === 'Comisión' && m.descripcion.startsWith('Comisión de venta'))
          .reduce((sum, m) => sum + Math.abs(m.montoTotal), 0);
          
      this.comisionesCompra = movimientosFiltrados
          .filter(m => m.tipo === 'Comisión' && !m.descripcion.startsWith('Comisión de venta'))
          .reduce((sum, m) => sum + Math.abs(m.montoTotal), 0);
  }

  calcularTopProductos(ventasFiltradas: Venta[], gastosFiltrados: Gasto[]) {
      const utilidades: any[] = [];
      const ventasCompletadas = ventasFiltradas.filter(v => v.estado === 'Vendido');

      ventasCompletadas.forEach(v => {
          const producto = this.productos.find(p => p.id === v.productoId);
          if (producto) {
              // Costos del producto (usando this.gastos para incluir compras fuera del rango de fecha actual)
              const gastosProd = this.gastos.filter(g => g.activo && g.productoId === producto.id);
              const costoProd = gastosProd.reduce((sum, g) => sum + (g.monto || 0), 0);
              
              const ganancia = (v.precioVenta || 0) - costoProd;
              const roi = costoProd > 0 ? (ganancia / costoProd) * 100 : 0;

              utilidades.push({
                  descripcion: producto.descripcion,
                  fechaVenta: v.fechaVenta,
                  ganancia: ganancia,
                  roi: roi
              });
          }
      });

      // Sort by ganancia and get top 5
      utilidades.sort((a, b) => b.ganancia - a.ganancia);
      this.topProductos = utilidades.slice(0, 5);
  }

  generarGrafico(ventasFiltradas: Venta[], gastosFiltrados: Gasto[]) {
      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const ingresosMap = new Map<string, number>();
      const gastosMap = new Map<string, number>();
      
      const labels: string[] = [];
      const ingresosData: number[] = [];
      const gastosData: number[] = [];

      // Determine period
      let numMonths = 6;
      if (this.rangoSeleccionado === 'mes_actual') numMonths = 1;
      if (this.rangoSeleccionado === 'ano_actual') numMonths = new Date().getMonth() + 1;
      if (this.rangoSeleccionado === 'historico') numMonths = 12; // cap it at 12 for chart readability

      const d = new Date();
      d.setMonth(d.getMonth() - numMonths + 1);

      for (let i = 0; i < numMonths; i++) {
          const label = `${meses[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`;
          labels.push(label);
          ingresosMap.set(label, 0);
          gastosMap.set(label, 0);
          d.setMonth(d.getMonth() + 1);
      }

      // Populate Data
      const ventasCompletadas = ventasFiltradas.filter(v => v.estado === 'Vendido');
      
      ventasCompletadas.forEach(v => {
          const date = new Date(v.fechaVenta || v.fechaRegistro || new Date());
          const label = `${meses[date.getMonth()]} ${date.getFullYear().toString().substring(2)}`;
          if (ingresosMap.has(label)) {
              ingresosMap.set(label, ingresosMap.get(label)! + (v.precioVenta || 0));
          }
      });

      // Flujo de caja real: Mostrar TODOS los gastos ocurridos en el periodo,
      // independientemente de si el producto ya se vendió o no.
      gastosFiltrados.forEach(g => {
          const date = new Date(g.fecha);
          const label = `${meses[date.getMonth()]} ${date.getFullYear().toString().substring(2)}`;
          if (gastosMap.has(label)) {
              gastosMap.set(label, gastosMap.get(label)! + (g.monto || 0));
          }
      });

      labels.forEach(l => {
          ingresosData.push(ingresosMap.get(l)!);
          gastosData.push(gastosMap.get(l)!);
      });

      this.chartData = {
          labels: labels,
          datasets: [
              {
                  label: 'Ingresos (Ventas)',
                  data: ingresosData,
                  backgroundColor: '#f43f5e', // Coral
                  borderRadius: 6
              },
              {
                  label: 'Costos (Gastos)',
                  data: gastosData,
                  backgroundColor: '#e2e8f0', // Neutral Slate
                  borderRadius: 6
              }
          ]
      };
  }

  initChartOptions() {
      const documentStyle = getComputedStyle(document.documentElement);
      const textColor = documentStyle.getPropertyValue('--text-color');
      const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
      const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

      this.chartOptions = {
          maintainAspectRatio: false,
          aspectRatio: 0.8,
          plugins: {
              legend: {
                  labels: {
                      color: textColor,
                      font: {
                          family: 'Inter, sans-serif',
                          weight: '600'
                      }
                  }
              }
          },
          scales: {
              x: {
                  ticks: {
                      color: textColorSecondary,
                      font: {
                          family: 'Inter, sans-serif',
                          weight: '500'
                      }
                  },
                  grid: {
                      color: surfaceBorder,
                      drawBorder: false
                  }
              },
              y: {
                  ticks: {
                      color: textColorSecondary,
                      font: {
                          family: 'Inter, sans-serif'
                      }
                  },
                  grid: {
                      color: surfaceBorder,
                      drawBorder: false
                  }
              }
          }
      };
  }
}
