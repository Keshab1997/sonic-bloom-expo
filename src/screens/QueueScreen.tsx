import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Alert, TextInput, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { usePlayer } from '../context/PlayerContext';
import { usePlaylistsContext } from '../context/PlaylistsContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { CachedImage } from '../components/CachedImage';
import { mediumHaptic, lightHaptic } from '../lib/haptics';

export const QueueScreen: React.FC = () => {
  const navigation = useNavigation();
  const { queue, currentTrack, playTrackList, removeFromQueue, clearQueue, tracks, currentIndex } = usePlayer();
  const { createPlaylist } = usePlaylistsContext();
  const { user } = useAuth();

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [saveMode, setSaveMode] = useState<'playlist' | 'queue'>('playlist');

  const handleSavePress = (mode: 'playlist' | 'queue') => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to save playlist');
      return;
    }
    setSaveMode(mode);
    setShowSaveModal(true);
  };

  const handleSavePlaylist = async () => {
    const name = playlistName.trim();
    if (!name) {
      Alert.alert('Error', 'Please enter a playlist name');
      return;
    }

    const newPlaylist = await createPlaylist(name);
    if (!newPlaylist) {
      Alert.alert('Error', 'Failed to create playlist');
      return;
    }

    let tracksToSave: typeof tracks = [];
    if (saveMode === 'playlist') {
      tracksToSave = tracks.slice(currentIndex);
    } else {
      tracksToSave = [...queue];
    }

    const uniqueTracks = tracksToSave.filter((track, index, self) =>
      index === self.findIndex((t) => String(t.id) === String(track.id))
    );

    const tracksToInsert = uniqueTracks.map((track, index) => ({
      playlist_id: newPlaylist.id,
      track_id: String(track.id),
      track_data: track,
      position: index,
    }));

    if (tracksToInsert.length > 0) {
      await supabase.from('playlist_tracks').upsert(tracksToInsert, { onConflict: 'playlist_id,track_id' });
      Alert.alert('Success', `Saved ${tracksToInsert.length} songs to '${name}'`);
    }

    setShowSaveModal(false);
    setPlaylistName('');
    lightHaptic();
  };

  const handleReorderPress = (fromIndex: number) => {
    lightHaptic();
    Alert.alert(
      'Reorder',
      'Choose action',
      [
        { text: 'Move Up', onPress: () => {
          if (fromIndex > currentIndex) {
            const newTracks = [...tracks];
            [newTracks[fromIndex], newTracks[fromIndex - 1]] = [newTracks[fromIndex - 1], newTracks[fromIndex]];
            playTrackList(newTracks, currentIndex);
            mediumHaptic();
          }
        }},
        { text: 'Move Down', onPress: () => {
          if (fromIndex < tracks.length - 1) {
            const newTracks = [...tracks];
            [newTracks[fromIndex], newTracks[fromIndex + 1]] = [newTracks[fromIndex + 1], newTracks[fromIndex]];
            playTrackList(newTracks, currentIndex);
            mediumHaptic();
          }
        }},
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-down" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Queue</Text>
          {queue.length + (tracks.length - currentIndex) > 0 && (
            <View style={styles.queueCountBadge}>
              <Text style={styles.queueCountText}>{queue.length + (tracks.length - currentIndex)}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => handleSavePress('playlist')}
            style={styles.headerBtn}
            activeOpacity={0.7}
            disabled={tracks.length - currentIndex === 0}
          >
            <Ionicons name="musical-notes" size={22} color={tracks.length - currentIndex > 0 ? '#1DB954' : '#444'} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleSavePress('queue')}
            style={styles.headerBtn}
            activeOpacity={0.7}
            disabled={queue.length === 0}
          >
            <Ionicons name="download-outline" size={22} color={queue.length > 0 ? '#60a5fa' : '#444'} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              clearQueue();
              mediumHaptic();
            }}
            style={styles.clearBtn}
            activeOpacity={0.7}
            disabled={queue.length === 0}
          >
            <Text style={[styles.clearBtnText, queue.length === 0 && styles.clearBtnDisabled]}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Current Playlist */}
        {tracks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Current Playlist ({tracks.length - currentIndex} {tracks.length - currentIndex === 1 ? 'song' : 'songs'})
              </Text>
            </View>
            {tracks.slice(currentIndex).map((track, index) => {
              const isCurrent = index === 0;
              const absoluteIndex = currentIndex + index;
              return (
                <TouchableOpacity
                  key={`playlist-${track.id}-${index}`}
                  style={[styles.queueItem, isCurrent && styles.queueItemActive]}
                  onPress={() => {
                    playTrackList(tracks, absoluteIndex);
                    mediumHaptic();
                  }}
                  onLongPress={() => handleReorderPress(absoluteIndex)}
                  activeOpacity={0.7}
                >
                  <View style={styles.queueItemLeft}>
                    <Text style={[styles.queueIndex, isCurrent && styles.queueIndexActive]}>{absoluteIndex + 1}</Text>
                    <CachedImage
                      source={{ uri: track.cover || '' }}
                      style={styles.queueImage}
                      defaultSource={require('../../assets/icon.png')}
                    />
                    <View style={styles.queueInfo}>
                      <Text style={[styles.queueTitle, isCurrent && styles.queueTitleActive]} numberOfLines={1}>
                        {track.title}
                      </Text>
                      {track.album && (
                        <Text style={styles.queueAlbum} numberOfLines={1}>{track.album}</Text>
                      )}
                      <Text style={styles.queueArtist} numberOfLines={1}>
                        {track.artist}
                      </Text>
                    </View>
                  </View>
                  {isCurrent && <Ionicons name="musical-notes" size={20} color="#1DB954" />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Next in Queue */}
        {queue.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Up Next ({queue.length} {queue.length === 1 ? 'song' : 'songs'})
              </Text>
              <TouchableOpacity
                onPress={() => {
                  const queueCopy = [...queue];
                  clearQueue();
                  playTrackList(queueCopy, 0);
                  mediumHaptic();
                }}
                style={styles.playAllBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="play" size={16} color="#1DB954" />
                <Text style={styles.playAllText}>Play All</Text>
              </TouchableOpacity>
            </View>
            {queue.map((track, index) => {
              const isCurrentTrack = track.id === currentTrack?.id;
              if (isCurrentTrack) return null;

              return (
                <TouchableOpacity
                  key={`queue-${track.id}-${index}`}
                  style={styles.queueItem}
                  onPress={() => {
                    const queueCopy = [...queue];
                    clearQueue();
                    playTrackList(queueCopy, index);
                    mediumHaptic();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.queueItemLeft}>
                    <Text style={styles.queueIndex}>{index + 1}</Text>
                    <CachedImage
                      source={{ uri: track.cover || '' }}
                      style={styles.queueImage}
                      defaultSource={require('../../assets/icon.png')}
                    />
                    <View style={styles.queueInfo}>
                      <Text style={styles.queueTitle} numberOfLines={1}>
                        {track.title}
                      </Text>
                      {track.album && (
                        <Text style={styles.queueAlbum} numberOfLines={1}>{track.album}</Text>
                      )}
                      <Text style={styles.queueArtist} numberOfLines={1}>
                        {track.artist}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      removeFromQueue(index);
                      mediumHaptic();
                    }}
                    style={styles.removeBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle" size={24} color="#888" />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Empty State */}
        {tracks.length === 0 && queue.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="list-outline" size={64} color="#333" />
            <Text style={styles.emptyText}>Nothing playing</Text>
            <Text style={styles.emptySubText}>Select a song to start</Text>
          </View>
        )}
        {queue.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Next in Queue ({queue.length} {queue.length === 1 ? 'song' : 'songs'})
              </Text>
              <TouchableOpacity
                onPress={() => {
                  // Play entire queue as new playlist
                  const queueCopy = [...queue];
                  clearQueue();
                  playTrackList(queueCopy, 0);
                  mediumHaptic();
                }}
                style={styles.playAllBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="play" size={16} color="#1DB954" />
                <Text style={styles.playAllText}>Play All</Text>
              </TouchableOpacity>
            </View>
            {queue.map((track, index) => {
              const isCurrentTrack = track.id === currentTrack?.id;
              if (isCurrentTrack) return null;

              return (
                <TouchableOpacity
                  key={`${track.id}-${index}`}
                  style={styles.queueItem}
                  onPress={() => {
                    // Play from this position in queue
                    const queueCopy = [...queue];
                    clearQueue();
                    playTrackList(queueCopy, index);
                    mediumHaptic();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.queueItemLeft}>
                    <Text style={styles.queueIndex}>{index + 1}</Text>
                    <CachedImage
                      source={{ uri: track.cover || '' }}
                      style={styles.queueImage}
                      defaultSource={require('../../assets/icon.png')}
                    />
                    <View style={styles.queueInfo}>
                      <Text style={styles.queueTitle} numberOfLines={1}>
                        {track.title}
                      </Text>
                      {track.album && (
                        <Text style={styles.queueAlbum} numberOfLines={1}>{track.album}</Text>
                      )}
                      <Text style={styles.queueArtist} numberOfLines={1}>
                        {track.artist}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      removeFromQueue(index);
                      mediumHaptic();
                    }}
                    style={styles.removeBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle" size={24} color="#888" />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Empty State */}
        {tracks.length === 0 && queue.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="list-outline" size={64} color="#333" />
            <Text style={styles.emptyText}>Nothing playing</Text>
            <Text style={styles.emptySubText}>Select a song to start</Text>
          </View>
        )}
      </ScrollView>

      {/* Save Playlist Modal */}
      <Modal visible={showSaveModal} transparent animationType="fade" onRequestClose={() => setShowSaveModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Save {saveMode === 'playlist' ? 'Playlist' : 'Queue'} as Playlist
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter playlist name"
              placeholderTextColor="#555"
              value={playlistName}
              onChangeText={setPlaylistName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setShowSaveModal(false)}
                style={styles.modalCancelBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSavePlaylist}
                style={styles.modalSaveBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backBtn: { padding: 4 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBtn: { padding: 4 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  queueCountBadge: { backgroundColor: '#1DB954', borderRadius: 12, minWidth: 24, height: 24, paddingHorizontal: 8, justifyContent: 'center', alignItems: 'center' },
  queueCountText: { fontSize: 12, fontWeight: 'bold', color: '#000' },
  clearBtn: { padding: 4 },
  clearBtnText: { fontSize: 14, color: '#1DB954', fontWeight: '600' },
  clearBtnDisabled: { color: '#444' },
  scrollContent: { paddingBottom: 100 },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#888', marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  playAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1a1a1a', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#1DB954' },
  playAllText: { fontSize: 12, color: '#1DB954', fontWeight: '600' },
  nowPlayingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#1DB954',
  },
  nowPlayingImage: { width: 56, height: 56, borderRadius: 8 },
  nowPlayingInfo: { flex: 1 },
  nowPlayingTitle: { fontSize: 15, fontWeight: '600', color: '#fff' },
  nowPlayingArtist: { fontSize: 13, color: '#888', marginTop: 2 },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  queueItemActive: {
    backgroundColor: 'rgba(29,185,84,0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    marginHorizontal: -8,
  },
  queueIndexActive: { color: '#1DB954' },
  queueTitleActive: { color: '#1DB954' },
  queueItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  queueIndex: { fontSize: 14, color: '#555', width: 24, textAlign: 'center' },
  queueImage: { width: 48, height: 48, borderRadius: 6 },
  queueInfo: { flex: 1 },
  queueTitle: { fontSize: 14, fontWeight: '600', color: '#fff' },
  queueAlbum: { fontSize: 11, color: '#1DB954', marginTop: 1 },
  queueArtist: { fontSize: 12, color: '#888', marginTop: 2 },
  removeBtn: { padding: 8 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#fff', marginTop: 16 },
  emptySubText: { fontSize: 14, color: '#888', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 20, width: '100%', maxWidth: 320 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 16, textAlign: 'center' },
  modalInput: { backgroundColor: '#0a0a0a', borderRadius: 8, padding: 12, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#333', marginBottom: 16 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#333', alignItems: 'center' },
  modalCancelText: { color: '#888', fontWeight: '600', fontSize: 16 },
  modalSaveBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#1DB954', alignItems: 'center' },
  modalSaveText: { color: '#000', fontWeight: '600', fontSize: 16 },
});