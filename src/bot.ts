import { Telegraf } from "telegraf";
import type { Context } from "telegraf";
import { t, detectLanguage, Language } from "./locales/i18n";
import { getUser, saveUser, getRequiredChannel, getAdminId, setAdminId } from "./database/storage";
import { startHandler } from "./handlers/start";
import { helpHandler } from "./handlers/help";
import { langHandler, handleLanguageCallback } from "./handlers/lang";
import { myIdHandler } from "./handlers/myid";
import { setAdminHandler, adminPanelHandler, handleAdminCallback, handleAdminMessage } from "./admin/admin";
import { handleTextSearch, handleSongCallback, handleLyricsCallback, handleRecsCallback, handleFavoritesCallback, handleHistoryCommand, handleFeedbackCommand, handleRandomCommand } from "./handlers/music";
import { handleUrlDownload, isUrlMessage, handleDownloadCallback } from "./handlers/downloader";
import { STORAGE_CHANNEL_ID } from "./storage/channelStorage";
import { handleAudioRecognition } from "./handlers/recognition";
import { checkSubscription, requireSubscription } from "./middleware/subscription";
import { searchMusic } from "./services/services";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) { console.error("TELEGRAM_BOT_TOKEN is not set!"); process.exit(1); }

export const bot = new Telegraf(BOT_TOKEN);
export const waitingState = new Map<number, string>();

export function getLang(ctx: Context): Language {
  const user = ctx.from ? getUser(ctx.from.id) : undefined;
  return (user?.language as Language) || "en";
}

export function isAdmin(userId: number): boolean {
  const adminId = getAdminId();
  return adminId > 0 && userId === adminId;
}

// Middleware: User check, Ban check, and Language detection
bot.use(async (ctx, next) => {
  if (ctx.from) {
    let user = getUser(ctx.from.id);
    if (!user) {
      const lang = detectLanguage(ctx.from.language_code);
      user = { 
        id: ctx.from.id, 
        username: ctx.from.username, 
        firstName: ctx.from.first_name, 
        language: lang, 
        createdAt: new Date().toISOString(),
        isBanned: false,
        favorites: [],
        history: []
      };
      saveUser(user);
    } else {
      if (user.isBanned) {
        await ctx.reply(t(user.language as Language, "user_banned"));
        return;
      }
      if (ctx.from.username !== user.username || ctx.from.first_name !== user.firstName) {
        user.username = ctx.from.username;
        user.firstName = ctx.from.first_name;
        saveUser(user);
      }
    }
  }
  await next();
});

// Commands
bot.start(startHandler);
bot.command("help", helpHandler);
bot.command("lang", langHandler);
bot.command("myid", myIdHandler);
bot.command("setadmin", setAdminHandler);
bot.command("admin", adminPanelHandler);
bot.command("favorites", (ctx) => handleFavoritesCallback(ctx, "list"));
bot.command("history", handleHistoryCommand);
bot.command("feedback", handleFeedbackCommand);
bot.command("random", handleRandomCommand);

// Inline Mode
bot.on("inline_query", async (ctx) => {
  const query = ctx.inlineQuery.query;
  if (!query) return;

  try {
    const results = await searchMusic(query);
    const inlineResults = results.map((r) => ({
      type: "article" as const,
      id: String(r.id),
      title: `${r.artist} - ${r.title}`,
      input_message_content: {
        message_text: `🎵 *${r.artist} - ${r.title}*\n💿 Album: ${r.album}`,
        parse_mode: "Markdown" as const,
      },
      reply_markup: {
        inline_keyboard: [[{ text: "⏬ Download", url: `https://t.me/${ctx.botInfo.username}?start=song_${r.id}` }]]
      },
      thumb_url: r.coverUrl,
    }));

    await ctx.answerInlineQuery(inlineResults);
  } catch (e) {
    console.error("Inline query error:", e);
  }
});

// Callback Queries
bot.on("callback_query", async (ctx) => {
  const data = (ctx.callbackQuery as any).data as string;
  if (!data) return;

  // Subscription check
  if (data === "check_sub") {
    const lang = getLang(ctx);
    if (await checkSubscription(ctx)) {
      await ctx.editMessageText(t(lang, "welcome"));
    } else {
      const channel = getRequiredChannel();
      await ctx.editMessageText(t(lang, "subscribe_first"), {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📢 Kanal", url: `https://t.me/${channel.replace("@", "")}` }],
            [{ text: t(lang, "subscribe_check"), callback_data: "check_sub" }],
          ],
        },
      });
    }
    return;
  }

  // Language selection
  if (data.startsWith("lang_")) {
    const newLang = data.replace("lang_", "") as Language;
    await handleLanguageCallback(ctx, newLang);
    return;
  }

  // Admin callbacks
  if (data.startsWith("admin_")) {
    await handleAdminCallback(ctx, data);
    return;
  }

  // Song selection and features
  if (data.startsWith("song_")) {
    const songId = parseInt(data.replace("song_", ""));
    await handleSongCallback(ctx, songId);
    return;
  }
  if (data.startsWith("lyrics_")) {
    const songId = parseInt(data.replace("lyrics_", ""));
    await handleLyricsCallback(ctx, songId);
    return;
  }
  if (data.startsWith("rec_")) {
    const songId = parseInt(data.replace("rec_", ""));
    await handleRecsCallback(ctx, songId);
    return;
  }
  if (data.startsWith("fav_add_")) {
    const songId = parseInt(data.replace("fav_add_", ""));
    await handleFavoritesCallback(ctx, "add", songId);
    return;
  }

  // Download callbacks (quality/mode)
  if (data.startsWith("dl_")) {
    await handleDownloadCallback(ctx, data);
    return;
  }

  await ctx.answerCbQuery();
});

// Messages
bot.on("message", async (ctx) => {
  const msg = ctx.message;
  if (!msg || !ctx.from) return;

  // State handling (Admin or Feedback)
  const state = waitingState.get(ctx.from.id);
  if (state) {
    if (state === "waiting_feedback") {
      await handleAdminMessage(ctx);
      return;
    }
    if (isAdmin(ctx.from.id)) {
      await handleAdminMessage(ctx);
      return;
    }
  }

  if (!(await requireSubscription(ctx))) return;

  // Text search or URL download
  if ("text" in msg && msg.text) {
    if (msg.text.startsWith("/")) {
      // Handle deep linking for songs from inline mode
      if (msg.text.startsWith("/start song_")) {
        const songId = parseInt(msg.text.replace("/start song_", ""));
        await handleSongCallback(ctx, songId);
        return;
      }
      return;
    }
    if (isUrlMessage(msg.text)) {
      await handleUrlDownload(ctx, msg.text);
      return;
    }
    await handleTextSearch(ctx, msg.text);
  }

  // Audio recognition
  if ("voice" in msg || "audio" in msg || "video_note" in msg || "video" in msg) {
    await handleAudioRecognition(ctx);
    return;
  }
});

bot.launch();
console.log("Bot started with enhanced features");
