import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';
import { Track } from '../data/playlist';
import { toast } from './use-toast';

const DOWNLOADS_KEY_PREFIX = 'sonic_downloads_';
const STORAGE_LOCATION_KEY = 'sonic_storage_location';
const MEDIA_PERMISSION_KEY = 'sonic_media_permission_granted';

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
  const mediaPermissionGrantedRef = useRef(false);

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
      const sanitizedLocation = location.replace(/[\r\n]/g, ' ');
      console.log(`[useDownloads] Storage location changed to: ${sanitizedLocation}`);
    } catch (e) {
      const sanitizedError = {
        message: (e as Error)?.message?.replace(/[\r\n]/g, ' ') || 'Unknown error',
        name: (e as Error)?.name?.replace(/[\r\n]/g, ' ') || 'Error'
      };
      console.error('Failed to change storage location:', sanitizedError);
    }
  }, []);

  useEffect(() => {
    // Load storage location preference and media permission status
    const loadStorageLocation = async () => {
      try {
        const location = await AsyncStorage.getItem(STORAGE_LOCATION_KEY);
        if (location === 'external' || location === 'internal') {
          setStorageLocation(location);
          storageLocationRef.current = location;
        }
        const permissionStatus = await AsyncStorage.getItem(MEDIA_PERMISSION_KEY);
        if (permissionStatus === 'true') {
          mediaPermissionGrantedRef.current = true;
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
    
    if (!track?.src || !trackId) {
      const sanitizedTitle = track.title?.replace(/[\r\n]/g, ' ') || 'Unknown';
      console.log(`[useDownloads] Skip download: ${sanitizedTitle} - Invalid track`);
      return;
    }

    // Check if already downloaded or downloading
    if (isDownloaded(trackId)) {
      const sanitizedTitle = track.title?.replace(/[\r\n]/g, ' ') || 'Unknown';
      console.log(`[useDownloads] Skip download: ${sanitizedTitle} - Already downloaded`);
      return;
    }

    if (isDownloading(trackId)) {
      const sanitizedTitle = track.title?.replace(/[\r\n]/g, ' ') || 'Unknown';
      console.log(`[useDownloads] Skip download: ${sanitizedTitle} - Already downloading`);
      return;
    }

    setDownloading(prev => ({ ...prev, [trackId]: 0 }));

    try {
      // Get download directory based on user preference
      const downloadDir = getDownloadDirectory();
      const sanitizedDir = downloadDir.replace(/[\r\n]/g, ' ');
      const sanitizedLocation = String(storageLocationRef.current).replace(/[\r\n]/g, ' ');
      console.log(`[useDownloads] Download directory: ${sanitizedDir}, location: ${sanitizedLocation}`);
      
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
      const sanitizedUri = file.uri.replace(/[\r\n]/g, ' ');
      console.log(`[useDownloads] Downloading to: ${sanitizedUri}`);

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
      
      const sanitizedTitle = track.title?.replace(/[\r\n]/g, ' ') || 'Unknown';
      console.log(`[useDownloads] Download complete: ${sanitizedTitle}, size: ${fileSize} bytes`);
      
      // Save to phone's Music folder
      try {
        // Check current permission status first
        const { status: currentStatus } = await MediaLibrary.getPermissionsAsync();
        
        if (currentStatus !== 'granted') {
          // Only request permission if not already granted
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status === 'granted') {
            mediaPermissionGrantedRef.current = true;
            await AsyncStorage.setItem(MEDIA_PERMISSION_KEY, 'true');
          } else {
            console.log(`[useDownloads] Media library permission denied - saving to app storage only`);
            setDownloading(prev => ({ ...prev, [trackId]: 100 }));
            const newDownload = { track, localUri: file.uri, downloadedAt: Date.now(), fileSize };
            setDownloads(prev => {
              const newDownloads = [...prev, newDownload];
              saveDownloads(newDownloads);
              return newDownloads;
            });
            return;
          }
        } else {
          mediaPermissionGrantedRef.current = true;
        }

        // Only save to MediaLibrary if we have permission
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
        
        const sanitizedAssetUri = asset.uri.replace(/[\r\n]/g, ' ');
        console.log(`[useDownloads] Saved to phone Music: ${sanitizedAssetUri}`);
      } catch (mediaError) {
        const sanitizedError = {
          message: (mediaError as Error)?.message?.replace(/[\r\n]/g, ' ') || 'Unknown error',
          name: (mediaError as Error)?.name?.replace(/[\r\n]/g, ' ') || 'Error'
        };
        console.log(`[useDownloads] Could not save to phone media:`, sanitizedError);
      }
      
      setDownloading(prev => ({ ...prev, [trackId]: 100 }));

      const newDownload = { track, localUri: file.uri, downloadedAt: Date.now(), fileSize };
      
      setDownloads(prev => {
        const newDownloads = [...prev, newDownload];
        saveDownloads(newDownloads);
        const sanitizedTitle = track.title?.replace(/[\r\n]/g, ' ') || 'Unknown';
        console.log(`[useDownloads] Saved download: ${sanitizedTitle}, Total: ${newDownloads.length}`);
        toast({
          title: 'Download Complete',
          description: track.title || 'Track',
        });
        return newDownloads;
      });
    } catch (e) {
      const sanitizedTitle = track.title?.replace(/[\r\n]/g, ' ') || 'Unknown';
      const sanitizedError = {
        message: (e as Error)?.message?.replace(/[\r\n]/g, ' ') || 'Unknown error',
        name: (e as Error)?.name?.replace(/[\r\n]/g, ' ') || 'Error'
      };
      console.error(`[useDownloads] Failed to download ${sanitizedTitle}:`, sanitizedError);
      toast({
        title: 'Download Failed',
        description: sanitizedTitle,
        variant: 'destructive'
      });
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
    toast({
      title: 'Download Deleted',
      description: downloaded.track.title || 'Track',
    });
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
    toast({
      title: 'All Downloads Deleted',
      description: 'All downloaded tracks have been removed',
    });
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
