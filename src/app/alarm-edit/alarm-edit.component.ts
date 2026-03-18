import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Alarm } from '../alarm.service';
import { KioskService } from '../kiosk.service';

@Component({
  selector: 'app-alarm-edit',
  templateUrl: './alarm-edit.component.html',
  styleUrls: ['./alarm-edit.component.css'],
})
export class AlarmEditComponent implements OnInit {
  @Input() alarm: Alarm = {
    clientId: '',
    name: '',
    time: '07:00',
    enabled: true,
    days: [],
    volume: 30,
    fadeIn: true,
    fadeDuration: 30,
  };
  @Input() libraryItems: any[] = [];

  selectedHour = '07';
  selectedMinute = '00';
  hours: string[] = [];
  minutes: string[] = [];

  weekDays = [
    { label: 'Sun', value: 0 },
    { label: 'Mon', value: 1 },
    { label: 'Tue', value: 2 },
    { label: 'Wed', value: 3 },
    { label: 'Thu', value: 4 },
    { label: 'Fri', value: 5 },
    { label: 'Sat', value: 6 },
  ];

  constructor(
    private modalController: ModalController,
    public kioskService: KioskService
  ) {}

  ngOnInit() {
    // Build hours 00-23 and minutes in 5-min steps
    this.hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    this.minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

    // Parse existing time
    if (this.alarm.time) {
      const parts = this.alarm.time.split(':');
      this.selectedHour = parts[0] || '07';
      this.selectedMinute = parts[1] || '00';
      // Snap minute to nearest 5
      const m = parseInt(this.selectedMinute, 10);
      this.selectedMinute = String(Math.round(m / 5) * 5).padStart(2, '0');
      if (this.selectedMinute === '60') this.selectedMinute = '55';
    }

    if (!this.alarm.name) {
      this.alarm.name = this.generateAlarmName();
    }
  }

  generateAlarmName(): string {
    const time = this.alarm.time || '07:00';
    const days = this.alarm.days || [];

    if (days.length === 0) {
      return `Alarm ${time}`;
    } else if (days.length === 7) {
      return `Daily ${time}`;
    } else if (days.length === 5 && days.every(d => d >= 1 && d <= 5)) {
      return `Weekdays ${time}`;
    } else if (days.length === 2 && days.includes(0) && days.includes(6)) {
      return `Weekend ${time}`;
    } else {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayStr = days.map(d => dayNames[d]).join(', ');
      return `${dayStr} ${time}`;
    }
  }

  onTimeChange() {
    this.alarm.time = `${this.selectedHour}:${this.selectedMinute}`;
    this.alarm.name = this.generateAlarmName();
  }

  isDaySelected(day: number): boolean {
    return this.alarm.days.includes(day);
  }

  toggleDay(day: number) {
    const index = this.alarm.days.indexOf(day);
    if (index >= 0) {
      this.alarm.days.splice(index, 1);
    } else {
      this.alarm.days.push(day);
    }
    this.alarm.days.sort();
    // Update name when days change
    this.alarm.name = this.generateAlarmName();
  }

  onMediaChange() {
    const selectedItem = this.libraryItems.find(
      item => (item.id || item.title) === this.alarm.mediaId
    );
    if (selectedItem) {
      this.alarm.mediaTitle = `${selectedItem.title} - ${selectedItem.artist}`;
    }
  }

  selectMedia(item: any) {
    this.alarm.mediaId = item.id || item.title;
    this.alarm.mediaTitle = `${item.title} - ${item.artist}`;
  }

  getContentIcon(item: any): string {
    const cat = (item.category || '').toLowerCase();
    const type = (item.type || '').toLowerCase();
    if (cat === 'radio' || type === 'tunein') return 'radio-outline';
    if (cat === 'podcast') return 'mic-outline';
    if (cat === 'audiobook' || cat === 'radioplay') return 'book-outline';
    if (cat === 'playlist') return 'list-outline';
    return 'musical-notes-outline';
  }

  setDayPreset(preset: string) {
    if (preset === 'weekdays') {
      this.alarm.days = [1, 2, 3, 4, 5];
    } else if (preset === 'weekend') {
      this.alarm.days = [0, 6];
    } else if (preset === 'daily') {
      this.alarm.days = [0, 1, 2, 3, 4, 5, 6];
    }
    this.alarm.name = this.generateAlarmName();
  }

  isDayPreset(preset: string): boolean {
    const d = this.alarm.days;
    if (preset === 'weekdays') return d.length === 5 && d.every(v => v >= 1 && v <= 5);
    if (preset === 'weekend') return d.length === 2 && d.includes(0) && d.includes(6);
    if (preset === 'daily') return d.length === 7;
    return false;
  }

  saveAlarm() {
    if (!this.alarm.name) {
      this.alarm.name = this.generateAlarmName();
    }
    this.alarm.enabled = true;
    this.modalController.dismiss(this.alarm);
  }

  closeModal() {
    this.modalController.dismiss();
  }
}
