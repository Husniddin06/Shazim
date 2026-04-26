import { Context } from "telegraf";
import { t, Language } from "../locales/i18n";
import { downloadFromUrl, cleanupFile } from "../services/services";
import { getUser } from "../database/storage";
import { requireSubscription } from "../middleware/subscription";

const URL_REGEX =
  /https?:\/\/(www\.)?(instagram\.com|tiktok\.com|youtube\.com|youtu\.be|vk\.com|vm\.tiktok\.com|music\.youtube\.com)\S+/i;

function getLang(ctx: Context): Language {
  const user = ctx.from ? getUser(ctx.from.id) : undefined;
  return (user?.language as Language) || "en";
}

export async function handleUrlDownload(ctx: Context, url: string) {
  if (!(await requireSubscription(ctx))) return;
  const lang = getLang(ctx);
  
  // Show quality and mode selection
  await ctx.reply(t(lang, "quality_select"), {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🎵 128kbps", callback_data: `dl_128_a_${Buffer.from(url).toString("base64")}` },
          { text: "🎵 320kbps", callback_data: `dl_320_a_${Buffer.from(url).toString("base64")}` }
        ],
        [
          { text: "📹 Video", callback_data: `dl_vid_v_${Buffer.from(url).toString("base64")}` }
        ]
      ]
    }
  });
}

export async function handleDownloadCallback(ctx: Context, data: string) {
  const lang = getLang(ctx);
  const parts = data.split("_");
  if (parts.length < 4) return;

  const quality = parts[1] as "128" | "320" | "vid";
  const mode = parts[2] as "a" | "v";
  const url = Buffer.from(parts[3], "base64").toString();

  await ctx.editMessageText(t(lang, "download_started"));
  
  try {
    const result = await downloadFromUrl(
      url, 
      quality === "320" ? "320" : "128", 
      mode === "a"
    );

    if (result) {
      const { filePath, title, isVideo } = result;
      if (isVideo) {
        await ctx.replyWithVideo({ source: filePath, filename: `${title}.mp4` }, { caption: title });
      } else {
        await ctx.replyWithAudio({ source: filePath, filename: `${title}.mp3` }, { title: title, performer: "Unknown" });
      }
      cleanupFile(filePath);
      await ctx.deleteMessage();
    } else {
      await ctx.editMessageText(t(lang, "download_failed"));
    }
  } catch (error) {
    console.error("Download error:", error);
    await ctx.editMessageText(t(lang, "error"));
  }
}

export function isUrlMessage(text: string): boolean {
  return URL_REGEX.test(text);
}
