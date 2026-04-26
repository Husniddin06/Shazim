import { Context } from "telegraf";

export async function myIdHandler(ctx: Context) {
  if (!ctx.from) return;

  await ctx.reply(`🆔 Telegram ID: ${ctx.from.id}`);
}
