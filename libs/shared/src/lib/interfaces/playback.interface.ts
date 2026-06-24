export interface PlaybackState {
  currentTrack: TrackInfo | null;
  playbackState: 'PLAYING' | 'PAUSED' | 'STOPPED' | 'TRANSITIONING';
  volume: number;
  mute: boolean;
  trackPosition: number;
  trackDuration: number;
}

export interface TrackInfo {
  title: string;
  artist: string;
  album: string;
  albumArtUri: string;
  uri: string;
}

export interface SonosSpeaker {
  uuid: string;
  name: string;
  roomName: string;
}
