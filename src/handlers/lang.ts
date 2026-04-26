import { Context } from "telegraf";
import { t, Language } from "../locales/i18n";
import { updateUserLanguage, getUser } from "../database/storage";

function getLang(ctx: Context): Language {
  const user = ctx.from ? getUser(ctx.from.id) : undefined;
  return (user?.language as Language) || "en";
}

export async function langHandler(ctx: Context) {
  await ctx.reply(t(getLang(ctx), "choose_language"), {
    reply_markup: {
      inline_keyboard: [[
        { text: "🇺🇿 O'zbek", callback_data: "lang_uz" },
        { text: "🇷🇺 Русский", callback_data: "lang_ru" },
        { text: "🇬🇧 English", callback_data: "lang_en" },
      ]],
    },
  });
}

export async function handleLanguageCallback(ctx: Context, newLang: Language) {
  if (ctx.from) updateUserLanguage(ctx.from.id, newLang);
  await ctx.editMessageText(t(newLang, "language_changed"));
}
