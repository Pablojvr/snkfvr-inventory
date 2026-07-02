import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { ApiService } from '../../core/services/api';

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule, ChartModule],
  templateUrl: './estadisticas.html',
})
export class Estadisticas implements OnInit {
  basicData: any;
  basicOptions: any;
  
  totalVentas: number = 0;
  totalIngresos: number = 0;
  totalGastos: number = 0;
  balance: number = 0;
  
  constructor(private api: ApiService) {}

  ngOnInit() {
    this.cargarDatos();
  }
  
  cargarDatos() {
    this.api.getDashboardBalance().subscribe(data => {
       this.totalVentas = data.totalVentas;
       this.totalIngresos = data.totalIngresos;
       this.totalGastos = data.totalGastos;
       this.balance = data.balance;
       
       this.basicData = {
           labels: ['Ventas', 'Ingresos Manuales', 'Gastos / Compras'],
           datasets: [
               {
                   label: 'Monto Total',
                   data: [this.totalVentas, this.totalIngresos, this.totalGastos],
                   backgroundColor: ['#10b981', '#3b82f6', '#ef4444'],
               }
           ]
       };
    });

    this.basicOptions = {
        plugins: {
            legend: {
                labels: {
                    color: '#495057'
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
            }
        }
    };
  }
}
