import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root'
})
export class ToastManagerService {
  private activeMessages: any[] = [];
  private readonly maxMessages = 3;

  constructor(private messageService: MessageService) {}

  showSuccess(title: string, detail: string) {
    this.addMessage('success', title, detail);
  }

  showInfo(title: string, detail: string) {
    this.addMessage('info', title, detail);
  }

  showWarn(title: string, detail: string) {
    this.addMessage('warn', title, detail);
  }

  showError(title: string, detail: string) {
    this.addMessage('error', title, detail);
  }

  private addMessage(severity: string, summary: string, detail: string) {
    if (this.activeMessages.length >= this.maxMessages) {
      // Remover el más antiguo de la cola interna de activeMessages, pero primeng clear ya borra todo.
      // Para simular el comportamiento FIFO exacto, podemos limpiar todos y re-agregar, o primeng v16+ lo maneja mejor.
      // MessageService no tiene un "remove specific message" a menos que le pasemos un key.
      this.messageService.clear();
      this.activeMessages = [];
    }

    const msg = { severity, summary, detail, life: 3000 };
    this.activeMessages.push(msg);
    this.messageService.add(msg);
    
    setTimeout(() => {
        this.activeMessages = this.activeMessages.filter(m => m !== msg);
    }, 3000);
  }
}
