export type Language = "uz" | "ru" | "en";

const translations: Record<Language, Record<string, string>> = {
  uz: {
    welcome:
      "👋 Salom!\nMen musiqa topishga yordam beraman 🎶, menga quyidagilardan birini yuboring:\n\n🎵 Qo'shiq nomi yoki ijrochi ismi\n🔤 Qo'shiq so'zlari\n🎙 Musiqali ovozli xabar\n📹 Musiqali video\n🔊 Audio yozuv\n🎥 Musiqali video xabar\n🔗 Instagram, TikTok, YouTube va boshqa saytlardagi videoga havola\n\n🕺 Rohatlaning!",
    searching: "🔍 Qidirilmoqda...",
    not_found: "😕 Hech narsa topilmadi. Boshqa so'z bilan qidirib ko'ring.",
    choose_song: "🎵 Qo'shiqni tanlang:",
    downloading: "⏬ Yuklanmoqda...",
    sending: "📤 Yuborilmoqda...",
    choose_language: "🌐 Tilni tanlang:",
    language_changed: "✅ Til o'zgartirildi!",
    subscribe_first: "📢 Botdan foydalanish uchun kanalga obuna bo'ling:",
    subscribe_check: "✅ Tekshirish",
    admin_panel: "👑 Admin panel",
    total_users: "👥 Jami foydalanuvchilar",
    send_ad: "📢 Reklama yuborish",
    send_ad_text: "📝 Reklama xabarini yuboring (matn, rasm, video yoki audio):",
    ad_sent: "✅ Reklama yuborildi",
    ad_sending: "📤 Reklama yuborilmoqda...",
    ad_done: "✅ Reklama tarqatildi! Yuborildi: {success}, xato: {fail}",
    not_admin: "⛔ Sizda ruxsat yo'q.",
    recognizing: "🎙 Musiqa aniqlanmoqda...",
    recognized: "🎵 Aniqlandi:",
    recognition_failed: "😕 Musiqani aniqlay olmadim. Matn orqali qidirib ko'ring.",
    download_started: "⏬ Yuklab olinmoqda...",
    download_failed: "😕 Yuklab olib bo'lmadi. Havola to'g'riligini tekshiring.",
    back: "⬅️ Orqaga",
    stats: "📊 Statistika",
    set_channel: "📢 Obuna kanalini o'rnatish",
    remove_channel: "❌ Obuna kanalini o'chirish",
    send_channel_link: "Kanal username ni yuboring (masalan: @kanalnom):",
    channel_set: "✅ Obuna kanali o'rnatildi!",
    channel_removed: "✅ Obuna kanali o'chirildi!",
    no_channel: "Obuna kanali o'rnatilmagan",
    current_channel: "Joriy kanal",
    preview_note: "🎵 30 soniyalik ko'rib chiqish",
    error: "❌ Xatolik yuz berdi. Qaytadan urinib ko'ring.",
    help: "📋 Buyruqlar:\n/start - Boshlash\n/lang - Tilni o'zgartirish\n/help - Yordam",
  },
  ru: {
    welcome:
      "👋 Привет!\nЯ помогу найти музыку 🎶, отправь мне что-то из этого:\n\n🎵 Название песни или исполнителя\n🔤 Слова из песни\n🎙 Голосовое сообщение с музыкой\n📹 Видео с музыкой\n🔊 Аудиозапись\n🎥 Видеосообщение с музыкой\n🔗 Ссылку на видео в Instagram, Tik-Tok, YouTube и другие сайты\n\n🕺 Наслаждайся!",
    searching: "🔍 Ищу...",
    not_found: "😕 Ничего не найдено. Попробуйте другой запрос.",
    choose_song: "🎵 Выберите песню:",
    downloading: "⏬ Скачиваю...",
    sending: "📤 Отправляю...",
    choose_language: "🌐 Выберите язык:",
    language_changed: "✅ Язык изменён!",
    subscribe_first: "📢 Для использования бота подпишитесь на канал:",
    subscribe_check: "✅ Проверить",
    admin_panel: "👑 Панель администратора",
    total_users: "👥 Всего пользователей",
    send_ad: "📢 Отправить рекламу",
    send_ad_text: "📝 Отправьте рекламное сообщение (текст, фото, видео или аудио):",
    ad_sent: "✅ Реклама отправлена!",
    ad_sending: "📤 Отправка рекламы...",
    ad_done: "✅ Рассылка завершена! Отправлено: {success}, ошибки: {fail}",
    not_admin: "⛔ У вас нет доступа.",
    recognizing: "🎙 Распознаю музыку...",
    recognized: "🎵 Найдено:",
    recognition_failed: "😕 Не удалось распознать музыку. Попробуйте текстовый поиск.",
    download_started: "⏬ Скачиваю...",
    download_failed: "😕 Не удалось скачать. Проверьте ссылку.",
    back: "⬅️ Назад",
    stats: "📊 Статистика",
    set_channel: "📢 Привязать канал подписки",
    remove_channel: "❌ Отвязать канал подписки",
    send_channel_link: "Отправьте username канала (например: @channelname):",
    channel_set: "✅ Канал подписки привязан!",
    channel_removed: "✅ Канал подписки отвязан!",
    no_channel: "Канал подписки не установлен",
    current_channel: "Текущий канал",
    preview_note: "🎵 30-секундный превью",
    error: "❌ Произошла ошибка. Попробуйте ещё раз.",
    help: "📋 Команды:\n/start - Начать\n/lang - Сменить язык\n/help - Помощь",
  },
  en: {
    welcome:
      "👋 Hi!\nI'll help you find music 🎶, send me one of these:\n\n🎵 Song name or artist\n🔤 Song lyrics\n🎙 Voice message with music\n📹 Video with music\n🔊 Audio recording\n🎥 Video message with music\n🔗 Link to video on Instagram, TikTok, YouTube and other sites\n\n🕺 Enjoy!",
    searching: "🔍 Searching...",
    not_found: "😕 Nothing found. Try a different query.",
    choose_song: "🎵 Choose a song:",
    downloading: "⏬ Downloading...",
    sending: "📤 Sending...",
    choose_language: "🌐 Choose language:",
    language_changed: "✅ Language changed!",
    subscribe_first: "📢 Subscribe to the channel to use the bot:",
    subscribe_check: "✅ Check",
    admin_panel: "👑 Admin Panel",
    total_users: "👥 Total users",
    send_ad: "📢 Send advertisement",
    send_ad_text: "📝 Send the ad message (text, photo, video or audio):",
    ad_sent: "✅ Advertisement sent!",
    ad_sending: "📤 Sending advertisement...",
    ad_done: "✅ Broadcast done! Sent: {success}, errors: {fail}",
    not_admin: "⛔ Access denied.",
    recognizing: "🎙 Recognizing music...",
    recognized: "🎵 Found:",
    recognition_failed: "😕 Could not recognize music. Try text search.",
    download_started: "⏬ Downloading...",
    download_failed: "😕 Could not download. Check the link.",
    back: "⬅️ Back",
    stats: "📊 Statistics",
    set_channel: "📢 Set subscription channel",
    remove_channel: "❌ Remove subscription channel",
    send_channel_link: "Send channel username (e.g.: @channelname):",
    channel_set: "✅ Subscription channel set!",
    channel_removed: "✅ Subscription channel removed!",
    no_channel: "No subscription channel set",
    current_channel: "Current channel",
    preview_note: "🎵 30-second preview",
    error: "❌ An error occurred. Please try again.",
    help: "📋 Commands:\n/start - Start\n/lang - Change language\n/help - Help",
  },
};

export function t(lang: Language, key: string, vars?: Record<string, string | number>): string {
  let text = translations[lang]?.[key] || translations["en"][key] || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}

export function detectLanguage(languageCode?: string): Language {
  if (!languageCode) return "en";
  if (languageCode.startsWith("uz")) return "uz";
  if (languageCode.startsWith("ru")) return "ru";
  return "en";
}
