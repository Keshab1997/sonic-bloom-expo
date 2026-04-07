import React, { useRef, useCallback, useState, useMemo, memo, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Modal,
  Dimensions, PanResponder, Animated, StyleSheet,
  Vibration, Alert, TextInput, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { useDownloadsContext } from '../context/DownloadsContext';
import { usePlaylistsContext } from '../context/PlaylistsContext';
import { supabase } from '../lib/supabase';
import { QueueManager } from './QueueManager';
import { SleepTimerSheet } from './SleepTimerSheet';
import { PlaybackSettingsSheet } from './PlaybackSettingsSheet';
import { EqualizerPanel } from './EqualizerPanel';
import { CachedImage } from './CachedImage';

const { width, height } = Dimensions.get('window');

const formatTime = (s: number) => {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

// ProgressBar: captures pageX on grant; moveX gives accurate screen-absolute drag
const ProgressBar = memo(({ progress, duration, buffered, onSeek, onStartSeeking, onStopSeeking }: {
  progress: number; duration: number; buffered: number;
  onSeek: (t: number) => void;
  onStartSeeking: () => void;
  onStopSeeking: () => void;
}) => {
  const [localProgress, setLocalProgress] = useState(progress);
  const isMoving = useRef(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const barRef = useRef<View>(null);
  const barPageX = useRef(0);
  const barWidth = useRef(width - 48);
  const barStartX = useRef(0);

  useEffect(() => {
    if (!isMoving.current) setLocalProgress(progress);
  }, [progress]);

  const progressPercent = duration > 0 ? (localProgress / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? Math.min((buffered / duration) * 100, 100) : 0;

  const toTime = (screenX: number) => {
    const rel = Math.max(0, Math.min(screenX - barPageX.current, barWidth.current));
    return (rel / barWidth.current) * duration;
  };

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderGrant: (e) => {
      isMoving.current = true;
      onStartSeeking();
      setShowTooltip(true);
      Vibration.vibrate(10);
      const touchX = e.nativeEvent?.pageX;
      barRef.current?.measure((_x, _y, w, _h, pageX) => {
        barPageX.current = pageX;
        barWidth.current = w;
        if (touchX != null) {
          barStartX.current = touchX - pageX;
          setLocalProgress(toTime(touchX));
        }
      });
    },
    onPanResponderMove: (_, g) => {
      setLocalProgress(toTime(barPageX.current + barStartX.current + g.dx));
    },
    onPanResponderRelease: (_, g) => {
      const finalTime = toTime(g.moveX);
      onSeek(finalTime);
      onStopSeeking();
      isMoving.current = false;
      setTimeout(() => setShowTooltip(false), 500);
    },
  })).current;

  return (
    <View style={styles.progressSection}>
      {showTooltip && (
        <View style={[styles.timeTooltip, { left: `${Math.min(progressPercent, 95)}%` }]}>
          <Text style={styles.timeTooltipText}>{formatTime(localProgress)}</Text>
        </View>
      )}
      <View ref={barRef} style={styles.progressTrack} {...panResponder.panHandlers}>
        <View style={[styles.bufferedFill, { width: `${bufferedPercent}%` }]} />
        <LinearGradient
          colors={['#1DB954', '#1ed760']}
          style={[styles.progressFill, { width: `${progressPercent}%` }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        />
        <View style={[styles.progressThumb, { left: `${progressPercent}%` }]}>
          <View style={styles.progressThumbInner} />
        </View>
      </View>
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatTime(localProgress)}</Text>
        <Text style={styles.timeText}>-{formatTime(Math.max(0, duration - localProgress))}</Text>
      </View>
    </View>
  );
}, (prev, next) =>
  Math.floor(prev.progress) === Math.floor(next.progress) &&
  Math.floor(prev.duration) === Math.floor(next.duration) &&
  Math.floor(prev.buffered) === Math.floor(next.buffered) &&
  prev.onStartSeeking === next.onStartSeeking
);

// VolumeSlider: Optimized for smooth dragging
const VolumeSlider = memo(({ volume, setVolume }: { volume: number; setVolume: (v: number) => void }) => {
  const [localVol, setLocalVol] = useState(volume);
  const isDragging = useRef(false);
  const barRef = useRef<View>(null);
  const barLayout = useRef({ x: 0, width: 1 });

  useEffect(() => {
    if (!isDragging.current) setLocalVol(volume);
  }, [volume]);

  const handleLayout = useCallback(() => {
    barRef.current?.measure((_x, _y, w, _h, pageX) => {
      barLayout.current = { x: pageX, width: w };
    });
  }, []);

  const toVol = useCallback((touchX: number) => {
    const rel = touchX - barLayout.current.x;
    return Math.max(0, Math.min(1, rel / barLayout.current.width));
  }, []);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      isDragging.current = true;
      Vibration.vibrate(5);
      const v = toVol(e.nativeEvent.pageX);
      setLocalVol(v);
      setVolume(v);
    },
    onPanResponderMove: (e) => {
      const v = toVol(e.nativeEvent.pageX);
      setLocalVol(v);
      setVolume(v);
    },
    onPanResponderRelease: () => {
      isDragging.current = false;
    },
  })).current;

  return (
    <View style={styles.volumeContainer}>
      <TouchableOpacity onPress={() => { const v = 0; setLocalVol(v); setVolume(v); Vibration.vibrate(5); }} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.volumeIconBtn}>
        <Ionicons name={localVol === 0 ? 'volume-mute' : localVol < 0.5 ? 'volume-low' : 'volume-high'} size={20} color="rgba(255,255,255,0.6)" />
      </TouchableOpacity>
      <View ref={barRef} onLayout={handleLayout} style={styles.volumeTrackNew} {...panResponder.panHandlers}>
        <LinearGradient colors={['#1DB954', '#1ed760']} style={[styles.volumeFillNew, { width: `${localVol * 100}%` }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
        <View style={[styles.volumeThumbNew, { left: `${localVol * 100}%` }]}>
          <View style={styles.volumeThumbInner} />
        </View>
      </View>
      <TouchableOpacity onPress={() => { const v = 1; setLocalVol(v); setVolume(v); Vibration.vibrate(5); }} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.volumeIconBtn}>
        <Ionicons name="volume-high" size={20} color="rgba(255,255,255,0.6)" />
      </TouchableOpacity>
    </View>
  );
});

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const FullScreenPlayer: React.FC<Props> = memo(({ visible, onClose }) => {
  const {
    currentTrack, isPlaying, progress, duration, buffered,
    shuffle, repeat, togglePlay, next, prev, seek,
    toggleShuffle, toggleRepeat, volume, setVolume,
    isCurrentTrackLiked, likeCurrentTrack, unlikeCurrentTrack,
    queue, sleepMinutes, sleepRemainingSeconds, playbackSpeed, quality, tracks,
    seekForward, seekBackward, startSeeking, stopSeeking,
    eqBass, eqMid, eqTreble,
  } = usePlayer();

  const { user } = useAuth();
  const { downloadTrack, isDownloaded, isDownloading } = useDownloadsContext();
  const { createPlaylist } = usePlaylistsContext();

  const [queueVisible, setQueueVisible] = useState(false);
  const [sleepVisible, setSleepVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [eqVisible, setEqVisible] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [playlistNameInput, setPlaylistNameInput] = useState('');

  const handleDownload = useCallback(() => {
    if (currentTrack?.src) downloadTrack(currentTrack);
  }, [currentTrack, downloadTrack]);

  const handleAddToPlaylist = useCallback(() => {
    if (!user) { Alert.alert('Login Required', 'Please login to add to playlist'); return; }
    if (!currentTrack) return;
    setShowPlaylistModal(true);
  }, [user, currentTrack]);

  const handleSavePlaylist = useCallback(async () => {
    const playlistName = playlistNameInput.trim();
    if (!playlistName) { Alert.alert('Error', 'Please enter a playlist name'); return; }
    setShowPlaylistModal(false);
    setPlaylistNameInput('');

    const allTracks = currentTrack
      ? (queue.length > 0 ? [...queue, currentTrack] : [currentTrack])
      : queue;

    const newPlaylist = await createPlaylist(playlistName);
    if (newPlaylist && currentTrack) {
      const seen = new Set<string>();
      const uniqueTracks: NonNullable<typeof currentTrack>[] = [];
      for (const track of allTracks) {
        if (track?.id && !seen.has(String(track.id))) {
          seen.add(String(track.id));
          uniqueTracks.push(track);
        }
      }
      const tracksToInsert = uniqueTracks.map((track, index) => ({
        playlist_id: newPlaylist.id,
        track_id: String(track.id),
        track_data: track,
        position: index,
      }));
      if (tracksToInsert.length > 0) {
        await supabase.from('playlist_tracks').upsert(tracksToInsert, { onConflict: 'playlist_id,track_id' });
        Alert.alert('Success', `Added ${tracksToInsert.length} songs to '${playlistName}'`);
      } else {
        Alert.alert('Error', 'No valid tracks to add');
      }
    } else {
      Alert.alert('Error', 'Failed to create playlist');
    }
  }, [playlistNameInput, queue, currentTrack, createPlaylist]);

  const translateY = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => g.dy > 5 && Math.abs(g.dy) > Math.abs(g.dx),
    onMoveShouldSetPanResponderCapture: (_, g) => g.dy > 5 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderMove: (_, g) => { if (g.dy > 0) translateY.setValue(g.dy); },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 80) {
        Animated.timing(translateY, { toValue: height, duration: 200, useNativeDriver: true }).start(onClose);
      } else {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      }
    },
  })).current;

  const handleModalShow = useCallback(() => translateY.setValue(0), [translateY]);

  const HeaderSection = useMemo(() => {
    const trackCount = tracks.length > 99 ? '99+' : String(tracks.length);
    return (
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.headerBtn} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-down" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerLabel}>NOW PLAYING</Text>
        <TouchableOpacity onPress={() => setQueueVisible(true)} style={styles.headerBtn} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <View>
            <Ionicons name="list" size={22} color="rgba(255,255,255,0.7)" />
            {tracks.length > 0 && (
              <View style={styles.queueBadge}>
                <Text style={styles.queueBadgeText}>{trackCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  }, [onClose, tracks.length]);

  const ArtSection = useMemo(() => (
    <View style={styles.artContainer}>
      <CachedImage
        source={{ uri: currentTrack?.cover || '' }}
        style={styles.albumArt}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    </View>
  ), [currentTrack?.cover]);

  const TrackInfo = useMemo(() => (
    <View style={styles.infoRow}>
      <View style={styles.infoText}>
        <Text style={styles.trackTitle} numberOfLines={1}>{currentTrack?.title}</Text>
        {currentTrack?.album && (
          <Text style={styles.trackAlbum} numberOfLines={1}>{currentTrack.album}</Text>
        )}
        <Text style={styles.trackArtist} numberOfLines={1}>{currentTrack?.artist}</Text>
      </View>
      <TouchableOpacity
        onPress={() => isCurrentTrackLiked ? unlikeCurrentTrack(String(currentTrack?.id)) : likeCurrentTrack(currentTrack!)}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.likeBtn}
      >
        <Ionicons name={isCurrentTrackLiked ? 'heart' : 'heart-outline'} size={26} color={isCurrentTrackLiked ? '#ef4444' : 'rgba(255,255,255,0.5)'} />
      </TouchableOpacity>
    </View>
  ), [currentTrack?.title, currentTrack?.artist, currentTrack?.id, isCurrentTrackLiked, likeCurrentTrack, unlikeCurrentTrack]);

  if (!currentTrack) return null;

  const trackId = currentTrack.id ? String(currentTrack.id) : '';
  const downloaded = isDownloaded(trackId || currentTrack.src);
  const downloading = isDownloading(trackId || currentTrack.src);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent onShow={handleModalShow} onRequestClose={onClose}>
      <Animated.View style={[styles.container, { transform: [{ translateY }] }]} {...panResponder.panHandlers}>
        <CachedImage source={{ uri: currentTrack.cover }} style={styles.bgImage} contentFit="cover" />
        <View style={styles.bgOverlay} />

        {HeaderSection}
        {ArtSection}
        {TrackInfo}

        <ProgressBar progress={progress} duration={duration} buffered={buffered} onSeek={seek} onStartSeeking={startSeeking} onStopSeeking={stopSeeking} />

        <View style={styles.mainControlsSection}>
          <TouchableOpacity onPress={() => seekBackward(10)} activeOpacity={0.6} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.mainTrackBtn}>
            <Ionicons name="play-back" size={28} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity onPress={prev} activeOpacity={0.6} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.mainTrackBtn}>
            <Ionicons name="play-skip-back" size={28} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity onPress={togglePlay} activeOpacity={0.85} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.mainPlayBtn}>
            <LinearGradient colors={['#1DB954', '#1ed760']} style={styles.mainPlayBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color="#fff" style={isPlaying ? undefined : { marginLeft: 3 }} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={next} activeOpacity={0.6} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.mainTrackBtn}>
            <Ionicons name="play-skip-forward" size={28} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => seekForward(30)} activeOpacity={0.6} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.mainTrackBtn}>
            <Ionicons name="play-forward" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.secondaryControlsSection}>
          <TouchableOpacity onPress={toggleShuffle} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={[styles.mainControlBtn, shuffle && styles.mainControlBtnActive]}>
            <Ionicons name="shuffle" size={18} color={shuffle ? '#1ed760' : 'rgba(255,255,255,0.5)'} />
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleRepeat} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={[styles.mainControlBtn, repeat !== 'off' && styles.mainControlBtnActive]}>
            <Ionicons name={repeat === 'one' ? 'repeat' : 'repeat'} size={18} color={repeat !== 'off' ? '#1ed760' : 'rgba(255,255,255,0.5)'} />
            {repeat === 'one' && <View style={styles.mainRepeatOneDot}><Text style={styles.mainRepeatOneText}>1</Text></View>}
          </TouchableOpacity>
        </View>

        <VolumeSlider volume={volume} setVolume={setVolume} />

        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.toolbarIconBtn} onPress={handleAddToPlaylist} activeOpacity={0.7}>
            <Ionicons name="add-circle-outline" size={22} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarIconBtn} onPress={handleDownload} activeOpacity={0.7}>
            <Ionicons name={downloaded ? 'checkmark-circle' : downloading ? 'cloud-download-outline' : 'download-outline'} size={22} color={downloaded ? '#1DB954' : downloading ? '#fbbf24' : 'rgba(255,255,255,0.6)'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarIconBtn} onPress={() => setSleepVisible(true)} activeOpacity={0.7}>
            <Ionicons name="moon" size={22} color={sleepMinutes !== null ? '#a78bfa' : 'rgba(255,255,255,0.6)'} />
            {sleepRemainingSeconds !== null && sleepRemainingSeconds > 0 && (
              <View style={styles.sleepBadge}>
                <Text style={styles.sleepBadgeText}>{Math.floor(sleepRemainingSeconds / 60)}:{String(sleepRemainingSeconds % 60).padStart(2, '0')}</Text>
              </View>
            )}
            {sleepRemainingSeconds === -1 && (
              <View style={styles.sleepBadge}>
                <Ionicons name="musical-note" size={10} color="#000" />
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarIconBtn} onPress={() => setSettingsVisible(true)} activeOpacity={0.7}>
            <Ionicons name="speedometer-outline" size={22} color={playbackSpeed !== 1 ? '#60a5fa' : 'rgba(255,255,255,0.6)'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarIconBtn} onPress={() => setEqVisible(true)} activeOpacity={0.7}>
            <Ionicons name="options-outline" size={22} color={eqBass !== 0 || eqMid !== 0 || eqTreble !== 0 ? '#1DB954' : 'rgba(255,255,255,0.6)'} />
          </TouchableOpacity>
        </View>

        <View style={styles.dragHandle} />

        <QueueManager visible={queueVisible} onClose={() => setQueueVisible(false)} showPlaylist={true} />
        <SleepTimerSheet visible={sleepVisible} onClose={() => setSleepVisible(false)} />
        <PlaybackSettingsSheet visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
        <EqualizerPanel visible={eqVisible} onClose={() => setEqVisible(false)} />

        {showPlaylistModal && (
          <View style={styles.playlistModalOverlay}>
            <View style={styles.playlistModalContent}>
              <Text style={styles.playlistModalTitle}>Save Playlist</Text>
              <TextInput
                style={styles.playlistModalInput}
                placeholder="Enter playlist name"
                placeholderTextColor="#555"
                value={playlistNameInput}
                onChangeText={setPlaylistNameInput}
                autoFocus
              />
              <View style={styles.playlistModalButtons}>
                <TouchableOpacity style={styles.playlistModalCancelBtn} onPress={() => { setShowPlaylistModal(false); setPlaylistNameInput(''); }} activeOpacity={0.7}>
                  <Text style={styles.playlistModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.playlistModalSaveBtn} onPress={handleSavePlaylist} activeOpacity={0.7}>
                  <Text style={styles.playlistModalSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  bgImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.72)' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 48, paddingBottom: 6 },
  headerBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  headerLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '700', letterSpacing: 2 },
  queueBadge: { position: 'absolute', top: -3, right: -3, backgroundColor: '#1DB954', borderRadius: 8, minWidth: 16, height: 16, paddingHorizontal: 3, justifyContent: 'center', alignItems: 'center' },
  queueBadgeText: { fontSize: 8, color: '#000', fontWeight: '700', textAlign: 'center' },
  artContainer: { alignItems: 'center', paddingVertical: 16 },
  albumArt: { width: width - 100, height: width - 100, borderRadius: 16, backgroundColor: '#1a1a1a', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
  infoText: { flex: 1 },
  trackTitle: { fontSize: 20, color: '#fff', fontWeight: '700', letterSpacing: 0.2 },
  trackAlbum: { fontSize: 12, color: '#1DB954', marginTop: 2, fontWeight: '500' },
  trackArtist: { fontSize: 14, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  likeBtn: { padding: 6 },
  progressSection: { paddingHorizontal: 24, marginBottom: 16, position: 'relative' },
  timeTooltip: { position: 'absolute', top: -30, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, transform: [{ translateX: -20 }], zIndex: 10 },
  timeTooltipText: { fontSize: 12, fontWeight: '600', color: '#000' },
  progressTrack: { height: 20, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, position: 'relative', justifyContent: 'center' },
  progressTrackInner: { position: 'absolute', left: 0, right: 0, height: 6, borderRadius: 3 },
  progressFill: { position: 'absolute', left: 0, top: 7, bottom: 7, borderRadius: 3 },
  bufferedFill: { position: 'absolute', left: 0, top: 7, bottom: 7, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  progressThumb: { position: 'absolute', top: 1, width: 18, height: 18, backgroundColor: '#fff', borderRadius: 9, marginLeft: -9, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 4 },
  progressThumbInner: { width: 8, height: 8, backgroundColor: '#1DB954', borderRadius: 4, position: 'absolute', top: 5, left: 5 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  timeText: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  mainControlsSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 12, paddingHorizontal: 20 },
  secondaryControlsSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 16, paddingHorizontal: 20 },
  mainControlBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.07)', justifyContent: 'center', alignItems: 'center' },
  mainControlBtnActive: { backgroundColor: 'rgba(30,215,96,0.15)' },
  mainTrackBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  mainPlayBtn: { width: 72, height: 72, borderRadius: 36, overflow: 'hidden', shadowColor: '#1DB954', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 8 },
  mainPlayBtnGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  mainRepeatOneDot: { position: 'absolute', top: 8, right: 8, width: 10, height: 10, backgroundColor: '#1ed760', borderRadius: 5, justifyContent: 'center', alignItems: 'center' },
  mainRepeatOneText: { fontSize: 7, color: '#000', fontWeight: '800' },
  volumeContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, gap: 12, marginBottom: 10 },
  volumeIconBtn: { padding: 6 },
  volumeTrackNew: { flex: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, position: 'relative', justifyContent: 'center' },
  volumeFillNew: { position: 'absolute', left: 0, top: 7, bottom: 7, borderRadius: 3 },
  volumeThumbNew: { position: 'absolute', top: 1, width: 18, height: 18, backgroundColor: '#fff', borderRadius: 9, marginLeft: -9, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 4 },
  volumeThumbInner: { width: 8, height: 8, backgroundColor: '#1DB954', borderRadius: 4, position: 'absolute', top: 5, left: 5 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20, paddingVertical: 8 },
  toolbarIconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  sleepBadge: { position: 'absolute', top: -6, right: -6, backgroundColor: '#a78bfa', borderRadius: 10, paddingHorizontal: 5, paddingVertical: 2, minWidth: 32 },
  sleepBadgeText: { fontSize: 9, color: '#000', fontWeight: '700', textAlign: 'center' },
  dragHandle: { width: 36, height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 8 },
  playlistModalOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  playlistModalContent: { backgroundColor: '#1a1a1a', borderRadius: 20, padding: 24, width: '100%', maxWidth: 320 },
  playlistModalTitle: { fontSize: 20, color: '#fff', fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  playlistModalInput: { backgroundColor: '#2a2a2a', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#fff', fontSize: 16, marginBottom: 20 },
  playlistModalButtons: { flexDirection: 'row', gap: 12 },
  playlistModalCancelBtn: { flex: 1, backgroundColor: '#2a2a2a', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  playlistModalCancelText: { fontSize: 16, color: '#888', fontWeight: '600' },
  playlistModalSaveBtn: { flex: 1, backgroundColor: '#1DB954', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  playlistModalSaveText: { fontSize: 16, color: '#fff', fontWeight: '600' },
});
