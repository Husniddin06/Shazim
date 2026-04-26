import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(process.cwd(), "bot", "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

export interface UserData {
  id: number;
  username?: string;
  firstName?: string;
  language: string;
  createdAt: string;
}

interface BotSettings {
  requiredChannel: string;
  adminId: number;
}

let users: Map<number, UserData> = new Map();
let settings: BotSettings = { requiredChannel: "", adminId: 0 };

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadUsers() {
  ensureDataDir();
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
      users = new Map(data.map((u: UserData) => [u.id, u]));
    }
  } catch {
    users = new Map();
  }
}

function saveUsersToFile() {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(Array.from(users.values()), null, 2));
}

function loadSettings() {
  ensureDataDir();
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
    }
  } catch {
    settings = { requiredChannel: "", adminId: 0 };
  }
}

function saveSettings() {
  ensureDataDir();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

export function getUser(id: number): UserData | undefined {
  return users.get(id);
}

export function saveUser(user: UserData) {
  users.set(user.id, user);
  saveUsersToFile();
}

export function updateUserLanguage(id: number, language: string) {
  const user = users.get(id);
  if (user) {
    user.language = language;
    saveUsersToFile();
  }
}

export function getAllUsers(): UserData[] {
  return Array.from(users.values());
}

export function getUserCount(): number {
  return users.size;
}

export function getRequiredChannel(): string {
  return settings.requiredChannel;
}

export function setRequiredChannel(channel: string) {
  settings.requiredChannel = channel;
  saveSettings();
}

export function removeRequiredChannel() {
  settings.requiredChannel = "";
  saveSettings();
}

export function getAdminId(): number {
  return settings.adminId;
}

export function setAdminId(id: number) {
  settings.adminId = id;
  saveSettings();
}

loadUsers();
loadSettings();
