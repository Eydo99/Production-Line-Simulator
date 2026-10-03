import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QueueModel } from '../../../services/queue.service';
import { DraggableDirective } from '../../../directives/draggable.directive';
import { SelectableDirective } from '../../../directives/selectable.directive';

@Component({
  selector: 'app-queue-node',
  standalone: true,
  imports: [
    CommonModule,
    DraggableDirective,
    SelectableDirective
  ],
  templateUrl: './queue-node.component.html',
  styleUrls: ['./queue-node.component.css']
})
export class QueueNodeComponent implements OnChanges {
  @Input() queue!: QueueModel;
  @Input() canvasScale = 1;  
  @Input() canvasPanX = 0;   
  @Input() canvasPanY = 0;   
  @Output() moved = new EventEmitter<{ x: number; y: number }>();

  // Maximum products to show as dots (rest shown as "...")
  private readonly MAX_VISIBLE_PRODUCTS = 15;

  ngOnChanges(changes: SimpleChanges) {
    // Debug logging to see when products update
    if (changes['queue'] && this.queue) {
      console.log(`🔍 Queue ${this.queue.id} updated:`, {
        size: this.queue.size,
        productList: this.queue.productList?.length || 0,
        products: this.queue.productList?.map(p => ({ id: p.id, color: p.color }))
      });
    }
  }

  onDragEnd(pos: { x: number; y: number }) {
    this.moved.emit(pos);
  }

  /**
   * Get products to display as visible dots (max 15)
   */
  getVisibleProducts(): Array<{ id: string; color: string }> {
    const allProducts = this.getAllProducts();
    return allProducts.slice(0, this.MAX_VISIBLE_PRODUCTS);
  }

  /**
   * Check if there are more products than can be displayed
   */
  hasMoreProducts(): boolean {
    const allProducts = this.getAllProducts();
    return allProducts.length > this.MAX_VISIBLE_PRODUCTS;
  }

  /**
   * Get count of products not shown as dots
   */
  getRemainingProductsCount(): number {
    const allProducts = this.getAllProducts();
    return Math.max(0, allProducts.length - this.MAX_VISIBLE_PRODUCTS);
  }

  /**
   * Get all products from the queue
   * ONLY use backend products - no fallback generation
   */
  private getAllProducts(): Array<{ id: string; color: string }> {
    if (!this.queue) {
      return [];
    }

    // ONLY use actual products from backend
    if (this.queue.productList && Array.isArray(this.queue.productList)) {
      const products = this.queue.productList.map(p => ({
        id: p.id,
        color: p.color
      }));
      
      console.log(`📦 ${this.queue.id} displaying ${products.length} backend products`);
      return products;
    }

    // If no products available, show empty queue
    console.warn(`⚠️ ${this.queue.id} has size ${this.queue.size} but no productList array`);
    return [];
  }
}