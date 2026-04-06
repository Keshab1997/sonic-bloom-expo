import React, { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from "react";
import TrackPlayer, {
  usePlaybackState,
  useProgress,
  State,
  Event,
  useTrackPlayerEvents,
} from "react-native-track-player";
import { Track, playlist } from "@/data/playlist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import {
  DEFAULT_VOLUME,
  DEFAULT_AUDIO_QUALITY,
  STORAGE_KEY_QUALITY,
  STORAGE_KEY_QUEUE,
} from "@/lib/constants";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import { audioService, AudioQuality } from "@/service/AudioService";
import { VolumeManager } from "react-native-volume-manager";

interface PlayerContextType {
  tracks: Track[];
  currentTrack: Track | null;
  currentIndex: number;
  isPlaying: boolean;
  progress: number;
  duration: number;
  buffered: number;
  volume: number;
  shuffle: boolean;
  repeat: "off" | "all" | "one";
  eqBass: number; eqMid: number; eqTreble: number;
  setEqBass: (v: number) => void;
  setEqMid: (v: number) => void;
  setEqTreble: (v: number) => void;
  applyEqPreset: (preset: string) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (v: number) => void;
  crossfade: number;
  setCrossfade: (v: number) => void;
  queue: Track[];
  addToQueue: (track: Track) => void;
  playNext: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  moveQueueItem: (from: number, to: number) => void;
  shuffleQueue: () => void;
  quality: AudioQuality;
  setQuality: (q: AudioQuality) => void;
  sleepMinutes: number | null;
  setSleepTimer: (minutes: number) => void;
  cancelSleepTimer: () => void;
  isCurrentTrackLiked: boolean;
  likeCurrentTrack: (track: Track) => Promise<boolean>;
  unlikeCurrentTrack: (trackId: string) => Promise<boolean>;
  addToListeningHistory: (trackId: string, durationPlayed: number, completed: boolean) => Promise<boolean>;
  play: (index?: number) => void;
  playTrack: (track: Track) => void;
  playTrackList: (tracks: Track[], index?: number) => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
  seekForward: (seconds?: number) => void;
  seekBackward: (seconds?: number) => void;
  setVolume: (v: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  startSeeking: () => void;
  stopSeeking: () => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
};

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [trackList, setTrackList] = useState<Track[]>(playlist);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<"off" | "all" | "one">("off");
  const [queue, setQueue] = useState<Track[]>([]);
  const [quality, setQualityState] = useState<AudioQuality>(DEFAULT_AUDIO_QUALITY);
  const [sleepMinutes, setSleepMinutesState] = useState<number | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [eqBass, setEqBassState] = useState(0);
  const [eqMid, setEqMidState] = useState(0);
  const [eqTreble, setEqTrebleState] = useState(0);
  const [playbackSpeed, setPlaybackSpeedState] = useState(1.0);
  const [crossfade, setCrossfadeState] = useState(0);

  // TrackPlayer hooks — single source of truth for playback state
  const playbackState = usePlaybackState();
  const { position, duration, buffered } = useProgress(500);
  const isPlaying = playbackState.state === State.Playing;

  const isSeekingRef = useRef(false);
  const nextClickTimeRef = useRef(0);
  const prevClickTimeRef = useRef(0);
  const isLoadingTrackRef = useRef(false);
  const lastToggleTimeRef = useRef(0);

  const trackListRef = useRef(trackList);
  const currentIndexRef = useRef(currentIndex);
  const queueRef = useRef(queue);
  const shuffleRef = useRef(shuffle);
  const repeatRef = useRef(repeat);
  const qualityRef = useRef(quality);
  const volumeRef = useRef(volume);
  const playbackSpeedRef = useRef(playbackSpeed);

  useEffect(() => { trackListRef.current = trackList; }, [trackList]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);
  useEffect(() => { repeatRef.current = repeat; }, [repeat]);
  useEffect(() => { qualityRef.current = quality; }, [quality]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { playbackSpeedRef.current = playbackSpeed; }, [playbackSpeed]);

  const { isLiked: isLikedHook, toggleLike: toggleLikeHook } = useLikedSongs();

  const likeSongHook = useCallback(async (track: Track): Promise<boolean> => {
    if (!track?.id) return false;
    await toggleLikeHook(track);
    return true;
  }, [toggleLikeHook]);

  const unlikeSongHook = useCallback(async (trackId: string): Promise<boolean> => {
    if (!trackId) return false;
    const track = trackListRef.current.find(t => String(t.id) === trackId);
    if (track) await toggleLikeHook(track);
    return true;
  }, [toggleLikeHook]);

  const addToHistory = useCallback(async (trackId: string, durationPlayed: number, completed: boolean): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("listening_history").insert({ track_id: trackId, user_id: user.id, duration_played: durationPlayed, completed });
      }
    } catch (err) {
      console.error('addToHistory error:', err);
    }
    return true;
  }, []);

  useEffect(() => {
    audioService.initialize().catch(e => console.error('Failed to initialize audio:', e));
    return () => { audioService.unload().catch(() => {}); };
  }, []);

  useEffect(() => {
    VolumeManager.getVolume().then((result) => {
      const v = typeof result === 'number' ? result : (result as any).volume ?? DEFAULT_VOLUME;
      setVolumeState(v);
      TrackPlayer.setVolume(v).catch(() => {});
    }).catch(() => {});

    const sub = VolumeManager.addVolumeListener((result) => {
      const v = typeof result.volume === 'number' ? result.volume : DEFAULT_VOLUME;
      setVolumeState(v);
      TrackPlayer.setVolume(v).catch(() => {});
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_QUEUE).then(s => { if (s) setQueue(JSON.parse(s)); }).catch(() => {});
    AsyncStorage.getItem(STORAGE_KEY_QUALITY).then(s => {
      if (s && ["96kbps", "160kbps", "320kbps"].includes(s)) setQualityState(s as AudioQuality);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(queue)).catch(() => {});
  }, [queue]);

  // গান শেষ হলে অটো-নেক্সট
  useTrackPlayerEvents([Event.PlaybackQueueEnded], () => {
    if (repeatRef.current === "one") {
      const track = trackListRef.current[currentIndexRef.current];
      if (track) audioService.playTrack(track, qualityRef.current).catch(() => {});
      return;
    }

    const q = queueRef.current;
    if (q.length > 0) {
      const nt = q[0];
      setQueue(prev => prev.slice(1));
      const ei = trackListRef.current.findIndex(t => t.id === nt.id);
      if (ei !== -1) { setCurrentIndex(ei); audioService.playTrack(trackListRef.current[ei], qualityRef.current).catch(() => {}); }
      else { setTrackList(prev => [nt, ...prev]); setCurrentIndex(0); audioService.playTrack(nt, qualityRef.current).catch(() => {}); }
      return;
    }

    const nextIdx = shuffleRef.current
      ? Math.floor(Math.random() * trackListRef.current.length)
      : (currentIndexRef.current + 1) % trackListRef.current.length;
    const nt = trackListRef.current[nextIdx];
    if (nt) { setCurrentIndex(nextIdx); audioService.playTrack(nt, qualityRef.current).catch(() => {}); }
  });

  const playTrackList = useCallback((tracks: Track[], index: number = 0) => {
    const track = tracks[index];
    if (!track) return;
    setTrackList(tracks);
    setCurrentIndex(index);
    audioService.playTrack(track, qualityRef.current).catch(() => {});
  }, []);

  const playTrack = useCallback((track: Track) => {
    const ei = trackListRef.current.findIndex(t => t.id === track.id);
    if (ei !== -1) {
      setCurrentIndex(ei);
    } else {
      setTrackList(prev => [track, ...prev]);
      setCurrentIndex(0);
    }
    audioService.playTrack(track, qualityRef.current).catch(() => {});
  }, []);

  const play = useCallback((index?: number) => {
    const idx = index ?? currentIndexRef.current;
    const track = trackListRef.current[idx];
    if (!track) return;
    if (index !== undefined) setCurrentIndex(index);
    audioService.playTrack(track, qualityRef.current).catch(() => {});
  }, []);

  const pause = useCallback(async () => {
    await TrackPlayer.pause();
  }, []);

  const togglePlay = useCallback(() => {
    const now = Date.now();
    if (now - lastToggleTimeRef.current < 300) return;
    lastToggleTimeRef.current = now;
    if (isPlaying) {
      TrackPlayer.pause().catch(() => {});
    } else {
      TrackPlayer.play().catch(() => {});
    }
  }, [isPlaying]);

  const next = useCallback(async () => {
    const now = Date.now();
    if (now - nextClickTimeRef.current < 500 || isLoadingTrackRef.current) return;
    nextClickTimeRef.current = now;
    isLoadingTrackRef.current = true;

    try {
      const q = queueRef.current;
      let track: Track | undefined;
      let idx: number;

      if (q.length > 0) {
        track = q[0];
        setQueue(prev => prev.slice(1));
        const ei = trackListRef.current.findIndex(t => t.id === track!.id);
        if (ei !== -1) { idx = ei; }
        else { setTrackList(prev => [track!, ...prev]); idx = 0; }
      } else {
        idx = shuffleRef.current
          ? Math.floor(Math.random() * trackListRef.current.length)
          : (currentIndexRef.current + 1) % trackListRef.current.length;
        track = trackListRef.current[idx];
      }

      if (track) {
        setCurrentIndex(idx!);
        await audioService.playTrack(track, qualityRef.current);
      }
    } finally {
      isLoadingTrackRef.current = false;
    }
  }, []);

  const prev = useCallback(async () => {
    const now = Date.now();
    if (now - prevClickTimeRef.current < 500 || isLoadingTrackRef.current) return;
    prevClickTimeRef.current = now;
    isLoadingTrackRef.current = true;

    try {
      if (position > 3) {
        await TrackPlayer.seekTo(0);
        return;
      }
      const prevIdx = (currentIndexRef.current - 1 + trackListRef.current.length) % trackListRef.current.length;
      const pt = trackListRef.current[prevIdx];
      if (!pt) return;
      setCurrentIndex(prevIdx);
      await audioService.playTrack(pt, qualityRef.current);
    } finally {
      isLoadingTrackRef.current = false;
    }
  }, [position]);

  const seek = useCallback((time: number) => {
    TrackPlayer.seekTo(time).catch(() => {});
  }, []);

  const startSeeking = useCallback(() => { isSeekingRef.current = true; }, []);
  const stopSeeking = useCallback(() => { isSeekingRef.current = false; }, []);

  const seekForward = useCallback((seconds: number = 10) => {
    TrackPlayer.seekTo(Math.min(position + seconds, duration)).catch(() => {});
  }, [position, duration]);

  const seekBackward = useCallback((seconds: number = 10) => {
    TrackPlayer.seekTo(Math.max(position - seconds, 0)).catch(() => {});
  }, [position]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    TrackPlayer.setVolume(v).catch(() => {});
    VolumeManager.setVolume(v).catch(() => {});
  }, []);

  const setPlaybackSpeed = useCallback((speed: number) => {
    setPlaybackSpeedState(speed);
    TrackPlayer.setRate(speed).catch(() => {});
  }, []);

  const setQuality = useCallback((q: AudioQuality) => {
    setQualityState(q);
    qualityRef.current = q;
    AsyncStorage.setItem(STORAGE_KEY_QUALITY, q).catch(() => {});
    const track = trackListRef.current[currentIndexRef.current];
    if (track) {
      const currentPos = position;
      audioService.playTrack(track, q).then(() => {
        if (currentPos > 0) TrackPlayer.seekTo(currentPos).catch(() => {});
      }).catch(() => {});
    }
  }, [position]);

  const toggleShuffle = useCallback(() => { requestAnimationFrame(() => setShuffle(s => !s)); }, []);
  const toggleRepeat = useCallback(() => {
    requestAnimationFrame(() => setRepeat(r => r === "off" ? "all" : r === "all" ? "one" : "off"));
  }, []);

  const addToQueue = useCallback((track: Track) => setQueue(prev => [...prev, track]), []);
  const playNext = useCallback((track: Track) => setQueue(prev => [track, ...prev]), []);
  const removeFromQueue = useCallback((index: number) => setQueue(prev => prev.filter((_, i) => i !== index)), []);
  const clearQueue = useCallback(() => setQueue([]), []);
  const moveQueueItem = useCallback((from: number, to: number) => {
    setQueue(prev => { const a = [...prev]; const [item] = a.splice(from, 1); a.splice(to, 0, item); return a; });
  }, []);
  const shuffleQueue = useCallback(() => setQueue(prev => [...prev].sort(() => Math.random() - 0.5)), []);

  const setEqBass = useCallback((v: number) => setEqBassState(v), []);
  const setEqMid = useCallback((v: number) => setEqMidState(v), []);
  const setEqTreble = useCallback((v: number) => setEqTrebleState(v), []);
  const applyEqPreset = useCallback((preset: string) => {
    const presets: Record<string, [number, number, number]> = {
      flat: [0,0,0], rock: [4,-1,3], pop: [-1,3,1], bass: [6,0,-2], vocal: [-2,4,2], treble: [-3,0,5], electronic: [3,-1,4],
    };
    const [b, m, t] = presets[preset] || presets.flat;
    setEqBassState(b); setEqMidState(m); setEqTrebleState(t);
  }, []);
  const setCrossfade = useCallback((v: number) => setCrossfadeState(v), []);

  const setSleepTimer = useCallback((minutes: number) => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    setSleepMinutesState(minutes);
    sleepTimerRef.current = setTimeout(async () => {
      await TrackPlayer.pause();
      setSleepMinutesState(null);
    }, minutes * 60 * 1000);
  }, []);

  const cancelSleepTimer = useCallback(() => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    sleepTimerRef.current = null;
    setSleepMinutesState(null);
  }, []);

  useEffect(() => () => { if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current); }, []);

  const currentTrack = trackList[currentIndex] || null;

  const contextValue = useMemo(() => ({
    tracks: trackList,
    currentTrack,
    currentIndex,
    isPlaying,
    progress: Math.floor(position),
    duration: Math.floor(duration),
    buffered,
    volume, shuffle, repeat, eqBass, eqMid, eqTreble,
    setEqBass, setEqMid, setEqTreble, applyEqPreset,
    playbackSpeed, setPlaybackSpeed, crossfade, setCrossfade,
    queue, addToQueue, playNext, removeFromQueue, clearQueue, moveQueueItem, shuffleQueue,
    quality, setQuality, sleepMinutes, setSleepTimer, cancelSleepTimer,
    play, playTrack, playTrackList, pause, togglePlay, next, prev, seek, seekForward, seekBackward, setVolume,
    toggleShuffle, toggleRepeat, startSeeking, stopSeeking,
    isCurrentTrackLiked: currentTrack?.id ? isLikedHook(String(currentTrack.id)) : false,
    likeCurrentTrack: likeSongHook,
    unlikeCurrentTrack: unlikeSongHook,
    addToListeningHistory: addToHistory,
  }), [
    trackList, currentTrack, currentIndex, isPlaying,
    position, duration, buffered,
    volume, shuffle, repeat, eqBass, eqMid, eqTreble, playbackSpeed, crossfade,
    queue, quality, sleepMinutes,
    play, playTrack, playTrackList, pause, togglePlay, next, prev, seek, seekForward, seekBackward, setVolume,
    toggleShuffle, toggleRepeat, startSeeking, stopSeeking, addToQueue, playNext, removeFromQueue, clearQueue,
    moveQueueItem, shuffleQueue, setEqBass, setEqMid, setEqTreble, applyEqPreset,
    setPlaybackSpeed, setCrossfade, setQuality, setSleepTimer, cancelSleepTimer,
    isLikedHook, likeSongHook, unlikeSongHook, addToHistory,
  ]);

  return (
    <PlayerContext.Provider value={contextValue}>
      {children}
    </PlayerContext.Provider>
  );
};
