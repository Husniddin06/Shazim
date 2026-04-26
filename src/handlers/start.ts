import { Context } from "telegraf";
import { t, Language } from "../locales/i18n";
import { getLang } from "../bot";
import { requireSubscription } from "../middleware/subscription";

import { handleSongCallback } from "./music";

export async function startHandler(ctx: Context) {
  const text = (ctx.message as any)?.text || "";
  if (text.startsWith("/start song_")) {
    const songId = parseInt(text.replace("/start song_", ""));
    await handleSongCallback(ctx, songId);
    return;
  }

  if (!(await requireSubscription(ctx))) return;
  await ctx.reply(t(getLang(ctx), "welcome"));
}
