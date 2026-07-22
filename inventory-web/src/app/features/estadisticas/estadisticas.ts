import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';
import { PopoverModule } from 'primeng/popover';
import { ApiService, Producto, Venta, Gasto, Movimiento, TipoGasto } from '../../core/services/api';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule, ChartModule, FormsModule, SelectModule, TableModule, DatePickerModule, TooltipModule, PopoverModule],
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
  efectivoEnCaja: number = 0;
  inventarioTotal: number = 0;
  
  // Promedios en dólares
  costoPromedioDolares: number = 0;
  gananciaPromedioDolares: number = 0;

  // Diagnóstico Inteligente y Proyecciones
  diagnosticoFinanciero: string = '';
  presupuestoRecomendado: string = '';
  presupuestoSugerido: number = 0;
  porcentajeCajaSugerido: number = 0;
  
  // Ritmo y Proyecciones
  promedioVentasSemana: number = 0;
  promedioComprasSemana: number = 0;
  proyeccionVentasAnual: number = 0;
  proyeccionGananciaAnual: number = 0;
  
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
  tiposGasto: TipoGasto[] = [];

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
      movimientos: this.api.getMovimientos(),
      tiposGasto: this.api.getTiposGasto()
    }).subscribe(({ productos, ventas, gastos, movimientos, tiposGasto }) => {
      this.productos = productos;
      this.ventas = ventas;
      this.gastos = gastos;
      this.movimientos = movimientos;
      this.tiposGasto = tiposGasto;
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
      const { ventasFiltradas, gastosFiltrados, movimientosFiltrados, fechaInicio, fechaFin } = this.filtrarPorFecha();
      
      this.calcularKPIs(ventasFiltradas, gastosFiltrados, movimientosFiltrados, fechaInicio, fechaFin);
      this.calcularTopProductos(ventasFiltradas, gastosFiltrados);
      this.generarGrafico(ventasFiltradas, gastosFiltrados);

      // Calcular ganancia potencial de los productos en inventario (usando la ganancia promedio actual)
      const disponibles = this.productos.filter(p => p.estado === 'Disponible' || !p.estado);
      this.stockDisponible = disponibles.length;
      const promedio = this.gananciaPromedioDolares > 0 ? this.gananciaPromedioDolares : 20; // fallback inicial
      this.gananciaPotencial = this.stockDisponible * promedio;

      // Calcular Efectivo en Caja y Valor Inventario (siempre históricos)
      this.efectivoEnCaja = this.movimientos.reduce((acc, m) => acc + (m.montoTotal || 0), 0);
      this.inventarioTotal = this.productos.reduce((acc, p) => {
          const gastosProd = this.gastos.filter(g => g.productoId === p.id && g.activo);
          const costo = gastosProd.reduce((sum, g) => sum + (g.monto || 0), 0);
          return acc + costo;
      }, 0);

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

      return { ventasFiltradas, gastosFiltrados, movimientosFiltrados, fechaInicio, fechaFin };
  }

  calcularKPIs(ventasFiltradas: Venta[], gastosFiltrados: Gasto[], movimientosFiltrados: Movimiento[], fechaInicio: Date, fechaFin: Date) {
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
      
      // Promedios en Dólares
      this.costoPromedioDolares = ventasCompletadas.length > 0 ? (costosTotales / ventasCompletadas.length) : 0;
      this.gananciaPromedioDolares = ventasCompletadas.length > 0 ? (this.gananciaNeta / ventasCompletadas.length) : 0;

      // Diagnóstico Inteligente
      const totalGastadoEnPeriodo = gastosFiltrados.reduce((sum, g) => sum + (g.monto || 0), 0);
      this.generarDiagnosticoInteligente(ingresosVentas, totalGastadoEnPeriodo, ventasCompletadas.length, costosTotales);
      this.generarPresupuesto();

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

      // Ritmo y Proyecciones
      const hoy = new Date();
      let diasDelPeriodo = 0;
      
      if (this.rangoSeleccionado === 'historico' || this.rangoSeleccionado === 'todo') {
          // Si es histórico, buscar la fecha más antigua de compra o venta
          let minDate = hoy.getTime();
          if (this.productos.length > 0) {
              const fechas = this.productos.map(p => p.fechaCompra ? new Date(p.fechaCompra).getTime() : hoy.getTime());
              minDate = Math.min(minDate, ...fechas);
          }
          if (this.ventas.length > 0) {
              const fechasVentas = this.ventas.map(v => v.fechaVenta ? new Date(v.fechaVenta).getTime() : hoy.getTime());
              minDate = Math.min(minDate, ...fechasVentas);
          }
          diasDelPeriodo = Math.ceil((hoy.getTime() - minDate) / (1000 * 60 * 60 * 24));
      } else {
          // Calcular días transcurridos reales en el rango (limitado a 'hoy' para no bajar promedios con días futuros)
          const finReal = fechaFin > hoy ? hoy : fechaFin;
          diasDelPeriodo = Math.ceil((finReal.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
      }

      diasDelPeriodo = diasDelPeriodo > 0 ? diasDelPeriodo : 1; // Evitar división por cero
      const semanasDelPeriodo = diasDelPeriodo / 7;

      // Calcular cantidad de pares físicos comprados en el periodo
      const productosComprados = this.productos.filter(p => {
          if (!p.fechaCompra) return false;
          const d = new Date(p.fechaCompra);
          return d >= fechaInicio && d <= fechaFin;
      });

      this.promedioVentasSemana = ventasCompletadas.length / (semanasDelPeriodo > 0 ? semanasDelPeriodo : 1);
      this.promedioComprasSemana = productosComprados.length / (semanasDelPeriodo > 0 ? semanasDelPeriodo : 1);

      const ritmoVentasDiario = ventasCompletadas.length / diasDelPeriodo;
      
      // Proyección Fin de Año (Año Calendario Actual)
      const finDeAno = new Date(hoy.getFullYear(), 11, 31, 23, 59, 59);
      let diasRestantesAno = Math.ceil((finDeAno.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
      if (diasRestantesAno < 0) diasRestantesAno = 0;
      
      // Calcular acumulado real del año calendario
      const inicioDeAno = new Date(hoy.getFullYear(), 0, 1);
      const ventasEsteAno = this.ventas.filter(v => {
          if (v.estado !== 'Vendido' || !v.activo) return false;
          const d = new Date(v.fechaVenta || v.fechaRegistro || hoy);
          return d >= inicioDeAno && d <= hoy;
      });
      
      const idsVendidosEsteAno = ventasEsteAno.map(v => v.productoId).filter(id => id !== undefined) as number[];
      const gastosDeVendidosEsteAno = this.gastos.filter(g => g.activo && g.productoId !== undefined && idsVendidosEsteAno.includes(g.productoId));
      const costoEsteAno = gastosDeVendidosEsteAno.reduce((sum, g) => sum + (g.monto || 0), 0);
      const ingresosEsteAno = ventasEsteAno.reduce((sum, v) => sum + (v.precioVenta || 0), 0);
      const gananciaAcumuladaEsteAno = ingresosEsteAno - costoEsteAno;

      const ventasRestantesEst = ritmoVentasDiario * diasRestantesAno;
      this.proyeccionVentasAnual = ventasEsteAno.length + ventasRestantesEst;
      
      const gananciaRestanteEst = ventasRestantesEst * this.gananciaPromedioDolares;
      this.proyeccionGananciaAnual = gananciaAcumuladaEsteAno + gananciaRestanteEst;
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

  generarDiagnosticoInteligente(ingresosVentas: number, totalGastadoEnPeriodo: number, cantidadVendida: number, costosVenta: number) {
      if (cantidadVendida === 0) {
          this.diagnosticoFinanciero = "Aún no hay ventas registradas en este periodo. Enfócate en promocionar tu inventario actual.";
          return;
      }

      const gananciaPura = ingresosVentas - costosVenta;
      const flujoCaja = ingresosVentas - totalGastadoEnPeriodo;
      let texto = "";

      if (gananciaPura > 0) {
          texto = `¡Altamente rentable! Generaste $${gananciaPura.toFixed(2)} de ganancia pura. `;
      } else if (gananciaPura === 0) {
          texto = `Estás en punto de equilibrio de rentabilidad. `;
      } else {
          texto = `Estás perdiendo margen. Tus productos se vendieron por debajo del costo real. `;
      }

      if (flujoCaja < 0) {
          texto += `Sin embargo, gastaste $${Math.abs(flujoCaja).toFixed(2)} más de lo que ingresó, probablemente porque adquiriste inventario que aún no se vende (lo cual es normal para crecer). Tu flujo de efectivo temporal es negativo.`;
      } else {
          texto += `Además, tuviste un flujo de caja positivo de $${flujoCaja.toFixed(2)}. Ingresó más dinero del que gastaste en el periodo.`;
      }

      this.diagnosticoFinanciero = texto;
  }

  generarPresupuesto() {
      // El presupuesto se calcula sobre el efectivo REAL en caja hoy, no del periodo.
      // Suponiendo que de lo que tienes en caja, es sano reinvertir el 70% si tienes liquidez.
      if (this.efectivoEnCaja > 0) {
          const reinversion = this.efectivoEnCaja * 0.70;
          this.presupuestoRecomendado = `Basado en tu liquidez actual, tu presupuesto sugerido para reinversión inmediata en nuevo inventario es de $${reinversion.toFixed(2)} (70% de caja).`;
      } else {
          this.presupuestoRecomendado = `Tu efectivo en caja es limitado o negativo. Sugerimos no realizar grandes compras y enfocarte en vender los ${this.stockDisponible} artículos disponibles para recuperar liquidez.`;
      }
  }

  generarGrafico(ventasFiltradas: Venta[], gastosFiltrados: Gasto[]) {
      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const ingresosMap = new Map<string, number>();
      const gastosPorCategoria = new Map<string, Map<string, number>>();
      
      const labels: string[] = [];
      const ingresosData: number[] = [];

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

      // Flujo de caja real: Desglosar gastos por categoría
      gastosFiltrados.forEach(g => {
          const date = new Date(g.fecha);
          const label = `${meses[date.getMonth()]} ${date.getFullYear().toString().substring(2)}`;
          
          let categoria = 'Otros Gastos';
          if (g.tipoGastoNombre) {
              categoria = g.tipoGastoNombre;
          } else if (g.tipoGastoId) {
              const tipoEncontrado = this.tiposGasto.find(t => t.id === g.tipoGastoId);
              if (tipoEncontrado) {
                  categoria = tipoEncontrado.nombre;
              }
          }
          
          if (categoria === 'Producto' || categoria === 'Productos') {
              categoria = 'Compras';
          }
          
          if (!gastosPorCategoria.has(categoria)) {
              const newMap = new Map<string, number>();
              labels.forEach(l => newMap.set(l, 0));
              gastosPorCategoria.set(categoria, newMap);
          }
          
          const categoryMap = gastosPorCategoria.get(categoria)!;
          if (categoryMap.has(label)) {
              categoryMap.set(label, categoryMap.get(label)! + (g.monto || 0));
          }
      });

      labels.forEach(l => {
          ingresosData.push(ingresosMap.get(l)!);
      });

      const datasets: any[] = [
          {
              label: 'Ventas',
              data: ingresosData,
              backgroundColor: '#FF4757', // Color Primario de la Marca
              borderRadius: 6
          }
      ];

      // Colores vibrantes y amigables para los gastos (evitando el gris/negro)
      const expenseColors = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4'];
      let colorIndex = 0;

      gastosPorCategoria.forEach((map, category) => {
          const data: number[] = [];
          labels.forEach(l => data.push(map.get(l)!));
          datasets.push({
              label: `${category}`,
              data: data,
              backgroundColor: expenseColors[colorIndex % expenseColors.length],
              borderRadius: 6
          });
          colorIndex++;
      });

      this.chartData = {
          labels: labels,
          datasets: datasets
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
                  position: 'right',
                  align: 'start',
                  labels: {
                      color: textColor,
                      padding: 12,
                      usePointStyle: true,
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
