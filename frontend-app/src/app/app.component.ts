import {Component, signal} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {WebSocketService} from "../services/websocket.service";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`
})
export class AppComponent {
  protected readonly title = signal('productonLineFront');
  constructor(private webSocketService: WebSocketService) {
    this.webSocketService.connect();
    // Allow time to connect then send ping and tests
    setTimeout(() => {
      this.webSocketService.sendPing();
      this.webSocketService.sendTestQueue();
      this.webSocketService.sendTestMachine();
    }, 2000);
  }
}
