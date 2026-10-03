import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-zoom-controls',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
      <button
        (click)="zoomIn.emit()"
        class="w-10 h-10 bg-white rounded-lg shadow-md hover:shadow-lg
               flex items-center justify-center transition-all
               border border-slate-200 hover:border-primary"
        title="Zoom In">
        <span class="material-symbols-outlined text-slate-600">add</span>
      </button>
      
      <button
        (click)="zoomOut.emit()"
        class="w-10 h-10 bg-white rounded-lg shadow-md hover:shadow-lg
               flex items-center justify-center transition-all
               border border-slate-200 hover:border-primary"
        title="Zoom Out">
        <span class="material-symbols-outlined text-slate-600">remove</span>
      </button>
      
      <button
        (click)="resetZoom.emit()"
        class="w-10 h-10 bg-white rounded-lg shadow-md hover:shadow-lg
               flex items-center justify-center transition-all
               border border-slate-200 hover:border-primary"
        title="Reset View">
        <span class="material-symbols-outlined text-slate-600">center_focus_strong</span>
      </button>
    </div>
  `
})
export class ZoomControlsComponent {
  @Output() zoomIn = new EventEmitter<void>();
  @Output() zoomOut = new EventEmitter<void>();
  @Output() resetZoom = new EventEmitter<void>();
}