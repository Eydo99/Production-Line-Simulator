import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Output,
  OnDestroy,
  Input,
  Renderer2
} from '@angular/core';

@Directive({
  selector: '[appDraggable]',
  standalone: true
})
export class DraggableDirective implements OnDestroy {
  @Output() dragEnd = new EventEmitter<{ x: number; y: number }>();
  @Input() canvasScale = 1;
  @Input() canvasPanX = 0;
  @Input() canvasPanY = 0;

  private dragging = false;
  private startX = 0;
  private startY = 0;
  private initialLeft = 0;
  private initialTop = 0;
  private moveListener?: () => void;
  private upListener?: () => void;
  private touchMoveListener?: () => void;
  private touchEndListener?: () => void;

  constructor(
    private el: ElementRef<HTMLElement>,
    private renderer: Renderer2
  ) {
    this.renderer.setStyle(this.el.nativeElement, 'position', 'absolute');
    this.renderer.setStyle(this.el.nativeElement, 'cursor', 'grab');
    this.renderer.setStyle(this.el.nativeElement, 'touch-action', 'none');
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    this.startDrag(event.clientX, event.clientY);
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    const target = event.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const touch = event.touches[0];
    this.startDrag(touch.clientX, touch.clientY);
  }

  private startDrag(clientX: number, clientY: number) {
    this.dragging = true;
    this.startX = clientX;
    this.startY = clientY;

    // Get current position
    this.initialLeft = this.el.nativeElement.offsetLeft;
    this.initialTop = this.el.nativeElement.offsetTop;

    // Apply dragging styles
    this.renderer.setStyle(this.el.nativeElement, 'cursor', 'grabbing');
    this.renderer.setStyle(this.el.nativeElement, 'user-select', 'none');
    this.renderer.setStyle(this.el.nativeElement, 'z-index', '1000');
    this.renderer.setStyle(this.el.nativeElement, 'transition', 'none');

    // Add listeners
    this.moveListener = this.renderer.listen('document', 'mousemove', (e: MouseEvent) => this.onMouseMove(e));
    this.upListener = this.renderer.listen('document', 'mouseup', () => this.onMouseUp());
    
    this.touchMoveListener = this.renderer.listen('document', 'touchmove', (e: TouchEvent) => {
      if (this.dragging && e.touches.length > 0) {
        e.preventDefault();
        this.onMouseMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY } as MouseEvent);
      }
    });
    
    this.touchEndListener = this.renderer.listen('document', 'touchend', () => this.onMouseUp());
  }

  private onMouseMove(event: MouseEvent) {
    if (!this.dragging) return;

    // Calculate mouse movement compensating for scale
    const dx = (event.clientX - this.startX) / this.canvasScale;
    const dy = (event.clientY - this.startY) / this.canvasScale;

    const newLeft = this.initialLeft + dx;
    const newTop = this.initialTop + dy;

    // DIRECT position update - no transform!
    this.renderer.setStyle(this.el.nativeElement, 'left', `${newLeft}px`);
    this.renderer.setStyle(this.el.nativeElement, 'top', `${newTop}px`);
  }

  private onMouseUp() {
    if (!this.dragging) return;

    this.dragging = false;

    // Reset styles
    this.renderer.setStyle(this.el.nativeElement, 'cursor', 'grab');
    this.renderer.setStyle(this.el.nativeElement, 'user-select', '');
    this.renderer.setStyle(this.el.nativeElement, 'z-index', '');
    this.renderer.removeStyle(this.el.nativeElement, 'transition');

    // Get final position
    const finalLeft = this.el.nativeElement.offsetLeft;
    const finalTop = this.el.nativeElement.offsetTop;

    // Remove listeners
    if (this.moveListener) this.moveListener();
    if (this.upListener) this.upListener();
    if (this.touchMoveListener) this.touchMoveListener();
    if (this.touchEndListener) this.touchEndListener();

    // Emit final position
    this.dragEnd.emit({ x: finalLeft, y: finalTop });
  }

  ngOnDestroy() {
    if (this.moveListener) this.moveListener();
    if (this.upListener) this.upListener();
    if (this.touchMoveListener) this.touchMoveListener();
    if (this.touchEndListener) this.touchEndListener();
  }
}