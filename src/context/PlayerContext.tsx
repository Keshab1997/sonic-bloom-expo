import React, { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Track, playlist } from "@/data/playlist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import {
  DEFAULT_VOLUME,
  DEFAULT_AUDIO_QUALITY,
  STORAGE_KEY_QUALITY,
  STORAGE_KEY_QUEUE,
} from "@/lib/constants";
import { useMediaSession } from "@/hooks/useMediaSession";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import { audioService, AudioQuality } from "@/service/AudioService";

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
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

  const isSeekingRef = useRef(false);
  const consecutiveErrorsRef = useRef(0);
  const nextClickTimeRef = useRef(0);
  const prevClickTimeRef = useRef(0);
  const isLoadingTrackRef = useRef(false);

  // Use refs for frequently updated values
  const progressRef = useRef(0);
  const durationRef = useRef(0);
  const isPlayingRef = useRef(false);

  // Sync refs with state
  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const { isLiked: isLikedHook, toggleLike: toggleLikeHook } = useLikedSongs();

  const likeSongHook = useCallback(async (track: Track): Promise<boolean> => {
    if (!track || !track.id) return false;
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

  useEffect(() => {
    audioService.initialize().catch(e => console.error('Failed to initialize audio:', e));
    return () => {
      audioService.unload().catch(() => {});
    };
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

  const playSoundRef = useRef<(src: string) => Promise<void>>(async () => {});

  const handleTrackFinish = useCallback(() => {
    if (repeatRef.current === "one") {
      const track = trackListRef.current[currentIndexRef.current];
      if (track) {
        playSoundRef.current(audioService.getAudioUrl(track, qualityRef.current));
      }
      return;
    }
    
    const q = queueRef.current;
    if (q.length > 0) {
      const nt = q[0];
      setQueue(prev => prev.slice(1));
      const ei = trackListRef.current.findIndex(t => t.id === nt.id);
      if (ei !== -1) setCurrentIndex(ei);
      else { setTrackList(prev => [nt, ...prev]); setCurrentIndex(0); }
      playSoundRef.current(audioService.getAudioUrl(nt, qualityRef.current));
      return;
    }
    
    const nextIdx = shuffleRef.current
      ? Math.floor(Math.random() * trackListRef.current.length)
      : (currentIndexRef.current + 1) % trackListRef.current.length;
    setCurrentIndex(nextIdx);
    const nt = trackListRef.current[nextIdx];
    if (nt) {
      playSoundRef.current(audioService.getAudioUrl(nt, qualityRef.current));
    }
  }, []);

  const playSound = useCallback(async (src: string) => {
    try {
      setProgress(0);
      setDuration(0);

      await audioService.load(src, volumeRef.current, playbackSpeedRef.current);
      
      audioService.setStatusCallback((status) => {
        if (!isSeekingRef.current) setProgress(status.position);
        setDuration(status.duration);
        setIsPlaying(status.isPlaying);
        setBuffered(status.buffered);
      });
      
      audioService.setFinishCallback(handleTrackFinish);
      
      await audioService.play();
      setIsPlaying(true);
      consecutiveErrorsRef.current = 0;
    } catch (err: any) {
      const isAudioFocus = err?.message?.includes('AudioFocus') || err?.message?.includes('Audio focus');
      consecutiveErrorsRef.current++;
      console.error(`Playback error (${consecutiveErrorsRef.current}):`, err);

      if (isAudioFocus && consecutiveErrorsRef.current <= 5) {
        console.log('[Player] Audio focus issue, retrying...');
        await new Promise(r => setTimeout(r, 1000 * consecutiveErrorsRef.current));
        playSoundRef.current(src);
        return;
      }

      if (consecutiveErrorsRef.current >= 5) {
        console.error('Too many consecutive errors, stopping playback');
        setIsPlaying(false);
        consecutiveErrorsRef.current = 0;
        return;
      }

      const nextIdx = (currentIndexRef.current + 1) % trackListRef.current.length;
      setCurrentIndex(nextIdx);
      const nt = trackListRef.current[nextIdx];
      if (nt) playSoundRef.current(audioService.getAudioUrl(nt, qualityRef.current));
    }
  }, [handleTrackFinish]);
  playSoundRef.current = playSound;

  const playTrackList = useCallback((tracks: Track[], index?: number) => {
    const idx = index ?? 0;
    const track = tracks[idx];
    if (!track) return;
    
    consecutiveErrorsRef.current = 0;
    audioService.unload().catch(() => {});
    
    setIsPlaying(false);
    setTrackList(tracks);
    setCurrentIndex(idx);
    setProgress(0);
    setDuration(0);
    
    playSoundRef.current(audioService.getAudioUrl(track, qualityRef.current));
  }, []);

  const playTrack = useCallback((track: Track) => {
    const ei = trackListRef.current.findIndex(t => t.id === track.id);
    let newList = trackListRef.current;
    let idx = ei;
    
    if (ei === -1) {
      newList = [track, ...trackListRef.current];
      idx = 0;
    }
    
    consecutiveErrorsRef.current = 0;
    audioService.unload().catch(() => {});
    
    setIsPlaying(false);
    setTrackList(newList);
    setCurrentIndex(idx);
    setProgress(0);
    setDuration(0);
    
    playSoundRef.current(audioService.getAudioUrl(track, qualityRef.current));
  }, []);

  const play = useCallback((index?: number) => {
    const idx = index ?? currentIndexRef.current;
    const track = trackListRef.current[idx];
    if (!track) return;
    
    consecutiveErrorsRef.current = 0;
    if (index !== undefined) {
      setCurrentIndex(index);
    }
    
    audioService.unload().catch(() => {});
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    
    playSoundRef.current(audioService.getAudioUrl(track, qualityRef.current));
  }, []);

  const pause = useCallback(async () => {
    try {
      await audioService.pause();
      setIsPlaying(false);
    } catch (e) {
      console.log('Error pausing audio:', e);
    }
  }, []);

  const lastToggleTimeRef = useRef(0);
  
  const togglePlay = useCallback(() => {
    const now = Date.now();
    if (now - (lastToggleTimeRef.current || 0) < 300) {
      return; // Prevent rapid clicks - debounce 300ms
    }
    lastToggleTimeRef.current = now;
    
    const wasPlaying = isPlayingRef.current;
    setIsPlaying(!wasPlaying);
    if (wasPlaying) {
      audioService.pause().catch(() => {});
    } else {
      audioService.play().catch(() => {});
    }
  }, []);

  const next = useCallback(async () => {
    const now = Date.now();
    if (now - nextClickTimeRef.current < 500 || isLoadingTrackRef.current) return;
    nextClickTimeRef.current = now;
    isLoadingTrackRef.current = true;

    try {
      await audioService.unload();
      setIsPlaying(false);
      setProgress(0);
      setDuration(0);

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
        await playSoundRef.current(audioService.getAudioUrl(track, qualityRef.current));
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
      if (progressRef.current > 3) {
        audioService.seek(0).catch(() => {});
        setProgress(0);
        return;
      }

      await audioService.unload();
      setIsPlaying(false);
      setProgress(0);
      setDuration(0);

      const prevIdx = (currentIndexRef.current - 1 + trackListRef.current.length) % trackListRef.current.length;
      const pt = trackListRef.current[prevIdx];
      if (!pt) return;

      setCurrentIndex(prevIdx);
      await playSoundRef.current(audioService.getAudioUrl(pt, qualityRef.current));
    } finally {
      isLoadingTrackRef.current = false;
    }
  }, []);

  const seek = useCallback((time: number) => {
    setProgress(time);
    audioService.seek(time).catch(() => {});
  }, []);

  const startSeeking = useCallback(() => { isSeekingRef.current = true; }, []);
  const stopSeeking = useCallback(() => { isSeekingRef.current = false; }, []);

  const seekForward = useCallback((seconds: number = 10) => {
    const currentPos = progressRef.current;
    const maxDuration = durationRef.current;
    const newPos = Math.min(currentPos + seconds, maxDuration);
    audioService.seek(newPos).catch(() => {});
    setProgress(newPos);
  }, []);

  const seekBackward = useCallback((seconds: number = 10) => {
    const currentPos = progressRef.current;
    const newPos = Math.max(currentPos - seconds, 0);
    audioService.seek(newPos).catch(() => {});
    setProgress(newPos);
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    audioService.setVolume(v).catch(() => {});
  }, []);

  const setPlaybackSpeed = useCallback((speed: number) => {
    setPlaybackSpeedState(speed);
    audioService.setRate(speed).catch(() => {});
  }, []);

  const setQuality = useCallback((q: AudioQuality) => {
    setQualityState(q);
    qualityRef.current = q;
    AsyncStorage.setItem(STORAGE_KEY_QUALITY, q).catch(() => {});
    // Reload current track at new quality, preserving position
    const track = trackListRef.current[currentIndexRef.current];
    if (track) {
      const currentPos = progressRef.current;
      audioService.unload().catch(() => {});
      setIsPlaying(false);
      setProgress(0);
      setDuration(0);
      playSoundRef.current(audioService.getAudioUrl(track, q)).then(() => {
        if (currentPos > 0) audioService.seek(currentPos).catch(() => {});
      }).catch(() => {});
    }
  }, []);

  const toggleShuffle = useCallback(() => {
    requestAnimationFrame(() => setShuffle(s => !s));
  }, []);
  
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
      await audioService.pause();
      setIsPlaying(false);
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

  const contextValue = useMemo(() => {
    const throttledProgress = Math.floor(progress);
    const throttledDuration = Math.floor(duration);
    
    return {
      tracks: trackList, 
      currentTrack, 
      currentIndex,
      isPlaying,
      progress: throttledProgress,
      duration: throttledDuration,
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
    };
  }, [
    trackList, currentTrack, currentIndex, isPlaying,
    Math.floor(progress), Math.floor(duration), buffered,
    volume, shuffle, repeat, eqBass, eqMid, eqTreble, playbackSpeed, crossfade,
    queue.length, quality, sleepMinutes,
    play, playTrack, playTrackList, pause, togglePlay, next, prev, seek, seekForward, seekBackward, setVolume,
    toggleShuffle, toggleRepeat, startSeeking, stopSeeking, addToQueue, playNext, removeFromQueue, clearQueue,
    moveQueueItem, shuffleQueue, setEqBass, setEqMid, setEqTreble, applyEqPreset,
    setPlaybackSpeed, setCrossfade, setQuality, setSleepTimer, cancelSleepTimer,
    isLikedHook, likeSongHook, unlikeSongHook, addToHistory,
  ]);

  return (
    <PlayerContext.Provider value={contextValue}>
      <MediaSessionWrapper
        track={currentTrack}
        isPlaying={isPlaying}
        onPlay={play}
        onPause={pause}
        onNext={next}
        onPrev={prev}
        onSeek={seek}
      />
      {children}
    </PlayerContext.Provider>
  );
};

const MediaSessionWrapper: React.FC<{
  track: Track | null;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (time: number) => void;
}> = ({ track, isPlaying, onPlay, onPause, onNext, onPrev, onSeek }) => {
  useMediaSession({ track, isPlaying, onPlay, onPause, onNext, onPrev, onSeek });
  return null;
};
