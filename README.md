# Shazim - Telegram Music Bot

Shazim is a Telegram music bot built with TypeScript and Node.js. It features multi-language support, music recognition via Shazam, music/video downloading from various platforms, text search for music, an admin panel, and channel subscription enforcement.

## Features

- **Multi-language support**: Uzbek, Russian, English with auto-detection and manual switching.
- **Music Recognition**: Recognizes music from voice messages, videos, audio, or video messages using Shazam API.
- **Music/Video Download**: Supports downloads from Instagram, VK, TikTok, and YouTube.
- **Text Search**: Fuzzy search for song names or artists.
- **Admin Panel**: Manage users, send broadcasts, and configure channel subscription.
- **Channel Subscription**: Mandatory channel subscription before bot usage.
- **Storage Optimization**: Forwards music to a private Telegram channel to save bot memory/storage.

## Tech Stack

- **Language**: TypeScript
- **Runtime**: Node.js
- **Telegram Bot Framework**: Telegraf
- **Dependencies**: `axios`, `dotenv`
- **Tools**: `yt-dlp`, `ffmpeg`

## Project Structure

```
src/
  bot.ts (main bot file)
  handlers/ (message handlers: start, help, lang, myid, music, downloader, recognition)
  services/ (shazam, downloader, etc.)
  locales/ (language files)
  middleware/ (language detection, subscription check)
  database/ (user storage)
  admin/ (admin panel handlers)
  utils/ (helper functions - currently empty)
  storage/ (channel storage logic)
```

## Setup Instructions

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Husniddin06/Shazim.git
    cd Shazim
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Install `yt-dlp` and `ffmpeg`:**
    ```bash
    sudo apt-get update
    sudo apt-get install -y yt-dlp ffmpeg
    ```

4.  **Configure environment variables:**
    Create a `.env` file in the root directory of the project based on `.env.example`:
    ```
    TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
    RAPIDAPI_KEY=YOUR_RAPIDAPI_KEY
    STORAGE_CHANNEL_ID=-100XXXXXXXXXX # Your Telegram channel ID for storing music (e.g., -1001234567890)
    ADMIN_ID=YOUR_TELEGRAM_ADMIN_ID # Your Telegram user ID
    ```
    -   `TELEGRAM_BOT_TOKEN`: Obtain this from BotFather on Telegram.
    -   `RAPIDAPI_KEY`: Get your API key from RapidAPI for Shazam API.
    -   `STORAGE_CHANNEL_ID`: Create a private Telegram channel and get its ID. Make sure the bot is an administrator in this channel.
    -   `ADMIN_ID`: Your personal Telegram user ID.

5.  **Run the bot:**
    ```bash
    pnpm dev
    ```

## Usage

-   Send `/start` to the bot to begin.
-   Use `/lang` to change the bot's language.
-   Send a song title, artist, lyrics, or an audio/video file to find music.
-   Send a link from Instagram, VK, TikTok, or YouTube to download media.
-   Admin commands are available via `/admin` (after setting your `ADMIN_ID`).
