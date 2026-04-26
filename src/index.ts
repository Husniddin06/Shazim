import { Telegraf } from "telegraf";
import type { Context } from "telegraf";
import { t, detectLanguage, Language } from "./i18n";
import {
  searchMusic,
  downloadAudioBuffer,
  downloadFromUrl,
  cleanupFile,
  recognizeAudioShazam,
} from "./services";
import {
  getUser, saveUser, updateUserLanguage, getAllUsers, getUserCount,
  getRequiredChannel, setRequiredChannel, removeRequiredChannel,
  getAdminId, setAdminId,
} from "./storage";
import * as fs from "fs";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) { console.error("TELEGRAM_BOT_TOKEN is not set!"); process.exit(1); }

const STORAGE_CHANNEL_ID = parseInt(process.env.STORAGE_CHANNEL_ID || "0");
const bot = new Telegraf(BOT_TOKEN);
const waitingState = new Map<number, string>();

function getLang(ctx: Context): Language {
  const user = ctx.from ? getUser(ctx.from.id) : undefined;
  return (user?.language as Language) || "en";
}

function isAdmin(userId: number): boolean {
  const adminId = getAdminId();
  return adminId > 0 && userId === adminId;
}

// Middleware: foydalanuvchini saqlash va tilni aniqlash
bot.use(async (ctx, next) => {
  if (ctx.from) {
    let user = getUser(ctx.from.id);
    if (!user) {
      const lang = detectLanguage(ctx.from.language_code);
      user = { id: ctx.from.id, username: ctx.from.username,
        firstName: ctx.from.first_name, language: lang, createdAt: new Date().toISOString() };
      saveUser(user);
    } else {
      if (ctx.from.username !== user.username || ctx.from.first_name !== user.firstName) {
        user.username = ctx.from.username;
        user.firstName = ctx.from.first_name;
        saveUser(user);
      }
    }
  }
  await next();
});

async function checkSubscription(ctx: Context): Promise<boolean> {
  const channel = getRequiredChannel();
  if (!channel) return true;
  if (!ctx.from) return false;
  if (isAdmin(ctx.from.id)) return true;
  try {
    const member = await ctx.telegram.getChatMember(channel, ctx.from.id);
    return ["member", "administrator", "creator"].includes(member.status);
  } catch { return true; }
}

async function requireSubscription(ctx: Context): Promise<boolean> {
  if (await checkSubscription(ctx)) return true;
  const lang = getLang(ctx);
  const channel = getRequiredChannel();
  await ctx.reply(t(lang, "subscribe_first"), {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📢 Kanal", url: `https://t.me/${channel.replace("@", "")}` }],
        [{ text: t(lang, "subscribe_check"), callback_data: "check_sub" }],
      ],
    },
  });
  return false;
}

// /start
bot.start(async (ctx) => {
  if (!(await requireSubscription(ctx))) return;
  await ctx.reply(t(getLang(ctx), "welcome"));
});

// /help
bot.command("help", async (ctx) => {
  if (!(await requireSubscription(ctx))) return;
  await ctx.reply(t(getLang(ctx), "help"));
});

// /lang - tilni o'zgartirish
bot.command("lang", async (ctx) => {
  await ctx.reply(t(getLang(ctx), "choose_language"), {
    reply_markup: {
      inline_keyboard: [[
        { text: "🇺🇿 O'zbek", callback_data: "lang_uz" },
        { text: "🇷🇺 Русский", callback_data: "lang_ru" },
        { text: "🇬🇧 English", callback_data: "lang_en" },
      ]],
    },
  });
});

// /myid - o'z ID sini ko'rish
bot.command("myid", async (ctx) => {
  await ctx.reply(`🆔 Telegram ID: ${ctx.from.id}`);
});

// /setadmin - birinchi marta admin bo'lish
bot.command("setadmin", async (ctx) => {
  const currentAdmin = getAdminId();
  if (currentAdmin === 0) {
    setAdminId(ctx.from.id);
    await ctx.reply(`✅ Siz admin bo'ldingiz! ID: ${ctx.from.id}`);
  } else if (ctx.from.id === currentAdmin) {
    await ctx.reply(`✅ Siz allaqachon adminsiz. ID: ${ctx.from.id}`);
  } else {
    await ctx.reply("⛔ Admin allaqachon tayinlangan.");
  }
});

// /admin - admin panel
bot.command("admin", async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    await ctx.reply(t(getLang(ctx), "not_admin")); return;
  }
  await showAdminPanel(ctx);
});

async function showAdminPanel(ctx: Context) {
  const lang = getLang(ctx);
  const channel = getRequiredChannel();
  const channelText = channel ? `${t(lang, "current_channel")}: ${channel}` : t(lang, "no_channel");
  await ctx.reply(
    `${t(lang, "admin_panel")}\n\n${t(lang, "total_users")}: ${getUserCount()}\n${channelText}`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: `📊 ${t(lang, "stats")}`, callback_data: "admin_stats" }],
          [{ text: `📢 ${t(lang, "send_ad")}`, callback_data: "admin_ad" }],
          [{ text: `📢 ${t(lang, "set_channel")}`, callback_data: "admin_set_channel" }],
          [{ text: `❌ ${t(lang, "remove_channel")}`, callback_data: "admin_remove_channel" }],
        ],
      },
    }
  );
}

// Callback query handler
bot.on("callback_query", async (ctx) => {
  const data = (ctx.callbackQuery as any).data as string;
  if (!data) return;
  await ctx.answerCbQuery();

  // Obuna tekshirish
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

  // Til tanlash
  if (data.startsWith("lang_")) {
    const newLang = data.replace("lang_", "") as Language;
    if (ctx.from) updateUserLanguage(ctx.from.id, newLang);
    await ctx.editMessageText(t(newLang, "language_changed"));
    return;
  }

  // Qo'shiq tanlash
  if (data.startsWith("song_")) {
    if (!(await requireSubscription(ctx))) return;
    const songId = parseInt(data.replace("song_", ""));
    const lang = getLang(ctx);
    await ctx.editMessageText(t(lang, "downloading"));
    try {
      const { data: trackData } = await (await import("axios")).default.get(
        `https://api.deezer.com/track/${songId}`,
      );
      if (trackData?.preview) {
        const audioBuffer = await downloadAudioBuffer(trackData.preview);
        const caption = `🎵 ${trackData.title}\n👤 ${trackData.artist.name}\n💿 ${trackData.album.title}`;
        await ctx.replyWithAudio(
          { source: audioBuffer, filename: `${trackData.artist.name} - ${trackData.title}.mp3` },
          { caption, title: trackData.title, performer: trackData.artist.name, duration: trackData.duration },
        );
        if (STORAGE_CHANNEL_ID) {
          try {
            await ctx.telegram.sendAudio(STORAGE_CHANNEL_ID,
              { source: audioBuffer, filename: `${trackData.artist.name} - ${trackData.title}.mp3` },
              { caption, title: trackData.title, performer: trackData.artist.name },
            );
          } catch (e) { console.error("Channel save error:", e); }
        }
      } else {
        await ctx.reply(t(lang, "not_found"));
      }
    } catch (error) {
      console.error("Track error:", error);
      await ctx.reply(t(lang, "error"));
    }
    return;
  }

  if (!ctx.from || !isAdmin(ctx.from.id)) return;

  if (data === "admin_stats") {
    const lang = getLang(ctx);
    const users = getAllUsers();
    const today = new Date().toISOString().split("T")[0];
    const todayUsers = users.filter((u) => u.createdAt.startsWith(today)).length;
    await ctx.editMessageText(
      `📊 ${t(lang, "stats")}\n\n${t(lang, "total_users")}: ${users.length}\n📅 Bugun qo'shilgan: ${todayUsers}`,
      { reply_markup: { inline_keyboard: [[{ text: t(lang, "back"), callback_data: "admin_back" }]] } },
    );
  }
  if (data === "admin_ad") {
    waitingState.set(ctx.from.id, "waiting_ad");
    await ctx.editMessageText(t(getLang(ctx), "send_ad_text"));
  }
  if (data === "admin_set_channel") {
    waitingState.set(ctx.from.id, "waiting_channel");
    await ctx.editMessageText(t(getLang(ctx), "send_channel_link"));
  }
  if (data === "admin_remove_channel") {
    removeRequiredChannel();
    await ctx.editMessageText(t(getLang(ctx), "channel_removed"));
  }
  if (data === "admin_back") {
    await showAdminPanel(ctx);
  }
});

const URL_REGEX =
  /https?:\/\/(www\.)?(instagram\.com|tiktok\.com|youtube\.com|youtu\.be|vk\.com|vm\.tiktok\.com|music\.youtube\.com)\S+/i;

// Barcha xabarlar
bot.on("message", async (ctx) => {
  const msg = ctx.message;
  if (!msg || !ctx.from) return;

  // Admin holati: reklama yoki kanal o'rnatish
  if (isAdmin(ctx.from.id)) {
    const state = waitingState.get(ctx.from.id);
    if (state === "waiting_ad") {
      waitingState.delete(ctx.from.id);
      const lang = getLang(ctx);
      await ctx.reply(t(lang, "ad_sending"));
      const users = getAllUsers();
      let success = 0, fail = 0;
      for (const user of users) {
        try {
          await ctx.telegram.copyMessage(user.id, ctx.chat.id, msg.message_id);
          success++;
        } catch { fail++; }
        await new Promise((r) => setTimeout(r, 50));
      }
      await ctx.reply(t(lang, "ad_done", { success, fail }));
      return;
    }
    if (state === "waiting_channel") {
      waitingState.delete(ctx.from.id);
      if ("text" in msg && msg.text) {
        const channel = msg.text.startsWith("@") ? msg.text : `@${msg.text}`;
        setRequiredChannel(channel);
        await ctx.reply(t(getLang(ctx), "channel_set") + ` (${channel})`);
      }
      return;
    }
  }

  if (!(await requireSubscription(ctx))) return;

  // Audio tanib olish
  if ("voice" in msg || "audio" in msg || "video_note" in msg || "video" in msg) {
    await handleAudioRecognition(ctx);
    return;
  }

  // Matn
  if ("text" in msg && msg.text) {
    if (msg.text.startsWith("/")) return;
    const urlMatch = msg.text.match(URL_REGEX);
    if (urlMatch) {
      await handleUrlDownload(ctx, urlMatch[0]);
      return;
    }
    await handleTextSearch(ctx, msg.text);
  }
});

async function handleTextSearch(ctx: Context, query: string) {
  const lang = getLang(ctx);
  const searchMsg = await ctx.reply(t(lang, "searching"));
  try {
    const results = await searchMusic(query);
    if (results.length === 0) {
      await ctx.telegram.editMessageText(ctx.chat!.id, searchMsg.message_id, undefined, t(lang, "not_found"));
      return;
    }
    const buttons = results.map((r) => [{ text: `🎵 ${r.artist} - ${r.title}`, callback_data: `song_${r.id}` }]);
    await ctx.telegram.editMessageText(ctx.chat!.id, searchMsg.message_id, undefined,
      t(lang, "choose_song"), { reply_markup: { inline_keyboard: buttons } });
  } catch {
    await ctx.telegram.editMessageText(ctx.chat!.id, searchMsg.message_id, undefined, t(lang, "error"));
  }
}

async function handleAudioRecognition(ctx: Context) {
  const lang = getLang(ctx);
  const msg = ctx.message as any;
  const recognizeMsg = await ctx.reply(t(lang, "recognizing"));
  try {
    let fileId: string | undefined;
    if (msg.voice) fileId = msg.voice.file_id;
    else if (msg.audio) fileId = msg.audio.file_id;
    else if (msg.video_note) fileId = msg.video_note.file_id;
    else if (msg.video) fileId = msg.video.file_id;
    if (!fileId) {
      await ctx.telegram.editMessageText(ctx.chat!.id, recognizeMsg.message_id, undefined, t(lang, "recognition_failed"));
      return;
    }
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const { data: audioBuffer } = await (await import("axios")).default.get(fileLink.href, { responseType: "arraybuffer" });
    const result = await recognizeAudioShazam(Buffer.from(audioBuffer));
    if (result) {
      const text = `${t(lang, "recognized")}\n\n🎵 ${result.title}\n👤 ${result.artist}`;
      await ctx.telegram.editMessageText(ctx.chat!.id, recognizeMsg.message_id, undefined, text);
      if (result.previewUrl) {
        const preview = await downloadAudioBuffer(result.previewUrl);
        await ctx.replyWithAudio(
          { source: preview, filename: `${result.artist} - ${result.title}.mp3` },
          { caption: `🎵 ${result.title}\n👤 ${result.artist}`, title: result.title, performer: result.artist },
        );
      } else {
        const searchResults = await searchMusic(`${result.artist} ${result.title}`);
        if (searchResults.length > 0) {
          const buttons = searchResults.map((r) => [{ text: `🎵 ${r.artist} - ${r.title}`, callback_data: `song_${r.id}` }]);
          await ctx.reply(t(lang, "choose_song"), { reply_markup: { inline_keyboard: buttons } });
        }
      }
    } else {
      await ctx.telegram.editMessageText(ctx.chat!.id, recognizeMsg.message_id, undefined, t(lang, "recognition_failed"));
    }
  } catch {
    await ctx.telegram.editMessageText(ctx.chat!.id, recognizeMsg.message_id, undefined, t(lang, "recognition_failed"));
  }
}

async function handleUrlDownload(ctx: Context, url: string) {
  const lang = getLang(ctx);
  const dlMsg = await ctx.reply(t(lang, "download_started"));
  try {
    const result = await downloadFromUrl(url);
    if (!result) {
      await ctx.telegram.editMessageText(ctx.chat!.id, dlMsg.message_id, undefined, t(lang, "download_failed"));
      return;
    }
    await ctx.telegram.editMessageText(ctx.chat!.id, dlMsg.message_id, undefined, t(lang, "sending"));
    const fileName = `${result.title}.${result.isVideo ? "mp4" : "mp3"}`;
    if (result.isVideo) {
      await ctx.replyWithVideo(
        { source: fs.createReadStream(result.filePath), filename: fileName },
        { caption: `📹 ${result.title}` },
      );
    } else {
      await ctx.replyWithAudio(
        { source: fs.createReadStream(result.filePath), filename: fileName },
        { caption: `🎵 ${result.title}`, title: result.title },
      );
    }
    if (STORAGE_CHANNEL_ID) {
      try {
        if (result.isVideo) {
          await ctx.telegram.sendVideo(STORAGE_CHANNEL_ID,
            { source: fs.createReadStream(result.filePath), filename: fileName },
            { caption: `📹 ${result.title}` });
        } else {
          await ctx.telegram.sendAudio(STORAGE_CHANNEL_ID,
            { source: fs.createReadStream(result.filePath), filename: fileName },
            { caption: `🎵 ${result.title}`, title: result.title });
        }
      } catch (e) { console.error("Channel save error:", e); }
    }
    cleanupFile(result.filePath);
  } catch {
    await ctx.telegram.editMessageText(ctx.chat!.id, dlMsg.message_id, undefined, t(lang, "download_failed"));
  }
}

bot.catch((err: any) => { console.error("Bot error:", err); });

bot.launch().then(() => { console.log("🤖 Bot started successfully!"); });

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
