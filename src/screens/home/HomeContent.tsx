import React from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Track } from '../../data/playlist';
import { SongCard } from '../../components/SongCard';
import { SectionHeader, SectionSkeleton } from '../../components/SectionHeader';
import { QUICK_PICKS } from '../../data/constants';

const { width } = Dimensions.get('window');

interface HomeContentProps {
  suspense: Track[];
  ytTrending: Track[];
  loadingSuspense: boolean;
  loadingYtTrending: boolean;
  loadingQuickPick: string | null;
  loadingYtPick: string | null;
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlay: (track: Track, allTracks: Track[], index: number) => void;
  onAddToQueue: (track: Track) => void;
  onViewAll: (title: string, query: string, offset: number, isYoutube?: boolean) => void;
  onQuickPick: (query: string, offset: number) => void;
  onYtQuickPick: (query: string, offset: number) => void;
}

export const HomeContent: React.FC<HomeContentProps> = ({
  loadingQuickPick, loadingYtTrending, currentTrack, isPlaying,
  onPlay, onAddToQueue, onQuickPick, ytTrending, onYtQuickPick
}) => {
  return (
    <>
      {/* YouTube Music Section */}
      {ytTrending.length > 0 && (
        <>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>▶ YouTube Music</Text>
            <View style={styles.dividerLine} />
          </View>
          <View style={styles.section}>
            <View style={styles.ytSection}>
              <Text style={styles.ytSectionTitle}>YouTube Music Trending</Text>
              <Text style={styles.ytSectionSubtitle}>Powered by YouTube</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {ytTrending.slice(0, 10).map((track, index) => (
                <TouchableOpacity
                  key={track.id}
                  style={styles.ytCard}
                  onPress={() => onPlay(track, ytTrending, index)}
                  activeOpacity={0.8}
                >
                  <View style={styles.ytThumbnail}>
                    <Image 
                      source={{ uri: track.cover }} 
                      style={styles.ytImage}
                      resizeMode="cover"
                    />
                    <View style={styles.ytPlayBtn}>
                      <Ionicons name="play" size={20} color="#fff" />
                    </View>
                  </View>
                  <Text style={styles.ytTitle} numberOfLines={1}>{track.title}</Text>
                  <Text style={styles.ytArtist} numberOfLines={1}>{track.artist}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </>
      )}

      {/* Divider: Quick Picks */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>⚡ Quick Picks</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Quick Picks */}
      <View style={styles.section}>
        <SectionHeader title="Quick Picks" emoji="⚡" />
        <View style={styles.quickPickGrid}>
          {QUICK_PICKS.map((pick) => (
            <TouchableOpacity
              key={pick.title}
              style={[styles.quickPickBtn, { opacity: loadingQuickPick === pick.query ? 0.6 : 1 }]}
              onPress={() => onQuickPick(pick.query, 35000 + QUICK_PICKS.indexOf(pick) * 100)}
              disabled={loadingQuickPick === pick.query}
              activeOpacity={0.8}
            >
              <View style={styles.quickPickIcon}>
                {loadingQuickPick === pick.query ? (
                  <ActivityIndicator size="small" color="#1DB954" />
                ) : (
                  <Ionicons name="musical-notes" size={18} color="#1DB954" />
                )}
              </View>
              <View style={styles.quickPickInfo}>
                <Text style={styles.quickPickTitle} numberOfLines={1}>{pick.title}</Text>
                <Text style={styles.quickPickDesc} numberOfLines={1}>{pick.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  section: { marginTop: 24 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 8 },
  divider: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 28, marginBottom: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#222' },
  dividerText: { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginHorizontal: 10, textTransform: 'uppercase' },
  sectionHeaderWithBadge: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10, marginTop: 4 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerEmoji: { fontSize: 18, marginRight: 6 },
  headerTitle: { fontSize: 17, color: '#fff', fontWeight: 'bold' },
  countText: { fontSize: 11, color: '#1DB954', marginTop: 1, fontWeight: '600' },
  viewAllText: { fontSize: 12, color: '#1DB954' },
  ytBadge: { backgroundColor: '#dc2626', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
  ytBadgeText: { fontSize: 9, color: '#fff', fontWeight: 'bold' },
  quickPickGrid: { paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickPickBtn: { width: (width - 48) / 2, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#2a2a2a', flexDirection: 'row', alignItems: 'center' },
  ytQuickPickBtn: { width: (width - 48) / 2, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#2a2a2a', flexDirection: 'row', alignItems: 'center' },
  quickPickIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(29,185,84,0.15)', justifyContent: 'center', alignItems: 'center' },
  ytQuickPickIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(220,38,38,0.15)', justifyContent: 'center', alignItems: 'center' },
  quickPickInfo: { flex: 1, marginLeft: 10 },
  quickPickTitle: { fontSize: 12, color: '#fff', fontWeight: 'bold' },
  quickPickDesc: { fontSize: 10, color: '#666', marginTop: 2 },
  // YouTube section styles
  ytSection: { paddingHorizontal: 16, marginBottom: 12 },
  ytSectionTitle: { fontSize: 18, color: '#fff', fontWeight: 'bold' },
  ytSectionSubtitle: { fontSize: 12, color: '#666', marginTop: 2 },
  horizontalScroll: { paddingHorizontal: 16, gap: 12 },
  ytCard: { width: 140, marginRight: 12 },
  ytThumbnail: { width: 140, height: 140, borderRadius: 12, overflow: 'hidden', backgroundColor: '#222' },
  ytImage: { width: '100%', height: '100%' },
  ytPlayBtn: { position: 'absolute', bottom: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: '#dc2626', justifyContent: 'center', alignItems: 'center' },
  ytTitle: { fontSize: 13, color: '#fff', fontWeight: '600', marginTop: 8 },
  ytArtist: { fontSize: 11, color: '#888', marginTop: 2 },
});
