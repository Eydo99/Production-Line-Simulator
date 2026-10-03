import { Directive, HostBinding, HostListener } from '@angular/core';

@Directive({
  selector: '[appSelectable]',
  standalone: true
})
export class SelectableDirective {

  @HostBinding('class.selected') selected = false;

  @HostListener('click')
  select() {
    this.selected = true;
  }
}
