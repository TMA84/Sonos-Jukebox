import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Alarm } from '../alarm.service';

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

  alarmTime: string = '';

  weekDays = [
    { label: 'Sun', value: 0 },
    { label: 'Mon', value: 1 },
    { label: 'Tue', value: 2 },
    { label: 'Wed', value: 3 },
    { label: 'Thu', value: 4 },
    { label: 'Fri', value: 5 },
    { label: 'Sat', value: 6 },
  ];

  constructor(private modalController: ModalController) {}

  ngOnInit() {
    // Convert time to ISO format for ion-datetime
    const today = new Date().toISOString().split('T')[0];
    this.alarmTime = `${today}T${this.alarm.time}:00`;

    // Auto-generate name if empty
    if (!this.alarm.name) {
      this.alarm.name = this.generateAlarmName();
    }

    console.log('AlarmEditComponent initialized');
    console.log('Library items:', this.libraryItems);
    console.log('Alarm:', this.alarm);
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
    // Extract HH:mm from ISO datetime
    if (this.alarmTime) {
      const time = new Date(this.alarmTime);
      this.alarm.time = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
      // Update name if it was auto-generated
      if (
        !this.alarm.name ||
        this.alarm.name.includes(this.alarm.time) ||
        this.alarm.name.startsWith('Alarm') ||
        this.alarm.name.startsWith('Daily') ||
        this.alarm.name.startsWith('Weekdays') ||
        this.alarm.name.startsWith('Weekend')
      ) {
        this.alarm.name = this.generateAlarmName();
      }
    }
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

  saveAlarm() {
    // Ensure name is set
    if (!this.alarm.name) {
      this.alarm.name = this.generateAlarmName();
    }
    this.modalController.dismiss(this.alarm);
  }

  closeModal() {
    this.modalController.dismiss();
  }
}
