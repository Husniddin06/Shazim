import { Context } from "telegraf";
import { t } from "../locales/i18n";
import { getLang } from "../bot";
import { requireSubscription } from "../middleware/subscription";
import { handleSongCallback } from "./music";

export async function startHandler(ctx: Context) {
  const text = (ctx.message as any)?.text || "";
  if (text.startsWith("/start song_")) {
    const payload = text.replace(/^/starts+/, "");
    const parts = payload.split("_");
    const songId = Number.parseInt(parts[1], 10);
    const source = parts[2] === "yandex" ? "yandex" : "deezer";
    if (!Number.isFinite(songId)) {
      await ctx.reply(t(getLang(ctx), "not_found"));
      return;
    }
    await handleSongCallback(ctx, songId, source);
    return;
  }

  if (!(await requireSubscription(ctx))) return;
  await ctx.reply(t(getLang(ctx), "welcome"));
}
