import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';
import { Track } from '../data/playlist';

const DOWNLOADS_KEY_PREFIX = 'sonic_downloads_';
const STORAGE_LOCATION_KEY = 'sonic_storage_location';

export type StorageLocation = 'internal' | 'external';

export interface DownloadedTrack {
  track: Track;
  localUri: string;
  downloadedAt: number;
  fileSize?: number;
}

export const useDownloads = () => {
  const [downloads, setDownloads] = useState<DownloadedTrack[]>([]);
  const [downloading, setDownloading] = useState<Record<string, number>>({});
  const [storageLocation, setStorageLocation] = useState<StorageLocation>('internal');
  const validDownloadsRef = useRef<DownloadedTrack[]>([]);
  const storageLocationRef = useRef<StorageLocation>('internal');

  const getStorageKey = useCallback(() => {
    return 'sonic_downloads_guest';
  }, []);

  // Get download directory - always private storage (no permissions needed)
  const getDownloadDirectory = useCallback(() => {
    // Using app's private documents folder
    return FileSystem.Paths.document?.uri + 'downloads/';
  }, []);

  // Change storage location
  const changeStorageLocation = useCallback(async (location: StorageLocation) => {
    try {
      await AsyncStorage.setItem(STORAGE_LOCATION_KEY, location);
      setStorageLocation(location);
      storageLocationRef.current = location;
      console.log(`[useDownloads] Storage location changed to: ${location}`);
    } catch (e) {
      console.error('Failed to change storage location:', e);
    }
  }, []);

  useEffect(() => {
    // Load storage location preference
    const loadStorageLocation = async () => {
      try {
        const location = await AsyncStorage.getItem(STORAGE_LOCATION_KEY);
        if (location === 'external' || location === 'internal') {
          setStorageLocation(location);
          storageLocationRef.current = location;
        }
      } catch (e) {
        console.error('Failed to load storage location:', e);
      }
    };
    loadStorageLocation();
    loadDownloads();
  }, []);

  const loadDownloads = async () => {
    try {
      // First, determine which key to use
      let localKey = getStorageKey();
      
      // If no user, try guest key
      if (!localKey) {
        localKey = `${DOWNLOADS_KEY_PREFIX}guest`;
      }
      
      const localData = await AsyncStorage.getItem(localKey);
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          setDownloads(parsed);
          validDownloadsRef.current = parsed;
        } catch (e) {
          console.error('[useDownloads] Failed to parse local data:', e);
        }
      } else {
        console.log('[useDownloads] No local data found');
      }
    } catch (e) {
      console.error('Failed to load downloads:', e);
    }
  };

  const saveDownloads = async (newDownloads: DownloadedTrack[]) => {
    try {
      setDownloads(newDownloads);
      
      // Save to user-specific AsyncStorage only (no Supabase sync)
      const key = getStorageKey();
      if (key) {
        await AsyncStorage.setItem(key, JSON.stringify(newDownloads));
      } else {
        await AsyncStorage.setItem(`${DOWNLOADS_KEY_PREFIX}guest`, JSON.stringify(newDownloads));
      }
    } catch (e) {
      console.error('Failed to save downloads:', e);
    }
  };

  const isDownloaded = useCallback((trackId: string) => {
    return downloads.some(d => {
      if (!d.track) return false;
      // Check both songId (JioSaavn ID) and track.id for compatibility
      const dSongId = d.track.songId || d.track.id;
      return String(dSongId) === String(trackId);
    });
  }, [downloads]);

  const getDownloadedTrack = useCallback((trackId: string) => {
    return downloads.find(d => {
      if (!d.track) return false;
      // Check both songId (JioSaavn ID) and track.id for compatibility
      const dSongId = d.track.songId || d.track.id;
      return String(dSongId) === String(trackId);
    });
  }, [downloads]);

  const downloadTrack = async (track: Track) => {
    // Use songId (JioSaavn ID) as the unique identifier, fallback to track.id
    const trackId = String(track.songId || track.id);
    
    if (!track?.src || !trackId || isDownloaded(trackId)) {
      console.log(`[useDownloads] Skip download: ${track.title} - Already downloaded or invalid`);
      return;
    }

    setDownloading(prev => ({ ...prev, [trackId]: 0 }));

    try {
      // Get download directory based on user preference
      const downloadDir = getDownloadDirectory();
      console.log(`[useDownloads] Download directory: ${downloadDir}, location: ${storageLocationRef.current}`);
      
      // Create downloads directory if it doesn't exist using new API
      const dir = new FileSystem.Directory(downloadDir);
      console.log(`[useDownloads] Directory exists: ${dir.exists}`);
      
      if (!dir.exists) {
        console.log(`[useDownloads] Creating directory...`);
        dir.create({ intermediates: true, idempotent: true });
        console.log(`[useDownloads] Directory created successfully`);
      }
      
      const safeTitle = (track.title || 'unknown').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
      const fileName = `${trackId}_${safeTitle}.mp3`;
      const file = new FileSystem.File(downloadDir, fileName);
      console.log(`[useDownloads] Downloading to: ${file.uri}`);

      setDownloading(prev => ({ ...prev, [trackId]: 25 }));
      
      // Download file using fetch
      const response = await fetch(track.src);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      setDownloading(prev => ({ ...prev, [trackId]: 50 }));
      
      // Get response as ArrayBuffer (works in React Native)
      const arrayBuffer = await response.arrayBuffer();
      const fileSize = arrayBuffer.byteLength;
      setDownloading(prev => ({ ...prev, [trackId]: 75 }));
      
      // Convert to Uint8Array and write to file
      const uint8Array = new Uint8Array(arrayBuffer);
      await file.create({ overwrite: true });
      file.write(uint8Array);
      
      console.log(`[useDownloads] Download complete: ${track.title}, size: ${fileSize} bytes`);
      
      // Save to phone's Music folder
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          const asset = await MediaLibrary.createAssetAsync(file.uri);
          
          // Use a unique album name "Sonic Bloom" to avoid conflicts
          const albums = await MediaLibrary.getAlbumsAsync();
          let sonicBloomAlbum = albums.find(a => a.title.toLowerCase() === 'sonic bloom');
          
          if (!sonicBloomAlbum) {
            sonicBloomAlbum = await MediaLibrary.createAlbumAsync('Sonic Bloom', asset, false);
            console.log(`[useDownloads] Created new album: Sonic Bloom`);
          } else {
            await MediaLibrary.addAssetsToAlbumAsync([asset], sonicBloomAlbum, false);
            console.log(`[useDownloads] Added to existing album: Sonic Bloom`);
          }
          
          console.log(`[useDownloads] Saved to phone Music: ${asset.uri}`);
        } else {
          console.log(`[useDownloads] Media library permission not granted`);
        }
      } catch (mediaError) {
        console.log(`[useDownloads] Could not save to phone media:`, mediaError);
      }
      
      setDownloading(prev => ({ ...prev, [trackId]: 100 }));

      const newDownload = { track, localUri: file.uri, downloadedAt: Date.now(), fileSize };
      
      setDownloads(prev => {
        const newDownloads = [...prev, newDownload];
        saveDownloads(newDownloads);
        console.log(`[useDownloads] Saved download: ${track.title}, Total: ${newDownloads.length}`);
        return newDownloads;
      });
    } catch (e) {
      console.error(`[useDownloads] Failed to download ${track.title}:`, e);
    } finally {
      setDownloading(prev => { const n = { ...prev }; delete n[trackId]; return n; });
    }
  };

  const deleteTrack = async (trackId: string) => {
    const downloaded = getDownloadedTrack(trackId);
    if (!downloaded) return;

    try {
      // Check if file exists before deleting using new API
      const file = new FileSystem.File(downloaded.localUri);
      if (file.exists) {
        await file.delete();
      }
    } catch (e) {
      console.error('Failed to delete file:', e);
    }

    const newDownloads = downloads.filter(d => {
      if (!d.track) return false;
      const dSongId = d.track.songId || d.track.id;
      return String(dSongId) !== String(trackId);
    });
    await saveDownloads(newDownloads);
  };

  const deleteAll = async () => {
    try {
      for (const d of downloads) {
        const file = new FileSystem.File(d.localUri);
        if (file.exists) {
          await file.delete();
        }
      }
    } catch (e) {
      console.error('Failed to delete files:', e);
    }

    await saveDownloads([]);
  };

  const getDownloadProgress = useCallback((trackId: string) => {
    return downloading[String(trackId)] || 0;
  }, [downloading]);

  const isDownloading = useCallback((trackId: string) => {
    return String(trackId) in downloading;
  }, [downloading]);

  // Get total download size
  const getTotalDownloadSize = useCallback(() => {
    let totalSize = 0;
    for (const d of downloads) {
      if (d.fileSize) {
        totalSize += d.fileSize;
      } else {
        totalSize += 3000000; // Fallback estimate ~3MB per mp3
      }
    }
    return totalSize;
  }, [downloads]);

  // Format bytes to human readable
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return {
    downloads,
    downloading,
    isDownloaded,
    getDownloadedTrack,
    downloadTrack,
    deleteTrack,
    deleteAll,
    getDownloadProgress,
    isDownloading,
    getTotalDownloadSize,
    formatBytes,
    storageLocation,
    changeStorageLocation,
    getDownloadDirectory,
  };
};
