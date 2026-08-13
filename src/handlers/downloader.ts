import { createHash } from "crypto";

import { Context } from "telegraf";

import { t, Language } from "../locales/i18n";

import { downloadFromUrl, cleanupFile } from "../services/services";

import { getUser } from "../database/storage";

import { requireSubscription } from "../middleware/subscription";



const URL_REGEX = /https?:\/\/(www\.)?(instagram\.com|tiktok\.com|youtube\.com|youtu\.be|vk\.com|vm\.tiktok\.com|music\.youtube\.com)\S+/i;

const pendingUrls = new Map<string, string>();



function getLang(ctx: Context): Language {
  
  const user = ctx.from ? getUser(ctx.from.id) : undefined;
  
  return (user?.language as Language) || "en";
  
}



function urlKey(url: string): string {
  
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
  
}



export async function handleUrlDownload(ctx: Context, url: string) {
  
  if (!(await requireSubscription(ctx))) return;
  
  const normalizedUrl = url.trim();
  
  if (!URL_REGEX.test(normalizedUrl)) {
    
    await ctx.reply(t(getLang(ctx), "not_found"));
    
    return;
    
  }
  
  const key = urlKey(normalizedUrl);
  
  pendingUrls.set(key, normalizedUrl);
  
  const lang = getLang(ctx);
  
  await ctx.reply(t(lang, "quality_select"), {
    
    reply_markup: {
      
      inline_keyboard: [
        
        [
          
          { text: "🎵 128kbps", callback_data: `dl_128_a_${key}` },
          
          { text: "🎵 320kbps", callback_data: `dl_320_a_${key}` },
          
        ],
        
        [{ text: "📹 Video", callback_data: `dl_vid_v_${key}` }],
        
      ],
      
    },
    
  });
  
}



export async function handleDownloadCallback(ctx: Context, data: string) {
  
  const lang = getLang(ctx);
  
  const parts = data.split("_");
  
  if (parts.length < 4) return;
  
  const quality = parts[1] as "128" | "320" | "vid";
  
  const mode = parts[2] as "a" | "v";
  
  const url = pendingUrls.get(parts[3]);
  
  if (!url || !URL_REGEX.test(url)) {
    
    await ctx.answerCbQuery(t(lang, "not_found"));
    
    return;
    
  }
  
  await ctx.editMessageText(t(lang, "download_started"));
  
  let filePath: string | undefined;
  
  try {
    
    const result = await downloadFromUrl(url, quality === "320" ? "320" : "128", mode === "a");
    
    if (!result) {
      
      await ctx.editMessageText(t(lang, "download_failed"));
      
      return;
      
    }
    
    ({ filePath } = result);
    
    const { title, isVideo } = result;
    
    if (isVideo) {
      
      await ctx.replyWithVideo({ source: filePath, filename: `${title}.mp4` }, { caption: title });
      
    } else {
      
      await ctx.replyWithAudio({ source: filePath, filename: `${title}.mp3` }, { title, performer: "Unknown" });
      
    }
    
    await ctx.deleteMessage();
    
  } catch (error) {
    
    console.error("Download error:", error);
    
    await ctx.editMessageText(t(lang, "error"));
    
  } finally {
    
    if (filePath) cleanupFile(filePath);
    
    pendingUrls.delete(parts[3]);
    
  }
  
}





























































