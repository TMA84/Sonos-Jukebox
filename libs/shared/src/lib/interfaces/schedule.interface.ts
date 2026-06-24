import { MediaCategory } from '../enums/media-category.enum';

export interface Schedule {
  id: string;
  clientId: string;
  category: MediaCategory;
  startTime: string;
  endTime: string;
  days: number[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
