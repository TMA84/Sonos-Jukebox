export interface Client {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientSettings {
  room: string | null;
  sleepTimer: number;
  enableSpeakerSelection: boolean;
  enableAlarmClock: boolean;
  kioskMode: boolean;
  enableContentSearch: boolean;
  autoplayEnabled: boolean;
  repeatEnabled: boolean;
}
