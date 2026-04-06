import TrackPlayer, { 
  Capability, 
  AppKilledPlaybackBehavior,
} from 'react-native-track-player';
import { Track } from '../data/playlist';

export type AudioQuality = '96kbps' | '160kbps' | '320kbps';

export class AudioService {
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      await TrackPlayer.setupPlayer();
      await TrackPlayer.updateOptions({
        android: {
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
        },
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
        ],
        compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
      });

      this.isInitialized = true;
      console.log('[AudioService] TrackPlayer Initialized');
    } catch (e) {
      console.log('[AudioService] Setup error:', e);
    }
  }

  async playTrack(track: Track, quality: AudioQuality = '160kbps') {
    const url = this.getAudioUrl(track, quality);

    await TrackPlayer.reset();
    await TrackPlayer.add({
      id: String(track.id),
      url,
      title: track.title,
      artist: track.artist,
      artwork: track.cover,
      duration: track.duration,
    });
    await TrackPlayer.play();
  }

  async play() { await TrackPlayer.play(); }
  async pause() { await TrackPlayer.pause(); }
  async seek(position: number) { await TrackPlayer.seekTo(position); }
  async setVolume(volume: number) { await TrackPlayer.setVolume(volume); }
  async setRate(rate: number) { await TrackPlayer.setRate(rate); }
  async unload() { await TrackPlayer.reset(); }

  getAudioUrl(track: Track, quality: AudioQuality): string {
    if (track.audioUrls) {
      return track.audioUrls[quality] || track.audioUrls['160kbps'] || track.src;
    }
    return track.src;
  }
}

export const audioService = new AudioService();
