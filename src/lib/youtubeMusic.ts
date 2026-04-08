import { Track } from '../data/playlist';

const YTM_API_BASE = 'https://music.youtube.com/youtubei/v1';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0';

const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

interface YTMContext {
  client: {
    clientName: string;
    clientVersion: string;
    gl: string;
    hl: string;
  };
}

interface YTMSearchResult {
  contents?: {
    tabbedSearchResultsRenderer?: {
      tabs?: Array<{
        tabRenderer?: {
          content?: {
            sectionListRenderer?: {
              contents?: Array<{
                musicShelfRenderer?: {
                  contents?: Array<{
                    musicResponsiveListItemRenderer?: {
                      flexColumns?: Array<{
                        musicResponsiveListItemFlexColumnRenderer?: {
                          text?: {
                            runs?: Array<{
                              text?: string;
                            }>;
                          };
                        };
                      }>;
                      thumbnail?: {
                        musicThumbnailRenderer?: {
                          thumbnail?: {
                            thumbnails?: Array<{ url: string; width: number; height: number }>;
                          };
                        };
                      };
                      navigationEndpoint?: {
                        watchEndpoint?: {
                          videoId: string;
                          playlistId?: string;
                        };
                      };
                    };
                  }>;
                };
              }>;
            };
          };
        };
      }>;
    };
  };
}

interface YTMSong {
  title: string;
  artist: string;
  album: string;
  duration: number;
  videoId: string;
  cover: string;
}

function createContext(): YTMContext {
  return {
    client: {
      clientName: 'WEB_REMIX',
      clientVersion: '1.20250310.01.00',
      gl: 'IN',
      hl: 'en',
    },
  };
}

async function ytmRequest<T>(endpoint: string, body: object): Promise<T> {
  const apiUrl = `${YTM_API_BASE}/${endpoint}?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcWX`;
  const proxyUrl = CORS_PROXY + encodeURIComponent(apiUrl);
  
  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
      'Origin': 'https://music.youtube.com',
      'Referer': 'https://music.youtube.com/',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`YTM API error: ${response.status}`);
  }

  return response.json();
}

function parseYTMSong(item: any): YTMSong | null {
  try {
    const flexColumns = item.musicResponsiveListItemRenderer?.flexColumns || [];
    const thumbnail = item.musicResponsiveListItemRenderer?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails;
    const navigationEndpoint = item.musicResponsiveListItemRenderer?.navigationEndpoint?.watchEndpoint;

    if (!navigationEndpoint?.videoId) return null;

    let title = '';
    let artist = '';
    let duration = 0;

    if (flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs) {
      title = flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0]?.text || '';
    }

    if (flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs) {
      const runs = flexColumns[1].musicResponsiveListItemFlexColumnRenderer.text.runs;
      artist = runs[0]?.text || '';
      if (runs[2]) {
        duration = parseDuration(runs[2]?.text || '0:00');
      }
    }

    const cover = thumbnail?.[thumbnail.length - 1]?.url || '';

    return {
      title,
      artist,
      album: '',
      duration,
      videoId: navigationEndpoint.videoId,
      cover,
    };
  } catch (e) {
    console.error('Parse error:', e);
    return null;
  }
}

function parseDuration(str: string): number {
  const parts = str.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

function ytmSongToTrack(song: YTMSong): Track {
  return {
    id: `ytm_${song.videoId}`,
    title: song.title,
    artist: song.artist,
    album: song.album,
    cover: song.cover,
    src: `https://music.youtube.com/watch?v=${song.videoId}`,
    duration: song.duration,
    type: 'audio' as const,
    songId: song.videoId,
  };
}

export async function searchYouTubeMusic(query: string, limit = 20): Promise<Track[]> {
  try {
    const context = createContext();
    const body = {
      context,
      query,
      params: 'EgIQAQ%3D%3D',
    };

    const data = await ytmRequest<YTMSearchResult>('search', body);
    
    const tracks: Track[] = [];
    
    const contents = data.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
    
    for (const section of contents) {
      if (section.musicShelfRenderer?.contents) {
        for (const item of section.musicShelfRenderer.contents) {
          if (item.musicResponsiveListItemRenderer) {
            const song = parseYTMSong(item);
            if (song) {
              tracks.push(ytmSongToTrack(song));
              if (tracks.length >= limit) break;
            }
          }
        }
        if (tracks.length >= limit) break;
      }
    }

    return tracks;
  } catch (error) {
    console.error('YouTube Music search error:', error);
    return [];
  }
}

export async function getYouTubeMusicStreamUrl(videoId: string): Promise<string | null> {
  try {
    const context = createContext();
    const body = {
      context,
      videoId,
      playbackContext: {
        contentPlaybackContext: {
          startupWindowMs: 0,
        },
      },
    };

    const proxyUrl = CORS_PROXY + encodeURIComponent(`${YTM_API_BASE}/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcWX`);
    
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (data.streamingData?.formats) {
      const format = data.streamingData.formats.find((f: any) => f.mimeType.includes('audio/mp4'));
      return format?.url || null;
    }
    
    return null;
  } catch (error) {
    console.error('YTM stream error:', error);
    return null;
  }
}

export const fetchYouTubeMusic = searchYouTubeMusic;