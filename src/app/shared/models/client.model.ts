export interface Client {
  id: string;
  name: string;
  room: string;
  enableSpeakerSelection: boolean;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
