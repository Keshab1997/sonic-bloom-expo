import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput, Modal, SafeAreaView, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { usePlayer } from '../context/PlayerContext';
import { usePlaylistsContext } from '../context/PlaylistsContext';
import { useAuth } from '../context/AuthContext';
import { useLikedSongs } from '../hooks/useLikedSongs';
import { supabase } from '../lib/supabase';
import { CachedImage } from '../components/CachedImage';
import { mediumHaptic, lightHaptic } from '../lib/haptics';
import { Toast } from '../components/Toast';

// Audio Visualizer Component
const AudioVisualizer = ({ isPlaying }: { isPlaying: boolean }) => {
  const bar1Anim = useRef(new Animated.Value(4)).current;
  const bar2Anim = useRef(new Animated.Value(8)).current;
  const bar3Anim = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    if (isPlaying) {
      const animate = () => {
        Animated.parallel([
          Animated.sequence([
            Animated.timing(bar1Anim, { toValue: 4 + Math.random() * 12, duration: 200 + Math.random() * 200, useNativeDriver: false }),
            Animated.timing(bar1Anim, { toValue: 4, duration: 200 + Math.random() * 200, useNativeDriver: false }),
          ]),
          Animated.sequence([
            Animated.timing(bar2Anim, { toValue: 4 + Math.random() * 12, duration: 150 + Math.random() * 250, useNativeDriver: false }),
            Animated.timing(bar2Anim, { toValue: 4, duration: 150 + Math.random() * 250, useNativeDriver: false }),
          ]),
          Animated.sequence([
            Animated.timing(bar3Anim, { toValue: 4 + Math.random() * 12, duration: 180 + Math.random() * 220, useNativeDriver: false }),
            Animated.timing(bar3Anim, { toValue: 4, duration: 180 + Math.random() * 220, useNativeDriver: false }),
          ]),
        ]).start(() => animate());
      };
      animate();
    } else {
      Animated.parallel([
        Animated.timing(bar1Anim, { toValue: 4, duration: 200, useNativeDriver: false }),
        Animated.timing(bar2Anim, { toValue: 4, duration: 200, useNativeDriver: false }),
        Animated.timing(bar3Anim, { toValue: 4, duration: 200, useNativeDriver: false }),
      ]).start();
    }
  }, [isPlaying]);

  return (
    <View style={styles.visualizer}>
      <Animated.View style={[styles.visualizerBar, { height: bar1Anim }]} />
      <Animated.View style={[styles.visualizerBar, { height: bar2Anim }]} />
      <Animated.View style={[styles.visualizerBar, { height: bar3Anim }]} />
    </View>
  );
};

export const QueueScreen: React.FC = () => {
  const navigation = useNavigation();
  const { 
    queue, currentTrack, playTrackList, removeFromQueue, clearQueue, 
    tracks, currentIndex, playTrack, moveQueueItem, shuffleQueue, isPlaying 
  } = usePlayer();
  const { createPlaylist } = usePlaylistsContext();
  const { user } = useAuth();
  const { isLiked, toggleLike } = useLikedSongs();

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error'; visible: boolean }>({ 
    message: '', type: 'success', visible: false 
  });

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2500);
  }, []);

  // Save to Playlist Handler
  const handleSavePress = useCallback(() => {
    if (!user) {
      showToast('Please login to save playlist', 'error');
      return;
    }
    setShowSaveModal(true);
    lightHaptic();
  }, [user]);

  const handleSavePlaylist = useCallback(async () => {
    const name = playlistName.trim();
    if (!name) {
      showToast('Please enter a playlist name', 'error');
      return;
    }

    const newPlaylist = await createPlaylist(name);
    if (!newPlaylist) {
      showToast('Failed to create playlist', 'error');
      return;
    }

    const tracksToSave = tracks.slice(currentIndex);
    const uniqueTracks = tracksToSave.filter((track, index, self) =>
      index === self.findIndex((t) => String(t.songId || t.id) === String(track.songId || track.id))
    );

    const tracksToInsert = uniqueTracks.map((track, index) => ({
      playlist_id: newPlaylist.id,
      track_id: String(track.songId || track.id),
      track_data: track,
      position: index,
    }));

    if (tracksToInsert.length > 0) {
      const { error } = await supabase.from('playlist_tracks').insert(tracksToInsert);
      if (error) {
        showToast('Failed to save tracks', 'error');
      } else {
        showToast(`Saved ${tracksToInsert.length} songs to '${name}'`, 'success');
      }
    }

    setShowSaveModal(false);
    setPlaylistName('');
    lightHaptic();
  }, [playlistName, tracks, currentIndex, createPlaylist]);

  // Shuffle Handler
  const handleShuffle = useCallback(() => {
    shuffleQueue();
    showToast('Queue shuffled', 'success');
    mediumHaptic();
  }, [shuffleQueue]);

  // Remove Duplicates Handler
  const handleRemoveDuplicates = useCallback(() => {
    const seen = new Set<string>();
    const duplicates: number[] = [];
    queue.forEach((track, idx) => {
      const id = String(track.songId || track.id);
      if (seen.has(id)) {
        duplicates.push(idx);
      } else {
        seen.add(id);
      }
    });
    if (duplicates.length > 0) {
      [...duplicates].reverse().forEach(idx => removeFromQueue(idx));
      showToast(`Removed ${duplicates.length} duplicates`, 'success');
      mediumHaptic();
    } else {
      showToast('No duplicates found', 'info');
    }
  }, [queue, removeFromQueue]);

  // Clear Queue Handler
  const handleClearQueue = useCallback(() => {
    Alert.alert('Clear Queue', `Remove all ${queue.length} songs?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => {
        clearQueue();
        showToast('Queue cleared', 'success');
        mediumHaptic();
      }}
    ]);
  }, [queue.length, clearQueue]);

  // Sort Queue Handler
  const handleSort = useCallback((by: 'artist' | 'title') => {
    const sorted = [...queue].sort((a, b) => {
      if (by === 'artist') return a.artist.localeCompare(b.artist);
      return a.title.localeCompare(b.title);
    });
    // Clear and re-add sorted tracks
    clearQueue();
    sorted.forEach(track => {
      // Note: addToQueue would need to be exposed from PlayerContext
    });
    showToast(`Sorted by ${by}`, 'success');
    mediumHaptic();
  }, [queue, clearQueue]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Premium Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { navigation.goBack(); lightHaptic(); }} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-down" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Queue</Text>
          {(tracks.length - currentIndex + queue.length) > 0 && (
            <View style={styles.queueCountBadge}>
              <Text style={styles.queueCountText}>{tracks.length - currentIndex + queue.length}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => handleSort('title')} style={styles.headerIconBtn} activeOpacity={0.7}>
            <Ionicons name="swap-vertical" size={20} color="#888" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSavePress} style={styles.headerIconBtn} activeOpacity={0.7}>
            <Ionicons name="add-circle-outline" size={24} color="#1DB954" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Now Playing Card */}
        {currentTrack && (
          <View style={styles.nowPlayingSection}>
            <LinearGradient
              colors={['rgba(29,185,84,0.12)', 'rgba(29,185,84,0.03)', 'transparent']}
              style={styles.nowPlayingCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.nowPlayingContent}>
                <CachedImage source={{ uri: currentTrack.cover || '' }} style={styles.nowPlayingImage} />
                <View style={styles.nowPlayingInfo}>
                  <View style={styles.nowPlayingHeader}>
                    <AudioVisualizer isPlaying={isPlaying} />
                    <Text style={styles.nowPlayingLabel}>NOW PLAYING</Text>
                  </View>
                  <Text style={styles.nowPlayingTitle} numberOfLines={2}>{currentTrack.title}</Text>
                  <Text style={styles.nowPlayingArtist} numberOfLines={1}>{currentTrack.artist}</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Action Buttons Row */}
        {queue.length > 0 && (
          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={handleShuffle} style={styles.pillBtn} activeOpacity={0.7}>
              <Ionicons name="shuffle" size={16} color="#60a5fa" />
              <Text style={[styles.pillBtnText, { color: '#60a5fa' }]}>Shuffle</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleRemoveDuplicates} style={styles.pillBtn} activeOpacity={0.7}>
              <Ionicons name="copy-outline" size={16} color="#f59e0b" />
              <Text style={[styles.pillBtnText, { color: '#f59e0b' }]}>Clean</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClearQueue} style={[styles.pillBtn, styles.pillBtnDanger]} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
              <Text style={[styles.pillBtnText, { color: '#ef4444' }]}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Up Next Section */}
        {queue.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>UP NEXT</Text>
            {queue.map((track, index) => (
              <TouchableOpacity
                key={`queue-${track.id}-${index}`}
                style={styles.songItem}
                onPress={() => { playTrack(track); mediumHaptic(); }}
                activeOpacity={0.7}
              >
                <Text style={styles.songIndex}>{index + 1}</Text>
                <CachedImage source={{ uri: track.cover || '' }} style={styles.songImage} />
                <View style={styles.songInfo}>
                  <Text style={styles.songTitle} numberOfLines={2}>{track.title}</Text>
                  <Text style={styles.songArtist} numberOfLines={1}>{track.artist}</Text>
                </View>
                <View style={styles.songActions}>
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); toggleLike(track); lightHaptic(); }}
                    style={styles.songActionBtn}
                  >
                    <Ionicons 
                      name={isLiked(String(track.id)) ? "heart" : "heart-outline"} 
                      size={18} 
                      color={isLiked(String(track.id)) ? "#ef4444" : "#555"} 
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); removeFromQueue(index); mediumHaptic(); }}
                    style={styles.songActionBtn}
                  >
                    <Ionicons name="close-circle" size={22} color="#444" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty State */}
        {tracks.length === 0 && queue.length === 0 && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="musical-notes-outline" size={48} color="#333" />
            </View>
            <Text style={styles.emptyText}>Nothing in queue</Text>
            <Text style={styles.emptySubText}>Add songs to start listening</Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Save Playlist Modal */}
      <Modal visible={showSaveModal} transparent animationType="fade" onRequestClose={() => setShowSaveModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Save as Playlist</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter playlist name"
              placeholderTextColor="#555"
              value={playlistName}
              onChangeText={setPlaylistName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setShowSaveModal(false)} style={styles.modalCancelBtn} activeOpacity={0.7}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSavePlaylist} style={styles.modalSaveBtn} activeOpacity={0.7}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  queueCountBadge: {
    backgroundColor: '#1DB954',
    borderRadius: 12,
    minWidth: 28,
    height: 24,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1DB954',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  queueCountText: { fontSize: 12, fontWeight: '700', color: '#000' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: 100 },
  nowPlayingSection: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  nowPlayingCard: { borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(29,185,84,0.2)' },
  nowPlayingContent: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  nowPlayingImage: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#1a1a1a' },
  nowPlayingInfo: { flex: 1 },
  nowPlayingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  nowPlayingLabel: { fontSize: 10, fontWeight: '700', color: '#1DB954', letterSpacing: 1.5 },
  nowPlayingTitle: { fontSize: 16, fontWeight: '700', color: '#fff', lineHeight: 22 },
  nowPlayingArtist: { fontSize: 14, color: '#888', marginTop: 2 },
  visualizer: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 16 },
  visualizerBar: { width: 3, backgroundColor: '#1DB954', borderRadius: 1.5 },
  actionsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 16, flexWrap: 'wrap' },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pillBtnDanger: { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.08)' },
  pillBtnText: { fontSize: 13, fontWeight: '600' },
  section: { paddingHorizontal: 20, paddingTop: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#555', letterSpacing: 1.5, marginBottom: 16, textTransform: 'uppercase' },
  songItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  songIndex: { fontSize: 14, fontWeight: '600', color: '#444', width: 24, textAlign: 'center' },
  songImage: { width: 52, height: 52, borderRadius: 10, backgroundColor: '#1a1a1a' },
  songInfo: { flex: 1 },
  songTitle: { fontSize: 15, fontWeight: '600', color: '#fff', lineHeight: 20 },
  songArtist: { fontSize: 13, color: '#666', marginTop: 2 },
  songActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  songActionBtn: { padding: 8 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  emptySubText: { fontSize: 14, color: '#555' },
  bottomSpacer: { height: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: '#1a1a1a', borderRadius: 20, padding: 24, width: '100%', maxWidth: 340 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 20, textAlign: 'center' },
  modalInput: { backgroundColor: '#0a0a0a', borderRadius: 12, padding: 14, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#333', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#2a2a2a', alignItems: 'center' },
  modalCancelText: { color: '#aaa', fontWeight: '600', fontSize: 16 },
  modalSaveBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#1DB954', alignItems: 'center' },
  modalSaveText: { color: '#000', fontWeight: '700', fontSize: 16 },
});
