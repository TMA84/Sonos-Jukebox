import { Component, EventEmitter, Output, Input } from '@angular/core';

@Component({
  selector: 'app-virtual-keyboard',
  templateUrl: './virtual-keyboard.component.html',
  styleUrls: ['./virtual-keyboard.component.scss']
})
export class VirtualKeyboardComponent {
  @Input() isVisible = false;
  @Output() keyPress = new EventEmitter<string>();
}
