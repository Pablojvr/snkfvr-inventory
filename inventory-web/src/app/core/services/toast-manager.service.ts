import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root'
})
export class ToastManagerService {
  private activeMessages: any[] = [];
  private readonly maxMessages = 3;

  constructor(private messageService: MessageService) {}

  showSuccess(title: string, detail: string, life?: number) {
    this.addMessage('success', title, detail, life);
  }

  showInfo(title: string, detail: string, life?: number) {
    this.addMessage('info', title, detail, life);
  }

  showWarn(title: string, detail: string, life?: number) {
    this.addMessage('warn', title, detail, life);
  }

  showError(title: string, detail: string, life?: number) {
    this.addMessage('error', title, detail, life);
  }

  private addMessage(severity: string, summary: string, detail: string, life: number = 3000) {
    if (this.activeMessages.length >= this.maxMessages) {
      // Remover el más antiguo de la cola interna de activeMessages, pero primeng clear ya borra todo.
      // Para simular el comportamiento FIFO exacto, podemos limpiar todos y re-agregar, o primeng v16+ lo maneja mejor.
      // MessageService no tiene un "remove specific message" a menos que le pasemos un key.
      this.messageService.clear();
      this.activeMessages = [];
    }

    const msg = { severity, summary, detail, life };
    this.activeMessages.push(msg);
    this.messageService.add(msg);
    
    setTimeout(() => {
        this.activeMessages = this.activeMessages.filter(m => m !== msg);
    }, life);
  }
}
