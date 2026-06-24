import { Injectable, Logger } from '@nestjs/common';
import { TuneInStation } from '@sonos-jukebox/shared';

interface OpmlStation {
  guideId?: string;
  text?: string;
  subtext?: string;
  image?: string;
  URL?: string;
  bitrate?: string;
}

interface OpmlResponse {
  body?: Array<{
    children?: Array<{
      children?: OpmlStation[];
    }>;
  }>;
}

@Injectable()
export class TuneInService {
  private readonly logger = new Logger(TuneInService.name);
  private readonly opmlBase = 'http://opml.radiotime.com';

  async search(query: string): Promise<TuneInStation[]> {
    try {
      const url = `${this.opmlBase}/Search.ashx?query=${encodeURIComponent(query)}&formats=json&type=station&render=json`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`TuneIn search failed: ${response.status}`);
      }

      const data = (await response.json()) as OpmlResponse;
      const stations: OpmlStation[] = data.body?.[0]?.children?.[0]?.children ?? [];

      return stations
        .filter((s) => s.guideId)
        .map(
          (s): TuneInStation => ({
            id: s.guideId!,
            name: s.text ?? '',
            genre: s.subtext ?? null,
            imageUrl: s.image ?? null,
            streamUri: s.URL ?? null,
            bitrate: s.bitrate ?? null,
          }),
        );
    } catch (error) {
      this.logger.error(`TuneIn search failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getStreamUri(stationId: string): Promise<string | null> {
    try {
      const url = `${this.opmlBase}/Tune.ashx?id=${encodeURIComponent(stationId)}&render=json`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`TuneIn stream lookup failed: ${response.status}`);
      }

      const data = (await response.json()) as OpmlResponse;
      const entry = data.body?.[0]?.children?.[0]?.children?.[0] as OpmlStation | undefined;
      return entry?.URL ?? null;
    } catch (error) {
      this.logger.error(`Failed to get stream URI for station "${stationId}": ${(error as Error).message}`);
      return null;
    }
  }
}
