import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-virtual-keyboard',
  templateUrl: './virtual-keyboard.component.html',
  styleUrls: ['./virtual-keyboard.component.scss']
})
export class VirtualKeyboardComponent {
  @Input() isVisible = false;
  @Output() keyPress = new EventEmitter<string>();
  @Output() backspace = new EventEmitter<void>();
  @Output() tab = new EventEmitter<void>();
  @Output() hide = new EventEmitter<void>();

  isUpperCase = false;
  currentLayout = 'letters';

  letterRows = [
    ['q', 'w', 'e', 'r', 't', 'z', 'u', 'i', 'o', 'p', 'ü'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ö', 'ä'],
    ['y', 'x', 'c', 'v', 'b', 'n', 'm', 'ß']
  ];

  numberRows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['-', '/', ':', ';', '(', ')', '€', '&', '@', '"'],
    ['.', ',', '?', '!', "'", '"', '+', '*', '=']
  ];

  symbolRows = [
    ['[', ']', '{', '}', '#', '%', '^', '*', '+', '='],
    ['_', '\\', '|', '~', '<', '>', '$', '£', '¥', '•'],
    ['.', ',', '?', '!', "'", '"', '`', '´', '§']
  ];

  onKeyPress(key: string) {
    if (this.isUpperCase && this.currentLayout === 'letters') {
      key = key.toUpperCase();
    }
    this.keyPress.emit(key);
  }

  onBackspace() {
    this.backspace.emit();
  }

  onSpace() {
    this.keyPress.emit(' ');
  }

  onTab() {
    this.tab.emit();
  }

  toggleCase() {
    this.isUpperCase = !this.isUpperCase;
  }

  switchLayout(layout: string) {
    this.currentLayout = layout;
  }

  onHide() {
    this.hide.emit();
  }

  getCurrentRows() {
    switch (this.currentLayout) {
      case 'numbers': return this.numberRows;
      case 'symbols': return this.symbolRows;
      default: return this.letterRows;
    }
  }
}