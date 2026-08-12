import axios from "axios";
import { exec } from "child_process";
import * as fs from "fs";
import { getStoredMusic, addStoredMusic } from "../storage/channelStorage";
import * as path from "path";
import * as os from "os";
import { YMApi, Types } from "yamd2";

const ymApi = new YMApi();
let ymApiInitialized = false;

async function initializeYMApi() {
  if (!ymApiInitialized) {
    // You might need to get an access token for Yandex Music API
    // For now, we'll assume it can work without one for basic search
    // If authentication is required, you'll need to implement a way to get and store the token
    await ymApi.init(); 
    ymApiInitialized = true;
  }
}

export interface MusicResult {
  fileId?: string; // Optional Telegram file_id if stored in channel
  id: number;
  title: string;
  artist: string;
  album: string;
  duration: number;
  previewUrl: string;
  coverUrl: string;
  source?: "deezer" | "yandex"; // Add source to MusicResult
}

export async function searchMusic(query: string): Promise<MusicResult[]> {
  await initializeYMApi();
  try {
    const ymSearchResults = await ymApi.search(query, { type: "track" });
    if (ymSearchResults.tracks && ymSearchResults.tracks.results.length > 0) {
      return ymSearchResults.tracks.results.map((track: Types.Track) => ({
        id: track.id,
        title: track.title,
        artist: track.artists ? track.artists[0].name : "Unknown",
        album: track.albums ? track.albums[0].title : "Unknown",
        duration: track.durationMs ? track.durationMs / 1000 : 0,
        previewUrl: track.previewSrc || "",
        coverUrl: track.cover ? `https://${track.cover.replace("%%", "400x400")}` : "",
        source: "yandex"
      }));
    }
  } catch (error) {
    console.error("Yandex Music search error:", error);
  }

  // Fallback to Deezer if Yandex Music search fails or returns no results
  try {
    const { data } = await axios.get("https://api.deezer.com/search", {
      params: { q: query, limit: 6 },
    });
    return (
      data.data?.map((track: any) => ({
        id: track.id,
        title: track.title,
        artist: track.artist.name,
        album: track.album.title,
        duration: track.duration,
        previewUrl: track.preview,
        coverUrl: track.album.cover_medium,
        source: "deezer"
      })) || []
    );
  } catch (error) {
    console.error("Deezer search error:", error);
    return [];
  }
}

export async function getLyrics(artist: string, title: string): Promise<string | null> {
  try {
    const { data } = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
    return data.lyrics || null;
  } catch {
    return null;
  }
}

export async function getRecommendations(trackId: number): Promise<MusicResult[]> {
  try {
    const { data } = await axios.get(`https://api.deezer.com/track/${trackId}/related`);
    return (
      data.data?.slice(0, 5).map((track: any) => ({
        id: track.id,
        title: track.title,
        artist: track.artist.name,
        album: track.album.title,
        duration: track.duration,
        previewUrl: track.preview,
        coverUrl: track.album.cover_medium,
      })) || []
    );
  } catch {
    return [];
  }
}

export async function downloadAudioBuffer(url: string): Promise<Buffer> {
  const { data } = await axios.get(url, { responseType: "arraybuffer" });
  return Buffer.from(data);
}

export async function downloadFullTrack(trackId: number, source: "deezer" | "yandex", title: string, artist: string): Promise<string | null> {
  const tmpDir = path.join(os.tmpdir(), "bot-downloads");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  let filePath: string | null = null;

  try {
    if (source === "yandex") {
      await initializeYMApi();
      const downloadInfo = await ymApi.getTrackDownloadInfo(trackId);
      if (downloadInfo && downloadInfo.src) {
        const { data } = await axios.get(downloadInfo.src, { responseType: "arraybuffer" });
        filePath = path.join(tmpDir, `yandex_music_${trackId}.mp3`);
        fs.writeFileSync(filePath, Buffer.from(data));
      }
    } else if (source === "deezer") {
      // For Deezer, we'll use yt-dlp to search and download the full track from YouTube
      console.log(`Searching YouTube for full track: ${artist} - ${title}`);
      const searchYoutubeCmd = `yt-dlp --get-url "ytsearch1:${artist} - ${title}"`;
      const youtubeUrl = await runCommand(searchYoutubeCmd, 15000);
      if (youtubeUrl) {
        const outputTemplate = path.join(tmpDir, `yt_dlp_${trackId}.%(ext)s`);
        const downloadCmd = `yt-dlp --no-warnings -f "ba/b" -x --audio-format mp3 --audio-quality 320K -o "${outputTemplate}" "${youtubeUrl}"`;
        await runCommand(downloadCmd, 60000);
        const files = fs.readdirSync(tmpDir).filter(f => f.startsWith(`yt_dlp_${trackId}`));
        if (files.length > 0) {
          filePath = path.join(tmpDir, files[0]);
        }
      }
    }
  } catch (error) {
    console.error(`Error downloading full track from ${source}:`, error);
  }
  return filePath;
}

function runCommand(cmd: string, timeout = 120000): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout, maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

export async function applyAudioEffect(inputPath: string, effect: string): Promise<string> {
  const outputPath = path.join(os.tmpdir(), `effect_${Date.now()}.mp3`);
  let filter = "";
  
  switch (effect) {
    case "bass":
      filter = "bass=g=10";
      break;
    case "slow":
      filter = "atempo=0.8";
      break;
    case "fast":
      filter = "atempo=1.5";
      break;
    default:
      return inputPath;
  }

  try {
    await runCommand(`ffmpeg -i "${inputPath}" -af "${filter}" "${outputPath}" -y`);
    return outputPath;
  } catch (error) {
    console.error("FFmpeg effect error:", error);
    return inputPath;
  }
}

export async function downloadFromUrl(
  url: string,
  quality: "128" | "320" = "128",
  audioOnly: boolean = false
): Promise<{ filePath: string; title: string; isVideo: boolean } | null> {
  const tmpDir = path.join(os.tmpdir(), "bot-downloads");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  const outputTemplate = path.join(tmpDir, `%(id)s.%(ext)s`);

  try {
    let title = "audio";
    try {
      const titleCmd = `yt-dlp --no-warnings --print title "${url}" 2>/dev/null || echo "audio"`;
      title = await runCommand(titleCmd, 15000);
      if (!title) title = "audio";
    } catch {
      title = "audio";
    }

    let cmd: string;
    const isSocial = url.includes("instagram.com") || url.includes("tiktok.com") || url.includes("vm.tiktok.com");
    
    if (audioOnly) {
      const bitrate = quality === "320" ? "320k" : "128k";
      cmd = `yt-dlp --no-warnings -f "ba/b" -x --audio-format mp3 --audio-quality ${bitrate} -o "${outputTemplate}" "${url}"`;
    } else if (isSocial) {
      cmd = `yt-dlp --no-warnings -f "best[ext=mp4]/best" -o "${outputTemplate}" "${url}"`;
    } else {
      // Default behavior for other links
      cmd = `yt-dlp --no-warnings -f "ba/b" -x --audio-format mp3 -o "${outputTemplate}" "${url}"`;
    }

    await runCommand(cmd);

    const files = fs.readdirSync(tmpDir).sort((a, b) => {
      return (
        fs.statSync(path.join(tmpDir, b)).mtimeMs -
        fs.statSync(path.join(tmpDir, a)).mtimeMs
      );
    });

    if (files.length === 0) return null;

    const filePath = path.join(tmpDir, files[0]);
    const isVideo = !audioOnly && (
      filePath.endsWith(".mp4") ||
      filePath.endsWith(".webm") ||
      filePath.endsWith(".mkv")
    );

    return { filePath, title, isVideo };
  } catch (error) {
    console.error("Download error:", error);
    return null;
  }
}

export function cleanupFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {}
}

export async function recognizeAudioShazam(
  audioBuffer: Buffer,
  ctx: any,
): Promise<MusicResult | null> {
  let tmpPath = "";
  let wavPath = "";
  try {
    const stamp = Date.now();
    tmpPath = path.join(os.tmpdir(), `shazam_${stamp}.input`);
    wavPath = path.join(os.tmpdir(), `shazam_${stamp}.wav`);
    fs.writeFileSync(tmpPath, audioBuffer);
    await runCommand(`ffmpeg -i "${tmpPath}" -ar 16000 -ac 1 -f wav "${wavPath}" -y 2>/dev/null`, 10000);
    const rawAudio = fs.readFileSync(wavPath);
    const form = new (globalThis as any).FormData();
    const blob = new (globalThis as any).Blob([rawAudio], { type: "audio/wav" });
    form.append("upload_file", blob, "audio.wav");
    const apiUrl = process.env.SHAZAM_API_URL || "https://shazam-api-free.p.rapidapi.com/shazam/recognize/";
    const apiHost = process.env.SHAZAM_API_HOST || "shazam-api-free.p.rapidapi.com";
    const { data } = await axios.post(apiUrl, form, {
      headers: {
        "x-rapidapi-host": apiHost,
        "x-rapidapi-key": process.env.RAPIDAPI_KEY || "",
      },
      maxBodyLength: Infinity,
      timeout: 30000,
    });
    const track = data?.track || data?.data?.track || data?.result?.track || data?.result || data?.data;
    const title = track?.title || track?.name || track?.track?.title;
    const artist = track?.subtitle || track?.artist || track?.track?.subtitle || track?.artists?.[0]?.name;
    if (!title || !artist) return null;
    const searchResults = await searchMusic(`${artist} ${title}`);
    if (searchResults.length > 0) {
      const recognizedTrack = searchResults[0];
      const stored = getStoredMusic(recognizedTrack.id);
      return stored ? { ...recognizedTrack, fileId: stored.fileId } : recognizedTrack;
    }
    return {
      id: 0,
      title,
      artist,
      album: track?.album || "",
      duration: Number(track?.duration || 0),
      previewUrl: track?.previewUrl || track?.preview || "",
      coverUrl: track?.images?.coverart || track?.cover || "",
      source: "deezer",
    };
  } catch (error) {
    console.error("Shazam recognition error:", error);
    return null;
  } finally {
    if (tmpPath) cleanupFile(tmpPath);
    if (wavPath) cleanupFile(wavPath);
  }
}
