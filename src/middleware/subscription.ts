import { Context } from "telegraf";
import { t, Language } from "../locales/i18n";
import { getUser, getRequiredChannel } from "../database/storage";
import { isAdmin } from "../bot";

function getLang(ctx: Context): Language {
  const user = ctx.from ? getUser(ctx.from.id) : undefined;
  return (user?.language as Language) || "en";
}

export async function checkSubscription(ctx: Context): Promise<boolean> {
  const channel = getRequiredChannel();
  if (!channel) return true;
  if (!ctx.from) return false;
  if (isAdmin(ctx.from.id)) return true;
  try {
    const member = await ctx.telegram.getChatMember(channel, ctx.from.id);
    return ["member", "administrator", "creator"].includes(member.status);
  } catch { return true; }
}

export async function requireSubscription(ctx: Context): Promise<boolean> {
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

