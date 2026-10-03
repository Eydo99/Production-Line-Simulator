import { Injectable, NgZone } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import Stomp from 'stompjs';
import SockJS from 'sockjs-client';

// Product DTO matching backend
export interface ProductDTO {
  id: string;
  color: string;
  createdAt: number;
}

// Queue update with products
export interface QueueUpdate {
  queueId: string;
  currentSize: number;
  products: ProductDTO[]; // Actual products with colors
}

export interface MachineUpdate {
  machineId: string;
  status: string;
  productColor: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private stompClient: any;
  private readonly webSocketUrl = 'http://localhost:8080/ws';

  // Observables for components to subscribe
  public queueUpdates$ = new Subject<QueueUpdate>();
  public machineUpdates$ = new Subject<MachineUpdate>();
  public connectionStatus$ = new BehaviorSubject<boolean>(false);

  constructor(private ngZone: NgZone) { }

  public connect(): void {
    const socket = new SockJS(this.webSocketUrl);
    this.stompClient = Stomp.over(socket);

    // Disable debug logs to reduce noise
    this.stompClient.debug = () => { };

    this.stompClient.connect({}, (frame: any) => {
      console.log('✅ Connected to WebSocket');
      this.ngZone.run(() => this.connectionStatus$.next(true));

      // Subscribe to queue updates (now with product colors)
      this.stompClient.subscribe('/topic/queues', (message: any) => {
        const update: QueueUpdate = JSON.parse(message.body);
        console.log('📦 Queue Update (WS):', update);
        console.log('   Products:', update.products?.map(p => `${p.id}: ${p.color}`));
        this.ngZone.run(() => {
          this.queueUpdates$.next(update);
        });
      });

      // Subscribe to machine updates
      this.stompClient.subscribe('/topic/machines', (message: any) => {
        const update: MachineUpdate = JSON.parse(message.body);
        console.log('⚙️ Machine Update (WS):', update);
        this.ngZone.run(() => {
          this.machineUpdates$.next(update);
        });
      });
    }, (error: any) => {
      console.error('❌ WebSocket Error:', error);
      this.ngZone.run(() => this.connectionStatus$.next(false));
      setTimeout(() => this.connect(), 5000); // Auto-reconnect
    });
  }

  public sendTestQueue(): void {
    if (this.stompClient?.connected) {
      this.stompClient.send('/app/test/queue', {}, {});
    }
  }

  public sendTestMachine(): void {
    if (this.stompClient?.connected) {
      this.stompClient.send('/app/test/machine', {}, {});
    }
  }

  public disconnect(): void {
    if (this.stompClient) {
      this.stompClient.disconnect();
      console.log("Disconnected");
    }
  }

  public sendPing(): void {
    if (this.stompClient?.connected) {
      this.stompClient.send('/app/ping', {}, JSON.stringify({ type: 'ping' }));
    }
  }
}