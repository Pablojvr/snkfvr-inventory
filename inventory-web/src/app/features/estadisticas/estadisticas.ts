import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ApiService, Producto, Venta, Gasto } from '../../core/services/api';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule, ChartModule, FormsModule, SelectModule, TableModule],
  templateUrl: './estadisticas.html',
})
export class Estadisticas implements OnInit {
  // KPIs
  gananciaNeta: number = 0;
  roiPromedio: number = 0;
  tiempoPromedioVenta: number = 0; // days
  
  // Top Productos
  topProductos: any[] = [];
  
  // Charts
  chartData: any;
  chartOptions: any;
  
  // Filters
  rangoOpciones: any[] = [
      { label: 'Este Mes', value: 'mes_actual' },
      { label: 'Últimos 6 Meses', value: '6_meses' },
      { label: 'Año Actual', value: 'ano_actual' },
      { label: 'Histórico', value: 'historico' }
  ];
  rangoSeleccionado: string = '6_meses';

  // Raw Data
  productos: Producto[] = [];
  ventas: Venta[] = [];
  gastos: Gasto[] = [];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.initChartOptions();
    this.cargarDatos();
  }
  
  cargarDatos() {
    forkJoin({
      productos: this.api.getProductos(),
      ventas: this.api.getVentas(),
      gastos: this.api.getGastos()
    }).subscribe(({ productos, ventas, gastos }) => {
      this.productos = productos;
      this.ventas = ventas;
      this.gastos = gastos;
      this.procesarEstadisticas();
    });
  }

  onRangoChange() {
      this.procesarEstadisticas();
  }

  procesarEstadisticas() {
      const { ventasFiltradas, gastosFiltrados } = this.filtrarPorFecha();
      
      this.calcularKPIs(ventasFiltradas, gastosFiltrados);
      this.calcularTopProductos(ventasFiltradas, gastosFiltrados);
      this.generarGrafico(ventasFiltradas, gastosFiltrados);
  }

  filtrarPorFecha() {
      const hoy = new Date();
      let fechaInicio = new Date(2000, 0, 1); // fallback histórico

      if (this.rangoSeleccionado === 'mes_actual') {
          fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      } else if (this.rangoSeleccionado === '6_meses') {
          fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1);
      } else if (this.rangoSeleccionado === 'ano_actual') {
          fechaInicio = new Date(hoy.getFullYear(), 0, 1);
      }

      const ventasFiltradas = this.ventas.filter(v => new Date(v.fechaVenta || v.fechaRegistro || hoy) >= fechaInicio && v.activo);
      const gastosFiltrados = this.gastos.filter(g => new Date(g.fecha) >= fechaInicio && g.activo);

      return { ventasFiltradas, gastosFiltrados };
  }

  calcularKPIs(ventasFiltradas: Venta[], gastosFiltrados: Gasto[]) {
      // Ingresos Totales
      const ingresosVentas = ventasFiltradas.reduce((sum, v) => sum + (v.precioVenta || 0), 0);
      
      // Costos (Gastos) Totales
      const costosTotales = gastosFiltrados.reduce((sum, g) => sum + (g.monto || 0), 0);

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

      ventasFiltradas.forEach(v => {
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
  }

  calcularTopProductos(ventasFiltradas: Venta[], gastosFiltrados: Gasto[]) {
      const utilidades: any[] = [];

      ventasFiltradas.forEach(v => {
          const producto = this.productos.find(p => p.id === v.productoId);
          if (producto) {
              // Costos del producto
              const gastosProd = gastosFiltrados.filter(g => g.productoId === producto.id);
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
      ventasFiltradas.forEach(v => {
          const date = new Date(v.fechaVenta || v.fechaRegistro || new Date());
          const label = `${meses[date.getMonth()]} ${date.getFullYear().toString().substring(2)}`;
          if (ingresosMap.has(label)) {
              ingresosMap.set(label, ingresosMap.get(label)! + (v.precioVenta || 0));
          }
      });

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
