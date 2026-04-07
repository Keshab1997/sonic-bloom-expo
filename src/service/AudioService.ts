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
      // Check if already set up
      try {
        const state = await TrackPlayer.getState();
        if (state) {
          this.isInitialized = true;
          console.log('[AudioService] TrackPlayer already initialized');
          return;
        }
      } catch (e) {
        // Not initialized yet, continue with setup
        console.log('[AudioService] TrackPlayer not initialized, setting up...');
      }
      
      // Set up TrackPlayer
      try {
        await TrackPlayer.setupPlayer({
          waitForBuffer: true,
        });
      } catch (setupError) {
        // If already initialized, this might throw, which is fine
        console.log('[AudioService] setupPlayer caught (might be already initialized):', setupError);
      }
      
      await TrackPlayer.updateOptions({
        android: {
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
          // Add notification icon if available, or use default
          // notificationIcon: 'ic_launcher' 
        },
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
          Capability.Stop,
        ],
        compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext, Capability.SkipToPrevious],
        notificationCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
        ],
        progressUpdateEventInterval: 2,
      });

      this.isInitialized = true;
      console.log('[AudioService] TrackPlayer Initialized Successfully');
    } catch (globalError) {
      console.error('[AudioService] Critical setup error:', globalError);
      // Ensure we mark as initialized so we don't keep trying and crashing
      this.isInitialized = true;
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

  async playQueue(tracks: Track[], startIndex: number = 0, quality: AudioQuality = '160kbps') {
    await TrackPlayer.reset();
    
    const queueItems = tracks.slice(startIndex).map((track, index) => ({
      id: `${track.id}_${index}`,
      url: this.getAudioUrl(track, quality),
      title: track.title,
      artist: track.artist,
      artwork: track.cover,
      duration: track.duration,
    }));
    
    await TrackPlayer.add(queueItems);
    await TrackPlayer.play();
  }

  async updateQueue(tracks: Track[], quality: AudioQuality = '160kbps') {
    const queueItems = tracks.map((track, index) => ({
      id: `${track.id}_${index}`,
      url: this.getAudioUrl(track, quality),
      title: track.title,
      artist: track.artist,
      artwork: track.cover,
      duration: track.duration,
    }));
    
    await TrackPlayer.reset();
    await TrackPlayer.add(queueItems);
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
