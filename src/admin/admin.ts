import { Context } from "telegraf";
import { t, Language } from "../locales/i18n";
import { getUser, saveUser, getAdminId, setAdminId, getUserCount, getRequiredChannel, setRequiredChannel, removeRequiredChannel, getAllUsers, getBotSettings, updateBotSettings } from "../database/storage";
import { isAdmin, waitingState } from "../bot";

function getLang(ctx: Context): Language {
  const user = ctx.from ? getUser(ctx.from.id) : undefined;
  return (user?.language as Language) || "en";
}

export async function setAdminHandler(ctx: Context) {
  if (!ctx.from) return;
  const currentAdmin = getAdminId();
  if (currentAdmin === 0) {
    setAdminId(ctx.from.id);
    await ctx.reply(`✅ Siz admin bo'ldingiz! ID: ${ctx.from.id}`);
  } else if (ctx.from.id === currentAdmin) {
    await ctx.reply(`✅ Siz allaqachon adminsiz. ID: ${ctx.from.id}`);
  } else {
    await ctx.reply("⛔ Admin allaqachon tayinlangan.");
  }
}

export async function adminPanelHandler(ctx: Context) {
  if (!ctx.from) return;
  if (!isAdmin(ctx.from.id)) {
    await ctx.reply(t(getLang(ctx), "not_admin")); return;
  }
  await showAdminPanel(ctx);
}

export async function showAdminPanel(ctx: Context) {
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
          [{ text: `🚫 ${t(lang, "ban_user")}`, callback_data: "admin_ban" }],
          [{ text: `✅ ${t(lang, "unban_user")}`, callback_data: "admin_unban" }],
          [{ text: `📢 ${t(lang, "set_channel")}`, callback_data: "admin_set_channel" }],
          [{ text: `❌ ${t(lang, "remove_channel")}`, callback_data: "admin_remove_channel" }],
        ],
      },
    }
  );
}

export async function handleAdminCallback(ctx: Context, data: string) {
  if (!ctx.from || !isAdmin(ctx.from.id)) return;
  const lang = getLang(ctx);

  if (data === "admin_stats") {
    const users = getAllUsers();
    const today = new Date().toISOString().split("T")[0];
    const todayUsers = users.filter((u) => u.createdAt.startsWith(today)).length;
    
    // Simple stats text as graph replacement
    let statsText = `📊 *${t(lang, "stats")}*\n\n`;
    statsText += `👥 ${t(lang, "total_users")}: ${users.length}\n`;
    statsText += `📅 ${t(lang, "today_users") || "Bugun qo'shilgan"}: ${todayUsers}\n`;
    
    await ctx.editMessageText(statsText, { 
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: [[{ text: t(lang, "back"), callback_data: "admin_back" }]] } 
    });
  }
  if (data === "admin_ad") {
    waitingState.set(ctx.from.id, "waiting_ad");
    await ctx.editMessageText(t(lang, "send_ad_text"));
  }
  if (data === "admin_ban") {
    waitingState.set(ctx.from.id, "waiting_ban");
    await ctx.editMessageText(t(lang, "enter_user_id"));
  }
  if (data === "admin_unban") {
    waitingState.set(ctx.from.id, "waiting_unban");
    await ctx.editMessageText(t(lang, "enter_user_id"));
  }
  if (data === "admin_set_channel") {
    waitingState.set(ctx.from.id, "waiting_channel");
    await ctx.editMessageText(t(lang, "send_channel_link"));
  }
  if (data === "admin_remove_channel") {
    removeRequiredChannel();
    await ctx.editMessageText(t(lang, "channel_removed"));
  }
  if (data === "admin_back") {
    await showAdminPanel(ctx);
  }
}

export async function handleAdminMessage(ctx: Context) {
  const msg = ctx.message;
  if (!msg || !ctx.from || !isAdmin(ctx.from.id)) return;

  const state = waitingState.get(ctx.from.id);
  if (state === "waiting_feedback") {
    waitingState.delete(ctx.from.id);
    const lang = getLang(ctx);
    const adminId = getAdminId();
    if (adminId > 0) {
      await ctx.telegram.sendMessage(adminId, `📩 *New Feedback*\nFrom: ${ctx.from.first_name} (${ctx.from.id})\n\n${"text" in msg ? msg.text : "[Media]"}`, { parse_mode: "Markdown" });
      if (!("text" in msg)) {
        await ctx.telegram.copyMessage(adminId, ctx.chat!.id, msg.message_id);
      }
    }
    await ctx.reply(t(lang, "feedback_sent"));
    return;
  }
  if (state === "waiting_ad") {
    waitingState.delete(ctx.from.id);
    const lang = getLang(ctx);
    await ctx.reply(t(lang, "ad_sending"));
    const users = getAllUsers();
    let success = 0, fail = 0;
    for (const user of users) {
      try {
        if (!ctx.chat) { continue; }
        await ctx.telegram.copyMessage(user.id, ctx.chat.id, msg.message_id);
        success++;
      } catch { fail++; }
      await new Promise((r) => setTimeout(r, 50));
    }
    await ctx.reply(t(lang, "ad_done", { success, fail }));
    return;
  }
  if (state === "waiting_ban") {
    waitingState.delete(ctx.from.id);
    if ("text" in msg && msg.text) {
      const targetId = parseInt(msg.text);
      const targetUser = getUser(targetId);
      if (targetUser) {
        targetUser.isBanned = true;
        saveUser(targetUser);
        await ctx.reply(t(getLang(ctx), "user_banned_success"));
      } else {
        await ctx.reply("User not found.");
      }
    }
    return;
  }
  if (state === "waiting_unban") {
    waitingState.delete(ctx.from.id);
    if ("text" in msg && msg.text) {
      const targetId = parseInt(msg.text);
      const targetUser = getUser(targetId);
      if (targetUser) {
        targetUser.isBanned = false;
        saveUser(targetUser);
        await ctx.reply(t(getLang(ctx), "user_unbanned_success"));
      } else {
        await ctx.reply("User not found.");
      }
    }
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
