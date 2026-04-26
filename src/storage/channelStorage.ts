import { Context } from "telegraf";
import { MusicResult } from "../services/services";
import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(process.cwd(), "bot", "data");
const CHANNEL_STORAGE_FILE = path.join(DATA_DIR, "channel_storage.json");

interface ChannelStoredMusic {
  songId: number; // Deezer ID
  fileId: string; // Telegram file_id of the forwarded message
  title: string;
  artist: string;
}

let storedMusic: Map<number, ChannelStoredMusic> = new Map();

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadStoredMusic() {
  ensureDataDir();
  try {
    if (fs.existsSync(CHANNEL_STORAGE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CHANNEL_STORAGE_FILE, "utf-8"));
      storedMusic = new Map(data.map((m: ChannelStoredMusic) => [m.songId, m]));
    }
  } catch {
    storedMusic = new Map();
  }
}

function saveStoredMusicToFile() {
  ensureDataDir();
  fs.writeFileSync(CHANNEL_STORAGE_FILE, JSON.stringify(Array.from(storedMusic.values()), null, 2));
}

export function getStoredMusic(songId: number): ChannelStoredMusic | undefined {
  return storedMusic.get(songId);
}

export function addStoredMusic(songId: number, fileId: string, title: string, artist: string) {
  storedMusic.set(songId, { songId, fileId, title, artist });
  saveStoredMusicToFile();
}

loadStoredMusic();

export const STORAGE_CHANNEL_ID = parseInt(process.env.STORAGE_CHANNEL_ID || "0"); // Default to 0 if not set
