export interface Alarm {
  id: string;
  clientId: string;
  name: string;
  time: string;
  enabled: boolean;
  days: number[];
  mediaId: string | null;
  mediaTitle: string | null;
  volume: number;
  fadeIn: boolean;
  fadeDuration: number;
  createdAt: Date;
  updatedAt: Date;
}
