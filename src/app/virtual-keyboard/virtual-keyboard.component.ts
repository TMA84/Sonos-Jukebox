import { Component, EventEmitter, Output, Input } from '@angular/core';

@Component({
  selector: 'app-virtual-keyboard',
  templateUrl: './virtual-keyboard.component.html',
  styleUrls: ['./virtual-keyboard.component.scss'],
})
export class VirtualKeyboardComponent {
  @Input() isVisible = false;
  @Output() keyPress = new EventEmitter<string>();
  @Output() backspace = new EventEmitter<void>();
  @Output() tab = new EventEmitter<void>();
  @Output() hide = new EventEmitter<void>();

  onKeyPress(key: string) {
    this.keyPress.emit(key);
  }

  onBackspace() {
    this.backspace.emit();
  }

  onTab() {
    this.tab.emit();
  }

  onHide() {
    this.hide.emit();
  }
}
