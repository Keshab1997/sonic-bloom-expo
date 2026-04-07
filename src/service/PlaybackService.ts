import TrackPlayer, { Event, State } from 'react-native-track-player';

export const PlaybackService = async function () {
  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    const state = await TrackPlayer.getState();
    if (state !== State.Playing) {
      await TrackPlayer.play();
    }
  });
  
  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    const state = await TrackPlayer.getState();
    if (state === State.Playing) {
      await TrackPlayer.pause();
    }
  });
  
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
  TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
  
  TrackPlayer.addEventListener(Event.RemoteSeek, async (event) => {
    try {
      const position = event.position;
      if (typeof position === 'number' && position >= 0) {
        await TrackPlayer.seekTo(position);
      }
    } catch (e) {
      console.error('[PlaybackService] RemoteSeek error:', e);
    }
  });
  
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
  TrackPlayer.addEventListener(Event.RemoteDuck, async (event) => {
    if (event.permanent) {
      await TrackPlayer.stop();
    } else {
      if (event.paused) {
        await TrackPlayer.pause();
      } else {
        await TrackPlayer.play();
      }
    }
  });
};