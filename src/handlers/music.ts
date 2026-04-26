import { Context } from "telegraf";
import { t, Language } from "../locales/i18n";
import { searchMusic, downloadAudioBuffer, getLyrics, getRecommendations } from "../services/services";
import { getUser, saveUser, getBotSettings } from "../database/storage";
import { bot, waitingState } from "../bot";
import { STORAGE_CHANNEL_ID } from "../storage/channelStorage";
import { getStoredMusic, addStoredMusic } from "../storage/channelStorage";
import { requireSubscription } from "../middleware/subscription";

function getLang(ctx: Context): Language {
  const user = ctx.from ? getUser(ctx.from.id) : undefined;
  return (user?.language as Language) || "en";
}

async function checkDailyLimit(ctx: Context): Promise<boolean> {
  if (!ctx.from) return false;
  const user = getUser(ctx.from.id);
  if (!user) return false;

  const settings = getBotSettings();
  const today = new Date().toISOString().split("T")[0];

  if (!user.dailyUsage || user.dailyUsage.date !== today) {
    user.dailyUsage = { date: today, count: 0 };
  }

  if (user.dailyUsage.count >= settings.dailyLimit) {
    await ctx.reply(t(getLang(ctx), "daily_limit_reached", { limit: settings.dailyLimit }));
    return false;
  }

  user.dailyUsage.count++;
  user.searchCount = (user.searchCount || 0) + 1;
  saveUser(user);

  // Trigger ad if frequency reached
  if (user.searchCount % settings.adFrequency === 0) {
    // In a real bot, you'd send a configured ad here.
    // For now, we just acknowledge the search count.
  }

  return true;
}

export async function handleTextSearch(ctx: Context, query: string) {
  const lang = getLang(ctx);
  
  if (!(await checkDailyLimit(ctx))) return;

  const user = getUser(ctx.from!.id);
  if (user) {
    if (!user.history) user.history = [];
    user.history.unshift({ query, timestamp: new Date().toISOString() });
    user.history = user.history.slice(0, 10); // Keep last 10
    saveUser(user);
  }

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
    await ctx.telegram.editMessageText(ctx.chat!.id, searchMsg.message_id, undefined,
      t(lang, "error"));
  }
}

export async function handleSongCallback(ctx: Context, songId: number) {
  const lang = getLang(ctx);
  const stored = getStoredMusic(songId);
  
  const keyboard = [
    [{ text: t(lang, "lyrics"), callback_data: `lyrics_${songId}` }],
    [{ text: t(lang, "recommendations"), callback_data: `rec_${songId}` }],
    [{ text: t(lang, "favorites"), callback_data: `fav_add_${songId}` }],
    [{ text: t(lang, "audio_effects"), callback_data: `fx_menu_${songId}` }],
    [{ text: t(lang, "share"), switch_inline_query: `${stored?.artist || ""} ${stored?.title || ""}`.trim() }]
  ];

  if (stored) {
    await ctx.replyWithAudio(stored.fileId, { 
      caption: `🎵 ${stored.title}\n👤 ${stored.artist}`,
      reply_markup: { inline_keyboard: keyboard },
      title: stored.title,
      performer: stored.artist
    });
    return;
  }

  if (!(await requireSubscription(ctx))) return;
  
  await ctx.editMessageText(t(lang, "downloading"));
  try {
    const { data: trackData } = await (await import("axios")).default.get(
      `https://api.deezer.com/track/${songId}`,
    );
    if (trackData?.preview) {
      const audioBuffer = await downloadAudioBuffer(trackData.preview);
      const caption = `🎵 ${trackData.title}\n👤 ${trackData.artist.name}\n💿 ${trackData.album.title}`;
      const sentMessage = await ctx.replyWithAudio(
        { source: audioBuffer, filename: `${trackData.artist.name} - ${trackData.title}.mp3` },
        { 
          caption, 
          title: trackData.title, 
          performer: trackData.artist.name, 
          duration: trackData.duration,
          reply_markup: { 
            inline_keyboard: [
              ...keyboard.slice(0, -1),
              [{ text: t(lang, "share"), switch_inline_query: `${trackData.artist.name} ${trackData.title}` }]
            ] 
          }
        },
      );
      if (STORAGE_CHANNEL_ID && 'audio' in sentMessage && sentMessage.audio?.file_id) {
        try {
          const forwardedMessage = await bot.telegram.forwardMessage(STORAGE_CHANNEL_ID, ctx.chat!.id, sentMessage.message_id);
          if ('audio' in forwardedMessage && forwardedMessage.audio?.file_id) {
            addStoredMusic(songId, forwardedMessage.audio.file_id, trackData.title, trackData.artist.name);
          }
        } catch (e) { console.error("Channel save error:", e); }
      }
    } else {
      await ctx.reply(t(lang, "not_found"));
    }
  } catch (error) {
    console.error("Track error:", error);
    await ctx.reply(t(lang, "error"));
  }
}

export async function handleLyricsCallback(ctx: Context, songId: number) {
  const lang = getLang(ctx);
  try {
    const { data: trackData } = await (await import("axios")).default.get(`https://api.deezer.com/track/${songId}`);
    const lyrics = await getLyrics(trackData.artist.name, trackData.title);
    if (lyrics) {
      await ctx.reply(`📜 *${trackData.artist.name} - ${trackData.title}*\n\n${lyrics}`, { parse_mode: "Markdown" });
    } else {
      await ctx.reply(t(lang, "lyrics_not_found"));
    }
  } catch {
    await ctx.reply(t(lang, "error"));
  }
}

export async function handleRecsCallback(ctx: Context, songId: number) {
  const lang = getLang(ctx);
  try {
    const recs = await getRecommendations(songId);
    if (recs.length > 0) {
      const buttons = recs.map((r) => [{ text: `🎵 ${r.artist} - ${r.title}`, callback_data: `song_${r.id}` }]);
      await ctx.reply(t(lang, "recommendations"), { reply_markup: { inline_keyboard: buttons } });
    } else {
      await ctx.reply(t(lang, "not_found"));
    }
  } catch {
    await ctx.reply(t(lang, "error"));
  }
}

export async function handleFavoritesCallback(ctx: Context, action: "add" | "list" | "remove", songId?: number) {
  const lang = getLang(ctx);
  const userId = ctx.from!.id;
  const user = getUser(userId);
  if (!user) return;

  if (action === "add" && songId) {
    if (!user.favorites) user.favorites = [];
    if (!user.favorites.find(f => f.id === songId)) {
      try {
        const { data: trackData } = await (await import("axios")).default.get(`https://api.deezer.com/track/${songId}`);
        user.favorites.push({ id: songId, title: trackData.title, artist: trackData.artist.name });
        saveUser(user);
        await ctx.answerCbQuery(t(lang, "added_to_favorites"));
      } catch {
        await ctx.answerCbQuery(t(lang, "error"));
      }
    } else {
      await ctx.answerCbQuery(t(lang, "added_to_favorites"));
    }
  } else if (action === "list") {
    if (!user.favorites || user.favorites.length === 0) {
      await ctx.reply(t(lang, "history_empty")); // Reusing empty message
      return;
    }
    const buttons = user.favorites.map(f => [{ text: `⭐️ ${f.artist} - ${f.title}`, callback_data: `song_${f.id}` }]);
    await ctx.reply(t(lang, "favorites"), { reply_markup: { inline_keyboard: buttons } });
  }
}

export async function handleHistoryCommand(ctx: Context) {
  const lang = getLang(ctx);
  const user = getUser(ctx.from!.id);
  if (!user || !user.history || user.history.length === 0) {
    await ctx.reply(t(lang, "history_empty"));
    return;
  }
  const historyText = user.history.map((h, i) => `${i + 1}. ${h.query} (${new Date(h.timestamp).toLocaleDateString()})`).join("\n");
  await ctx.reply(`🕒 *${t(lang, "history")}*\n\n${historyText}`, { parse_mode: "Markdown" });
}

export async function handleFeedbackCommand(ctx: Context) {
  const lang = getLang(ctx);
  waitingState.set(ctx.from!.id, "waiting_feedback");
  await ctx.reply(t(lang, "feedback_prompt"));
}

export async function handleRandomCommand(ctx: Context) {
  const lang = getLang(ctx);
  const searchMsg = await ctx.reply(t(lang, "searching"));
  try {
    // Search for a random popular term to get some results
    const randomTerms = ["pop", "rock", "jazz", "dance", "love", "hits"];
    const term = randomTerms[Math.floor(Math.random() * randomTerms.length)];
    const results = await searchMusic(term);
    if (results.length > 0) {
      const randomSong = results[Math.floor(Math.random() * results.length)];
      await ctx.telegram.deleteMessage(ctx.chat!.id, searchMsg.message_id);
      await handleSongCallback(ctx, randomSong.id);
    } else {
      await ctx.telegram.editMessageText(ctx.chat!.id, searchMsg.message_id, undefined, t(lang, "not_found"));
    }
  } catch {
    await ctx.telegram.editMessageText(ctx.chat!.id, searchMsg.message_id, undefined, t(lang, "error"));
  }
}
