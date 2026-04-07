import React, { useState, useCallback, memo } from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayer } from '../context/PlayerContext';
import { useLikedSongsContext } from '../context/LikedSongsContext';
import { useDownloadsContext } from '../context/DownloadsContext';
import { FullScreenPlayer } from './FullScreenPlayer';
import { QueueManager } from './QueueManager';
import { CachedImage } from './CachedImage';
import { lightHaptic } from '../lib/haptics';

interface MiniPlayerProps {
  onExpand?: () => void;
  onClose?: () => void;
}

const MiniButton = memo(({ icon, color, onPress, size = 20 }: { icon: string; color: string; onPress: () => void; size?: number }) => (
  <TouchableOpacity style={styles.miniBtn} onPress={onPress} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
    <Ionicons name={icon as any} size={size} color={color} />
  </TouchableOpacity>
));

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ onExpand, onClose }) => {
  const { currentTrack, isPlaying, togglePlay, next, prev, progress, duration, queue, isCurrentTrackLiked, likeCurrentTrack, unlikeCurrentTrack, sleepRemainingSeconds } = usePlayer();
  const { downloadTrack, isDownloaded, isDownloading } = useDownloadsContext();
  const [fsVisible, setFsVisible] = useState(false);
  const [playlistVisible, setPlaylistVisible] = useState(false);

  const handleExpand = useCallback(() => { onExpand?.(); setFsVisible(true); lightHaptic(); }, [onExpand]);
  
  const handleToggleLike = useCallback(() => {
    if (currentTrack) { 
      isCurrentTrackLiked ? unlikeCurrentTrack(String(currentTrack.id)) : likeCurrentTrack(currentTrack);
      lightHaptic(); 
    }
  }, [currentTrack, isCurrentTrackLiked, likeCurrentTrack, unlikeCurrentTrack]);

  const handleDownload = useCallback(() => {
    if (currentTrack?.src) { downloadTrack(currentTrack); lightHaptic(); }
  }, [currentTrack, downloadTrack]);

  const handlePrev = useCallback(() => { prev(); lightHaptic(); }, [prev]);
  const handleTogglePlay = useCallback(() => { togglePlay(); lightHaptic(); }, [togglePlay]);
  const handleNext = useCallback(() => { next(); lightHaptic(); }, [next]);

  if (!currentTrack) return null;

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;
  const trackId = currentTrack?.id ? String(currentTrack.id) : '';
  const downloaded = isDownloaded(trackId || currentTrack.src);
  const downloading = isDownloading(trackId || currentTrack.src);

  return (
    <>
      <View style={styles.miniPlayer}>
        <LinearGradient colors={['rgba(26,26,26,0.98)', 'rgba(20,20,20,0.98)']} style={styles.miniGradient}>
          <View style={styles.miniProgressTrack}>
            <LinearGradient colors={['#1DB954', '#1ed760']} style={[styles.miniProgressFill, { width: `${progressPercent}%` }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
          </View>
          
          <TouchableOpacity style={styles.miniContent} activeOpacity={0.9} onPress={handleExpand}>
            <View style={styles.miniCoverContainer}>
              <CachedImage source={{ uri: currentTrack.cover }} style={styles.miniCover} contentFit="cover" />
              {isPlaying && <View style={styles.playingIndicator} />}
            </View>
            
            <View style={styles.miniInfo}>
              <Text style={styles.miniTitle} numberOfLines={1}>{currentTrack.title}</Text>
              <Text style={styles.miniArtist} numberOfLines={1}>{currentTrack.artist}</Text>
            </View>

            <View style={styles.miniControls}>
              <TouchableOpacity style={styles.miniIconBtn} onPress={handleToggleLike} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={isCurrentTrackLiked ? "heart" : "heart-outline"} size={20} color={isCurrentTrackLiked ? "#ef4444" : "rgba(255,255,255,0.6)"} />
              </TouchableOpacity>

              <MiniButton icon="play-skip-back" color="#fff" onPress={handlePrev} size={24} />
              
              <TouchableOpacity style={styles.miniPlayBtn} onPress={handleTogglePlay} activeOpacity={0.85} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <LinearGradient colors={['#1DB954', '#1ed760']} style={styles.miniPlayGradient}>
                  <Ionicons name={isPlaying ? "pause" : "play"} size={22} color="#fff" style={isPlaying ? undefined : { marginLeft: 2 }} />
                </LinearGradient>
              </TouchableOpacity>
              
              <MiniButton icon="play-skip-forward" color="#fff" onPress={handleNext} size={24} />

              <TouchableOpacity style={styles.miniIconBtn} onPress={() => setPlaylistVisible(true)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="list" size={20} color="rgba(255,255,255,0.6)" />
                {queue.length > 0 && (
                  <View style={styles.queueBadgeMini}>
                    <Text style={styles.queueBadgeTextMini}>{queue.length > 99 ? '99+' : queue.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </LinearGradient>
      </View>
      
      <FullScreenPlayer visible={fsVisible} onClose={() => setFsVisible(false)} />
      <QueueManager visible={playlistVisible} onClose={() => setPlaylistVisible(false)} showPlaylist={true} />
    </>
  );
};

const styles = StyleSheet.create({
  miniPlayer: { position: 'absolute', bottom: 60, left: 8, right: 8, zIndex: 999, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  miniGradient: { width: '100%' },
  miniProgressTrack: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.1)' },
  miniProgressFill: { height: '100%' },
  miniContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  miniCoverContainer: { position: 'relative' },
  miniCover: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#2a2a2a' },
  playingIndicator: { position: 'absolute', bottom: 4, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: '#1DB954' },
  miniInfo: { flex: 1, marginLeft: 12, marginRight: 8 },
  miniTitle: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 2 },
  miniArtist: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  miniControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniIconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  miniBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  miniPlayBtn: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', marginHorizontal: 4 },
  miniPlayGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  queueBadgeMini: { position: 'absolute', top: -4, right: -4, backgroundColor: '#1DB954', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  queueBadgeTextMini: { fontSize: 8, fontWeight: '700', color: '#000' },
});
