import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const searchHistoryTable = pgTable("search_history", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  platform: text("platform").notNull(),
  videoTitle: text("video_title"),
  videoAuthor: text("video_author"),
  videoThumbnail: text("video_thumbnail"),
  musicTitle: text("music_title"),
  musicArtist: text("music_artist"),
  musicThumbnail: text("music_thumbnail"),
  searchedAt: timestamp("searched_at").defaultNow().notNull(),
});

export const favoritesTable = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  musicTitle: text("music_title").notNull(),
  musicArtist: text("music_artist"),
  url: text("url").notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});
