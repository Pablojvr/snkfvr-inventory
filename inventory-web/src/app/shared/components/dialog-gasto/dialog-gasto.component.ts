import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ApiService, Gasto, Producto, Usuario, TipoGasto } from '../../../core/services/api';
import { ToastManagerService } from '../../../core/services/toast-manager.service';

@Component({
  selector: 'app-dialog-gasto',
  standalone: true,
  imports: [CommonModule, DialogModule, FormsModule, InputTextModule, InputNumberModule, DatePickerModule, SelectModule, ButtonModule, MessageModule],
  templateUrl: './dialog-gasto.component.html',
})
export class DialogGastoComponent {
  displayDialog: boolean = false;
  gasto: Gasto = { motivo: '', fecha: new Date(), monto: null, usuarioId: 0, tipoGastoId: 1 };
  
  editando: boolean = false;
  submitted: boolean = false;
  guardando: boolean = false;
  productoNombre: string = '';
  costoActual: number | undefined = undefined;
  prefilledProducto: boolean = false;
  escaneando: boolean = false;
  
  productos: Producto[] = [];
  usuarios: Usuario[] = [];
  tiposGasto: TipoGasto[] = [];
  soloProducto: boolean = false;
  
  // Resolved type name for logic
  tipoNombreActual: string = 'Producto';
  
  @Output() onSaved = new EventEmitter<void>();

  constructor(private api: ApiService, private toastManager: ToastManagerService) {}

  showDialog(productoId?: number, tipoGastoId?: number, gastoExistente?: Gasto, forceSoloProducto: boolean = false) {
    this.productoNombre = '';
    this.costoActual = undefined;
    this.prefilledProducto = !!productoId;
    this.soloProducto = forceSoloProducto;
    this.cargarDatos();
    
    if (gastoExistente) {
        this.gasto = { 
            ...gastoExistente, 
            fecha: gastoExistente.fecha ? new Date(gastoExistente.fecha) : new Date(),
            fechaIngreso: gastoExistente.fechaIngreso ? new Date(gastoExistente.fechaIngreso) : undefined
        };
        // Ocultar visualmente los prefijos añadidos por el backend
        if (this.gasto.motivo) {
            this.gasto.motivo = this.gasto.motivo.replace(/^COM\s*\|\s*/, '').replace(/^ENV\s*\|\s*/, '');
        }
        this.editando = true;
        this.prefilledProducto = !!gastoExistente.productoId;
    } else {
        const savedUser = localStorage.getItem('usuarioActivoId');
        const defaultUsuarioId = savedUser ? parseInt(savedUser, 10) : 0;
        this.gasto = { 
            motivo: '', 
            fecha: new Date(), 
            monto: null, 
            usuarioId: defaultUsuarioId, 
            tipoGastoId: tipoGastoId || 1, // Default: Producto
            productoId: productoId,
            comisionMonto: null,
            comisionUsuarioId: null
        };
        this.editando = false;
    }
    
    this.submitted = false;
    this.displayDialog = true;
  }

  cargarDatos() {
    import('rxjs').then(({ forkJoin }) => {
      forkJoin({
        productos: this.api.getProductos(),
        usuarios: this.api.getUsuarios(),
        tiposGasto: this.api.getTiposGasto()
      }).subscribe(({ productos, usuarios, tiposGasto }) => {
        this.productos = productos;
        this.usuarios = usuarios;
        this.tiposGasto = tiposGasto;
        
        this.resolveTipoNombre();
        
        // Find Ale for default commission user
        if (!this.editando && this.tipoNombreActual === 'Producto') {
           const aleUser = this.usuarios.find(u => u.nombre.toLowerCase().includes('ale'));
           if (aleUser) {
               this.gasto.comisionUsuarioId = aleUser.id;
           }
        }
        
        this.resolveProductoInfo();
        if (!this.editando && (this.tipoNombreActual === 'Comisión' || this.tipoNombreActual === 'Envío')) {
            this.generarMotivo();
        }
      });
    });
  }

  resolveTipoNombre() {
    const tipo = this.tiposGasto.find(t => t.id === this.gasto.tipoGastoId);
    this.tipoNombreActual = tipo?.nombre || 'Producto';
  }

  resolveProductoInfo() {
    if (this.gasto.productoId) {
      let pId = this.gasto.productoId;
      if (typeof pId === 'object') pId = (pId as any).id;
      const prod = this.productos.find(p => p.id === pId);
      if (prod) {
        this.productoNombre = prod.descripcion;
        this.costoActual = prod.costoCalculado ?? undefined;
      }
    }
  }
  
  onTipoChange() {
      this.resolveTipoNombre();
      
      if (this.tipoNombreActual === 'Producto') {
          const aleUser = this.usuarios.find(u => u.nombre.toLowerCase().includes('ale'));
          if (aleUser && !this.gasto.comisionUsuarioId) {
              this.gasto.comisionUsuarioId = aleUser.id;
          }
      } else if (this.tipoNombreActual === 'Comisión' || this.tipoNombreActual === 'Envío') {
          this.generarMotivo();
      }
  }

  generarMotivo() {
      let nombreProducto = '';
      if (this.gasto.productoId) {
          let pId = this.gasto.productoId;
          if (typeof pId === 'object') {
              pId = (pId as any).id;
          }
          const prod = this.productos.find(p => p.id === pId);
          if (prod) {
              nombreProducto = prod.descripcion;
          }
      }
      this.gasto.motivo = nombreProducto;
  }

  guardar() {
    this.submitted = true;
    if (this.guardando) return;
    
    if (!this.gasto.motivo || !this.gasto.usuarioId || this.gasto.monto === null || this.gasto.monto <= 0) {
      return;
    }
    
    this.resolveTipoNombre();
    
    if (this.gasto.productoId && this.tipoNombreActual !== 'Comisión' && this.tipoNombreActual !== 'Envío' && this.tipoNombreActual !== 'Producto') {
        this.toastManager.showError('Error', 'Un gasto de producto solo puede ser Comisión, Envío o Producto.');
        return;
    }

    let pId = this.gasto.productoId;
    if (pId && typeof pId === 'object') {
        this.gasto.productoId = (pId as any).id;
    }
    if (this.tipoNombreActual === 'Producto' && !this.gasto.productoId) {
        this.gasto.productoId = undefined;
    }

    this.guardando = true;
    if (this.editando && this.gasto.id) {
      this.api.editarGasto(this.gasto.id, this.gasto).subscribe({
        next: () => {
          this.guardando = false;
          this.displayDialog = false;
          this.onSaved.emit();
          this.toastManager.showSuccess('Éxito', 'Se editó el gasto/compra exitosamente.');
        },
        error: () => this.guardando = false
      });
    } else {
      this.api.crearGasto(this.gasto).subscribe({
        next: () => {
          this.guardando = false;
          this.displayDialog = false;
          this.onSaved.emit();
          this.toastManager.showSuccess('Éxito', 'Se registró el gasto/compra exitosamente.');
        },
        error: () => this.guardando = false
      });
    }
  }

  // --- Cámara Nativa y OCR ---
  procesarImagenSeleccionada(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.escaneando = true;
    this.toastManager.showInfo('Iniciando IA', 'Analizando la viñeta con búsqueda web. Esto tomará unos 20 segundos...', 5000);

    const reader = new FileReader();
    reader.onload = (e: any) => {
        const img = new Image();
        img.onload = () => {
            // Usar un canvas en memoria para comprimir y extraer base64
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);

                // Llamar a la API
                this.api.scanLabel(imageBase64).subscribe({
                    next: (data) => {
                        this.escaneando = false;
                        if(data && (data.talla || data.modelo)) {
                            this.gasto.motivo = `Talla ${data.talla || 'N/A'} | ${data.modelo || 'Desconocido'}`;
                            this.toastManager.showSuccess('¡Listo!', 'La IA encontró y analizó el zapato exitosamente.');
                        } else {
                            this.toastManager.showError('Sin resultados', 'La IA no pudo reconocer el modelo del zapato en la imagen.');
                        }
                    },
                    error: (err) => {
                        console.error('Error de API:', err);
                        this.escaneando = false;
                        this.toastManager.showError('Fallo en IA', 'Lo sentimos, hubo un error o demora al buscar en la web. Intenta de nuevo.');
                    }
                });
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    // Limpiar input para permitir seleccionar la misma foto si hubo error
    event.target.value = '';
  }
}
