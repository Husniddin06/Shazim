import axios from "axios";
import { exec } from "child_process";
import * as fs from "fs";
import { getStoredMusic, addStoredMusic } from "../storage/channelStorage";
import * as path from "path";
import * as os from "os";

export interface MusicResult {
  fileId?: string; // Optional Telegram file_id if stored in channel
  id: number;
  title: string;
  artist: string;
  album: string;
  duration: number;
  previewUrl: string;
  coverUrl: string;
}

export async function searchMusic(query: string): Promise<MusicResult[]> {
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
  ctx: any
): Promise<MusicResult | null> {
  try {
    const tmpPath = path.join(os.tmpdir(), `shazam_${Date.now()}.ogg`);
    fs.writeFileSync(tmpPath, audioBuffer);

    const wavPath = path.join(os.tmpdir(), `shazam_${Date.now()}.wav`);
    try {
      await runCommand(
        `ffmpeg -i "${tmpPath}" -ar 16000 -ac 1 -f wav "${wavPath}" -y 2>/dev/null`,
        10000,
      );
    } catch {
      cleanupFile(tmpPath);
      return null;
    }

    const rawAudio = fs.readFileSync(wavPath);
    cleanupFile(tmpPath);
    cleanupFile(wavPath);

    const base64Audio = rawAudio.toString("base64");

    const { data } = await axios.post(
      "https://shazam.p.rapidapi.com/songs/v2/detect",
      base64Audio,
      {
        headers: {
          "Content-Type": "text/plain",
          "X-RapidAPI-Key": process.env.RAPIDAPI_KEY || "",
          "X-RapidAPI-Host": "shazam.p.rapidapi.com",
        },
      },
    );

    if (data?.track) {
      const track = data.track;
      const searchResults = await searchMusic(`${track.subtitle} ${track.title}`);
      if (searchResults.length > 0) {
        const recognizedTrack = searchResults[0];
        const stored = getStoredMusic(recognizedTrack.id);
        if (stored) {
          return { ...recognizedTrack, fileId: stored.fileId };
        }
        return recognizedTrack;
      }
      return {
        id: 0,
        title: track.title || "Unknown",
        artist: track.subtitle || "Unknown",
        album: "",
        duration: 0,
        previewUrl: "",
        coverUrl: track.images?.coverart || "",
      };
    }
    return null;
  } catch (error) {
    console.error("Shazam recognition error:", error);
    return null;
  }
}
