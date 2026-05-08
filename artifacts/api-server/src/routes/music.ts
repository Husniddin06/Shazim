import { Router } from "express";

const router = Router();

// Platform aniqlovchi
function detectPlatform(url: string): "youtube" | "tiktok" | "instagram" | "unknown" {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("tiktok.com")) return "tiktok";
  if (url.includes("instagram.com")) return "instagram";
  return "unknown";
}

// TikTok oEmbed API
async function fetchTikTokInfo(url: string) {
  try {
    const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
    return await response.json();
  } catch (error) {
    console.error("TikTok API error:", error);
    return null;
  }
}

// YouTube oEmbed API
async function fetchYouTubeInfo(url: string) {
  try {
    const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    return await response.json();
  } catch (error) {
    console.error("YouTube API error:", error);
    return null;
  }
}

// Instagram oEmbed API
async function fetchInstagramInfo(url: string) {
  try {
    // Instagram API uchun odatda token kerak, lekin oembed ba'zan ochiq bo'ladi
    const response = await fetch(`https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}`);
    return await response.json();
  } catch (error) {
    console.error("Instagram API error:", error);
    return null;
  }
}

// Sarlavhadan musiqa nomini ajratib olish
function extractMusicFromTitle(title: string, platform: string) {
  // Soddalashtirilgan mantiq: "Artist - Title" formatini qidirish
  const parts = title.split(" - ");
  if (parts.length > 1) {
    return { artist: parts[0].trim(), title: parts[1].trim() };
  }
  return { artist: "Unknown", title: title.trim() };
}

// POST /api/music/find — link yuboriladi, musiqa qaytariladi
router.post("/find", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  const platform = detectPlatform(url);
  let info: any = null;

  if (platform === "youtube") info = await fetchYouTubeInfo(url);
  else if (platform === "tiktok") info = await fetchTikTokInfo(url);
  else if (platform === "instagram") info = await fetchInstagramInfo(url);

  if (!info) {
    return res.status(404).json({ error: "Could not fetch video info" });
  }

  const music = extractMusicFromTitle(info.title, platform);

  res.json({
    platform,
    originalTitle: info.title,
    author: info.author_name,
    thumbnail: info.thumbnail_url,
    music
  });
});

// POST /api/music/download — Musiqani yuklab olish uchun endpoint (placeholder)
router.post("/download", async (req, res) => {
  const { url } = req.body;
  res.json({ 
    message: "Download link generated", 
    downloadUrl: `https://shazim-downloader.example.com/api/v1/get?url=${encodeURIComponent(url)}` 
  });
});

// POST /api/music/favorite — Sevimlilarga qo'shish
router.post("/favorite", async (req, res) => {
  const { userId, musicTitle, musicArtist, url } = req.body;
  // Bazaga saqlash mantiqi bu yerda bo'ladi
  res.json({ success: true, message: "Added to favorites" });
});

// GET  /api/music/recent — oxirgi 20 ta qidiruv
router.get("/recent", async (req, res) => {
  res.json({ history: [] });
});

export default router;
