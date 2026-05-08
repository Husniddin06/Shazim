import { Router } from "express";

const router = Router();

// Platform aniqlovchi
function detectPlatform(url: string): "youtube" | "tiktok" | "instagram" | "unknown" {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("tiktok.com")) return "tiktok";
  if (url.includes("instagram.com")) return "instagram";
  return "unknown";
}

// TikTok, YouTube, Instagram uchun oembed API chaqiruvlar
async function fetchTikTokInfo(url: string) {
  // tiktok.com/oembed?url=...
  return { title: "TikTok Video" }; 
}

async function fetchYouTubeInfo(url: string) {
  // youtube.com/oembed?url=...
  return { title: "YouTube Video" };
}

async function fetchInstagramInfo(url: string) {
  // instagram.com/api/v1/oembed/
  return { title: "Instagram Post" };
}

// Sarlavhadan musiqa nomini ajratib olish
function extractMusicFromTitle(title: string, platform: string) {
  // Mantiq bu yerda bo'ladi
  return { title, artist: "Unknown" };
}

// POST /api/music/find — link yuboriladi, musiqa qaytariladi
router.post("/find", async (req, res) => {
  const { url } = req.body;
  const platform = detectPlatform(url);
  res.json({ platform, message: "Music found logic placeholder" });
});

// GET  /api/music/recent — oxirgi 20 ta qidiruv
router.get("/recent", async (req, res) => {
  res.json({ history: [] });
});

export default router;
