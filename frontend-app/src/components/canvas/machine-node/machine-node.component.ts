import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MachineModel } from '../../../services/machine.service';
import { DraggableDirective } from '../../../directives/draggable.directive';
import { SelectableDirective } from '../../../directives/selectable.directive';

@Component({
  selector: 'app-machine-node',
  standalone: true,
  imports: [
    CommonModule,
    DraggableDirective,
    SelectableDirective
  ],
  templateUrl: './machine-node.component.html',
  styleUrls: ['./machine-node.component.css']
})
export class MachineNodeComponent {

  @Input() machine!: MachineModel;
  @Output() moved = new EventEmitter<{ x: number; y: number }>();

  constructor(private cd: ChangeDetectorRef) {}

  onDragEnd(pos: { x: number; y: number }) {
    this.moved.emit(pos);
  }

  getStatusColor(): string {
    // Use machine.status to determine dot color
    if (this.machine.status === 'processing') {
      return 'bg-blue-500 animate-pulse'; // Processing - pulsing blue
    }
    if (this.machine.status === 'FLASHING') {
      return 'bg-yellow-400 animate-ping'; // Flashing - ping animation
    }
    return 'bg-green-500'; // Idle/Ready
  }

  getStatusText(): string {
    if (this.machine.status === 'FLASHING') {
      return 'Done!';
    }
    return this.machine.status || 'idle';
  }

  /**
   * Get background color based on machine state
   * Reflects the product color when processing
   */
  getMachineColor(): string {
    // Use the color from the machine object (updated by WebSocket)
    return this.machine.color || this.machine.defaultColor || '#3b82f6';
  }

  /**
   * Check if machine is currently processing
   */
  isProcessing(): boolean {
    return this.machine.status === 'processing' || this.machine.status === 'FLASHING';
  }

  /**
   * Get service time in seconds for display
   */
  getServiceTimeSeconds(): number {
    return this.machine.serviceTime / 1000;
  }
}
