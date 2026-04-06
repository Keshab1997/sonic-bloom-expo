import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Track } from '../../data/playlist';
import { SongCard } from '../../components/SongCard';
import { SectionHeader, SectionSkeleton } from '../../components/SectionHeader';
import type { Playlist } from '../../hooks/usePlaylists';
import type { LikedSong } from '../../hooks/useLikedSongs';

const PlaylistCover: React.FC<{ tracks: any[]; size: number }> = ({ tracks, size }) => {
  const covers = tracks.slice(0, 4).map(t => t.cover).filter(Boolean);
  const half = size / 2;
  if (covers.length >= 4) {
    return (
      <View style={{ width: size, height: size, borderRadius: 14, overflow: 'hidden', flexDirection: 'row', flexWrap: 'wrap' }}>
        {covers.map((uri, i) => (
          <Image key={i} source={{ uri }} style={{ width: half, height: half }} />
        ))}
      </View>
    );
  }
  if (covers.length > 0) {
    return (
      <View style={{ width: size, height: size, borderRadius: 14, overflow: 'hidden' }}>
        <Image source={{ uri: covers[0] }} style={{ width: size, height: size }} />
      </View>
    );
  }
  return (
    <LinearGradient colors={['#8b5cf6', '#a78bfa']} style={{ width: size, height: size, borderRadius: 14, justifyContent: 'center', alignItems: 'center' }}>
      <Ionicons name="musical-notes" size={size * 0.35} color="#fff" />
    </LinearGradient>
  );
};

interface HomeSectionsProps {
  trending: Track[];
  newReleases: Track[];
  recentlyPlayed: Track[];
  playlists: Playlist[];
  likedSongs: LikedSong[];
  loadingTrending: boolean;
  loadingNewReleases: boolean;
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlay: (track: Track, allTracks: Track[], index: number) => void;
  onAddToQueue: (track: Track) => void;
  onViewAll: (title: string, query: string, offset: number, isYoutube?: boolean, langFilter?: string) => void;
  onClearRecentlyPlayed: () => void;
}

export const HomeSections: React.FC<HomeSectionsProps> = ({
  trending, newReleases, recentlyPlayed, playlists, likedSongs,
  loadingTrending, loadingNewReleases,
  currentTrack, isPlaying, onPlay, onAddToQueue, onViewAll, onClearRecentlyPlayed
}) => {
  const likedTracks = likedSongs.map(s => s.track);

  return (
    <>
      {/* My Playlists */}
      {playlists.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="My Playlists" emoji="📂" count={playlists.length} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {playlists.map(pl => (
              <TouchableOpacity
                key={pl.id}
                style={styles.playlistCard}
                onPress={() => pl.tracks.length > 0 && onPlay(pl.tracks[0], pl.tracks, 0)}
                activeOpacity={0.7}
              >
                <PlaylistCover tracks={pl.tracks} size={110} />
                <Text style={styles.playlistCardTitle} numberOfLines={1}>{pl.name}</Text>
                <Text style={styles.playlistCardSub}>{pl.trackCount} songs</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Liked Songs */}
      {likedTracks.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Liked Songs" emoji="💖" count={likedTracks.length} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {likedTracks.map((track, i) => (
              <SongCard
                key={track.id}
                track={track}
                index={i}
                allTracks={likedTracks}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                onPlay={onPlay}
                onAddToQueue={onAddToQueue}
              />
            ))}
          </ScrollView>
        </View>
      )}
      {/* Trending Now */}
      <View style={styles.section}>
        <SectionHeader
          title="Trending Now"
          emoji="🔥"
          count={trending.length}
          onViewAll={() => onViewAll("Trending Now", "latest bollywood hits", 1000)}
        />
        {loadingTrending ? (
          <SectionSkeleton count={4} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {trending.map((track, i) => (
              <SongCard
                key={track.id}
                track={track}
                index={i}
                allTracks={trending}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                onPlay={onPlay}
                onAddToQueue={onAddToQueue}
                badge={`#${i + 1}`}
                badgeColor="rgba(0,0,0,0.7)"
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* New Releases */}
      <View style={styles.section}>
        <SectionHeader
          title="New Releases"
          emoji="🎵"
          count={newReleases.length}
          onViewAll={() => onViewAll("New Releases", "new hindi songs 2025", 2000)}
        />
        {loadingNewReleases ? (
          <SectionSkeleton count={4} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {newReleases.map((track, i) => (
              <SongCard
                key={track.id}
                track={track}
                index={i}
                allTracks={newReleases}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                onPlay={onPlay}
                onAddToQueue={onAddToQueue}
                badge="NEW"
                badgeColor="#16a34a"
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Recently Played */}
      {recentlyPlayed.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Recently Played" emoji="🕐" count={recentlyPlayed.length} />
          <View style={styles.clearBtnContainer}>
            <TouchableOpacity onPress={onClearRecentlyPlayed} activeOpacity={0.7}>
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {recentlyPlayed.map((track, i) => (
              <SongCard
                key={track.id}
                track={track}
                index={i}
                allTracks={recentlyPlayed}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                onPlay={onPlay}
                onAddToQueue={onAddToQueue}
              />
            ))}
          </ScrollView>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  section: { marginTop: 24 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 8 },
  clearBtnContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginRight: 16, marginTop: -8, marginBottom: 8 },
  clearBtnText: { fontSize: 12, color: '#ef4444' },
  playlistCard: { width: 110, marginRight: 14, alignItems: 'center' },
  playlistCardTitle: { fontSize: 12, color: '#fff', fontWeight: '600', textAlign: 'center', width: '100%', marginTop: 8 },
  playlistCardSub: { fontSize: 11, color: '#888', marginTop: 2 },
});
