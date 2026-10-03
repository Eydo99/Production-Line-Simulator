import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { Subscription, forkJoin } from 'rxjs';
import { QueueService, QueueModel } from '../../services/queue.service';
import { MachineService, MachineModel } from '../../services/machine.service';
import { ConnectionService, ConnectionModel } from '../../services/connection.service';
import { SimulationService } from '../../services/SimulationService';
import { WebSocketService } from '../../services/websocket.service';
import { QueueNodeComponent } from './queue-node/queue-node.component';
import { MachineNodeComponent } from './machine-node/machine-node.component';
import { ConnectionLineComponent } from './connection-line/connection-line.component';
import { ZoomControlsComponent } from '../zoom-controls/zoom-controls.component';
import { PlaybackControlsComponent } from '../playback-controls/playback-controls.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-simulation-canvas',
  standalone: true,
  imports: [
    CommonModule,
    QueueNodeComponent,
    MachineNodeComponent,
    ConnectionLineComponent,
    ZoomControlsComponent,
    PlaybackControlsComponent,
    FormsModule
  ],
  templateUrl: './simulation-canvas.component.html',
  styleUrls: ['./simulation-canvas.component.css']
})
export class SimulationCanvasComponent implements OnInit, OnDestroy {

  queues: QueueModel[] = [];
  machines: MachineModel[] = [];
  connections: ConnectionModel[] = [];
  isRunning = false;
  isConnected = false;

  // Connection creation state
  connectingMode = false;

  selectedNode: { id: string; type: 'queue' | 'machine' } | null = null;
  selectedNodeDetails: {
    type: 'queue' | 'machine';
    data: QueueModel | MachineModel;
  } | null = null;

  newCapacity: number = 10;
  newServiceTime: number = 2;

  // Zoom & Pan state
  scale = 1;
  panX = 0;
  panY = 0;
  private isPanning = false;
  private lastPanX = 0;
  private lastPanY = 0;

  private queueUpdateSub?: Subscription;
  private machineUpdateSub?: Subscription;


  constructor(
    private queueService: QueueService,
    private machineService: MachineService,
    private connectionService: ConnectionService,
    private wsService: WebSocketService,
    private http: HttpClient,
    private simulationService: SimulationService,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.loadData();
    this.subscribeToUpdates();

    this.simulationService.isRunning$.subscribe(running => {
      this.isRunning = running;
    });

    this.wsService.connectionStatus$.subscribe(status => {
      this.isConnected = status;
      this.cd.detectChanges();
    });
  }

  ngOnDestroy() {
    this.queueUpdateSub?.unsubscribe();
    this.machineUpdateSub?.unsubscribe();
  }

  // ========== LOAD DATA ==========
  // ========== LOAD DATA ==========
  loadData() {
    forkJoin({
      queues: this.queueService.getQueues(),
      machines: this.machineService.getMachines()
    }).subscribe(({ queues, machines }) => {
      this.queues = queues;
      this.machines = machines;
      console.log('📦 nodes loaded');

      // Load connections ONLY after nodes are ready to ensure coordinates are calculated
      this.loadConnections();
    });
  }

  loadConnections() {
    this.connectionService.getConnections().subscribe(c => {
      console.log('🔗 Loaded connections:', c);
      this.connections = c;
      this.updateConnectionPositions();
    });
  }

  // ========== ADD NODES ==========
  addQueue() {
    const randomX = Math.floor(Math.random() * 400) + 100;
    const randomY = Math.floor(Math.random() * 300) + 100;

    this.queueService.createQueue(randomX, randomY).subscribe(queue => {
      console.log('➕ Queue created:', queue);
      this.queues.push(queue);
    });
  }

  addMachine() {
    const randomX = Math.floor(Math.random() * 400) + 300;
    const randomY = Math.floor(Math.random() * 300) + 100;

    this.machineService.createMachine(randomX, randomY).subscribe(machine => {
      console.log('➕ Machine created:', machine);
      this.machines.push(machine);
    });
  }

  // ========== NODE MOVEMENT ==========
  onQueueMoved(queue: QueueModel, pos: { x: number; y: number }) {
    queue.x = pos.x;
    queue.y = pos.y;
    this.queueService.updatePosition(queue.id, pos.x, pos.y).subscribe();
    this.updateConnectionPositions();
  }

  onMachineMoved(machine: MachineModel, pos: { x: number; y: number }) {
    machine.x = pos.x;
    machine.y = pos.y;
    this.machineService.updatePosition(machine.name, pos.x, pos.y).subscribe();
    this.updateConnectionPositions();
  }

  // ========== CONNECTION SYSTEM ==========
  toggleConnectionMode() {
    this.connectingMode = !this.connectingMode;
    this.selectedNode = null;
    console.log('🔗 Connection mode:', this.connectingMode);
  }

  selectNodeForConnection(id: string, type: 'queue' | 'machine') {
    // Show properties panel whenever a node is clicked
    this.selectNodeForProperties(id, type);
    if (!this.connectingMode) return;

    if (!this.selectedNode) {
      this.selectedNode = { id, type };
      console.log('✅ Selected first node:', this.selectedNode);
    } else {
      const fromId = this.selectedNode.id;
      const toId = id;

      if (this.connectionService.validateConnection(fromId, toId)) {
        this.connectionService.createConnection(fromId, toId).subscribe(
          conn => {
            // Ensure we have the IDs even if backend response is partial
            const fullConn: ConnectionModel = {
              ...conn,
              fromId,
              toId
            };

            console.log('✅ Connection created:', fullConn);
            this.connections = [...this.connections, fullConn]; // Immutable update
            this.updateConnectionPositions();
            this.cd.detectChanges(); // Force update
            this.selectedNode = null;
            this.connectingMode = false;
          },
          error => {
            console.error('❌ Connection failed:', error);
            alert('Failed to create connection: ' + (error.error?.message || 'Unknown error'));
          }
        );
      } else {
        alert('Invalid connection! Must follow Q→M→Q pattern.');
        this.selectedNode = null;
      }
    }
  }

  updateConnectionPositions() {
    this.connections.forEach(conn => {
      const fromNode = this.getNodeById(conn.fromId);
      const toNode = this.getNodeById(conn.toId);

      if (fromNode && toNode) {
        conn.fromX = fromNode.x;
        conn.fromY = fromNode.y;
        conn.toX = toNode.x;
        conn.toY = toNode.y;
      }
    });
  }

  private getNodeById(id: string): { x: number; y: number } | null {
    const queue = this.queues.find(q => q.id === id);
    if (queue) return queue;

    // Fix: Machines might be referenced by name (e.g., "M1") or numeric ID
    const machine = this.machines.find(m => m.id === id || m.name === id);
    if (machine) return machine;

    return null;
  }

  // ========== ZOOM & PAN ==========
  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent) {
    event.preventDefault();

    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(0.5, Math.min(2, this.scale + delta));

    this.scale = newScale;
  }

  @HostListener('mousedown', ['$event'])
  onCanvasMouseDown(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('canvas-background')) {
      this.isPanning = true;
      this.lastPanX = event.clientX;
      this.lastPanY = event.clientY;
    }
  }

  @HostListener('mousemove', ['$event'])
  onCanvasMouseMove(event: MouseEvent) {
    if (!this.isPanning) return;

    const dx = event.clientX - this.lastPanX;
    const dy = event.clientY - this.lastPanY;

    this.panX += dx;
    this.panY += dy;

    this.lastPanX = event.clientX;
    this.lastPanY = event.clientY;
  }

  @HostListener('mouseup')
  onCanvasMouseUp() {
    this.isPanning = false;
  }

  handleZoomIn() {
    this.scale = Math.min(2, this.scale + 0.1);
  }

  handleZoomOut() {
    this.scale = Math.max(0.5, this.scale - 0.1);
  }

  handleResetZoom() {
    this.scale = 1;
    this.panX = 0;
    this.panY = 0;
  }

  getCanvasTransform(): string {
    return `scale(${this.scale}) translate(${this.panX}px, ${this.panY}px)`;
  }

  // ========== REAL-TIME UPDATES ==========
  // Add this to simulation-canvas.component.ts
// Replace the subscribeToUpdates() method

  private subscribeToUpdates() {
    // Queue updates subscription
 this.queueUpdateSub = this.wsService.queueUpdates$.subscribe(update => {
    console.log('📦 Received queue update:', update);
    
    const queue = this.queues.find(q => String(q.id) === String(update.queueId));
    if (queue) {
      // Update size
      queue.size = update.currentSize;
      
      // Update product list with actual colors from backend
      queue.productList = update.products || [];
      
      console.log(`📦 Updated ${queue.id}:`, {
        size: queue.size,
        products: queue.productList.length,
        colors: queue.productList.map(p => p.color)
      });
      
      this.cd.detectChanges();
    }
  });

    // Machine updates subscription - THIS IS THE KEY PART
    this.machineUpdateSub = this.wsService.machineUpdates$.subscribe(update => {
      console.log('⚙️ Received machine update:', update);

      // Robust lookup: Match ID or Name, handling type differences
      const targetId = String(update.machineId);
      const machine = this.machines.find(m =>
        String(m.id) === targetId || String(m.name) === targetId
      );

      if (machine) {
        // Update status
        machine.status = update.status as any;

        // Update color based on product or reset to default
        if (update.productColor) {
          machine.color = update.productColor;
        } else {
          machine.color = machine.defaultColor || '#3b82f6';
        }

        // Update ready state based on status
        machine.ready = (update.status === 'idle');

        console.log(`⚙️ Updated ${machine.name}:`, {
          status: machine.status,
          color: machine.color,
          ready: machine.ready
        });

        // 🔑 KEY: Force change detection to update the view immediately
        this.cd.detectChanges();
      } else {
        console.warn(`⚠️ Machine not found for update: ${targetId}`);
      }
    });
  }
  /**
   * Select node for properties panel
   */
  selectNodeForProperties(id: string, type: 'queue' | 'machine') {
    if (type === 'queue') {
      const queue = this.queues.find(q => q.id === id);
      if (queue) {
        this.selectedNodeDetails = { type: 'queue', data: queue };
      }
    } else {
      const machine = this.machines.find(m => m.name === id);
      if (machine) {
        this.selectedNodeDetails = { type: 'machine', data: machine };
      }
    }
  }

  clearSelection() {
    this.selectedNodeDetails = null;
  }

  // updateQueueCapacity() {
  //   if (this.selectedNodeDetails?.type !== 'queue') return;

  //   const queue = this.selectedNodeDetails.data as QueueModel;

  //   this.queueService.updateCapacity(queue.id, this.newCapacity).subscribe({
  //     next: (updatedQueue) => {
  //       queue.capacity = updatedQueue.capacity;
  //       console.log('✅ Queue capacity updated:', queue.id);
  //     },
  //     error: (err) => {
  //       console.error('❌ Failed to update capacity:', err);
  //       alert('Failed to update capacity');
  //     }
  //   });
  // }

  updateMachineServiceTime() {
    if (this.selectedNodeDetails?.type !== 'machine') return;

    const machine = this.selectedNodeDetails.data as MachineModel;
    const timeInMs = this.newServiceTime * 1000;

    this.machineService.updateServiceTime(machine.name, timeInMs).subscribe({
      next: (updatedMachine) => {
        machine.serviceTime = updatedMachine.serviceTime;
        console.log('✅ Machine service time updated:', machine.name);
      },
      error: (err) => {
        console.error('❌ Failed to update service time:', err);
        alert('Failed to update service time');
      }
    });
  }

  deleteSelectedNode() {
    if (!this.selectedNodeDetails) return;

    const confirmDelete = confirm(
      `Are you sure you want to delete this ${this.selectedNodeDetails.type}?`
    );

    if (!confirmDelete) return;

    if (this.selectedNodeDetails.type === 'queue') {
      const queue = this.selectedNodeDetails.data as QueueModel;

      this.queueService.deleteQueue(queue.id).subscribe({
        next: () => {
          this.queues = this.queues.filter(q => q.id !== queue.id);
          // Remove connections associated with this queue
          this.connections = this.connections.filter(c => c.fromId !== queue.id && c.toId !== queue.id);
          
          this.clearSelection();
          console.log('🗑️ Queue deleted:', queue.id);
        },
        error: (err) => {
          console.error('❌ Failed to delete queue:', err);
          alert('Failed to delete queue');
        }
      });
    } else {
      const machine = this.selectedNodeDetails.data as MachineModel;

      this.machineService.deleteMachine(machine.name).subscribe({
        next: () => {
          this.machines = this.machines.filter(m => m.name !== machine.name);
          // Remove connections associated with this machine
          this.connections = this.connections.filter(c => c.fromId !== machine.name && c.toId !== machine.name);
          
          this.clearSelection();
          console.log('🗑️ Machine deleted:', machine.name);
        },
        error: (err) => {
          console.error('❌ Failed to delete machine:', err);
          alert('Failed to delete machine');
        }
      });
    }
  }
}
