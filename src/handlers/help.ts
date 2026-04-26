import { Context } from "telegraf";
import { t, Language } from "../locales/i18n";
import { getLang } from "../bot";
import { requireSubscription } from "../middleware/subscription";

export async function helpHandler(ctx: Context) {
  if (!(await requireSubscription(ctx))) return;
  await ctx.reply(t(getLang(ctx), "help"));
}
