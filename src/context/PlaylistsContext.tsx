import React, { createContext, useContext, ReactNode } from 'react';
import { usePlaylists, Playlist } from '../hooks/usePlaylists';
import { Track } from '../data/playlist';

interface PlaylistsContextType {
  playlists: Playlist[];
  loading: boolean;
  createPlaylist: (name: string) => Promise<Playlist | null>;
  deletePlaylist: (id: string) => Promise<void>;
  addTrackToPlaylist: (playlistId: string, track: Track, position?: number) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
}

const PlaylistsContext = createContext<PlaylistsContextType | undefined>(undefined);

export function PlaylistsProvider({ children }: { children: ReactNode }) {
  const playlists = usePlaylists();
  return (
    <PlaylistsContext.Provider value={playlists}>
      {children}
    </PlaylistsContext.Provider>
  );
}

export function usePlaylistsContext() {
  const ctx = useContext(PlaylistsContext);
  if (!ctx) throw new Error('usePlaylistsContext must be used within PlaylistsProvider');
  return ctx;
}
