import { Context } from "telegraf";
import { t, Language } from "../locales/i18n";
import { recognizeAudioShazam, downloadAudioBuffer, MusicResult } from "../services/services";
import { STORAGE_CHANNEL_ID } from "../storage/channelStorage";
import { addStoredMusic } from "../storage/channelStorage";
import { bot } from "../bot";
import { getUser } from "../database/storage";
import { requireSubscription } from "../middleware/subscription";

function getLang(ctx: Context): Language {
  const user = ctx.from ? getUser(ctx.from.id) : undefined;
  return (user?.language as Language) || "en";
}

export async function handleAudioRecognition(ctx: Context) {
  if (!(await requireSubscription(ctx))) return;
  const lang = getLang(ctx);
  const recognitionMsg = await ctx.reply(t(lang, "recognizing"));

  let fileId: string | undefined;
  if ("voice" in ctx.message!) {
    fileId = ctx.message.voice.file_id;
  } else if ("audio" in ctx.message!) {
    fileId = ctx.message.audio.file_id;
  } else if ("video_note" in ctx.message!) {
    fileId = ctx.message.video_note.file_id;
  } else if ("video" in ctx.message!) {
    fileId = ctx.message.video.file_id;
  }

  if (!fileId) {
    await ctx.telegram.editMessageText(ctx.chat!.id, recognitionMsg.message_id, undefined, t(lang, "recognition_failed"));
    return;
  }

  try {
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const audioBuffer = await downloadAudioBuffer(fileLink.href);
    const result: MusicResult | null = await recognizeAudioShazam(audioBuffer, ctx);

    if (result) {
      const caption = `${t(lang, "recognized")}\n🎵 ${result.title}\n👤 ${result.artist}`;
      if (result.fileId) {
        await ctx.replyWithAudio(result.fileId, { caption });
      } else {
        const sentMessage = await ctx.replyWithAudio(
          { source: result.previewUrl, filename: `${result.artist} - ${result.title}.mp3` },
          { caption, title: result.title, performer: result.artist, duration: result.duration },
        );
        if (STORAGE_CHANNEL_ID && 'audio' in sentMessage && sentMessage.audio?.file_id && result.id) {
          try {
            const forwardedMessage = await bot.telegram.forwardMessage(STORAGE_CHANNEL_ID, ctx.chat!.id, sentMessage.message_id);
            if ('audio' in forwardedMessage && forwardedMessage.audio?.file_id) {
              addStoredMusic(result.id, forwardedMessage.audio.file_id, result.title, result.artist);
            }
          } catch (e) { console.error("Channel save error:", e); }
        }
      }
      await ctx.telegram.deleteMessage(ctx.chat!.id, recognitionMsg.message_id);
    } else {
      await ctx.telegram.editMessageText(ctx.chat!.id, recognitionMsg.message_id, undefined, t(lang, "recognition_failed"));
    }
  } catch (error) {
    console.error("Recognition error:", error);
    await ctx.telegram.editMessageText(ctx.chat!.id, recognitionMsg.message_id, undefined, t(lang, "error"));
  }
}
