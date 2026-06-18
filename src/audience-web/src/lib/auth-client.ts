"use client";

import type { BuyerInfo } from "./types";

const usersKey = "ticketbox.mock.users";
const sessionKey = "ticketbox.mock.session";
const authEventName = "ticketbox-auth-change";

export interface AuthUser extends BuyerInfo {
  id: string;
  createdAt: string;
}

interface StoredUser extends AuthUser {
  password: string;
}

interface AuthSession {
  userId: string;
}

export interface AuthResult {
  ok: boolean;
  message: string;
  user?: AuthUser;
}

function fallbackUser(): AuthUser {
  return {
    id: "guest",
    fullName: "Khán giả TicketBox",
    phone: "Chưa cập nhật",
    email: "guest@ticketbox.local",
    createdAt: new Date(0).toISOString(),
  };
}

function readUsers(): StoredUser[] {
  const raw = window.localStorage.getItem(usersKey);
  return raw ? (JSON.parse(raw) as StoredUser[]) : [];
}

function writeUsers(users: StoredUser[]): void {
  window.localStorage.setItem(usersKey, JSON.stringify(users));
}

function publicUser(user: StoredUser): AuthUser {
  return {
    id: user.id,
    fullName: user.fullName,
    phone: user.phone,
    email: user.email,
    createdAt: user.createdAt,
  };
}

function notifyAuthChange(): void {
  window.dispatchEvent(new Event(authEventName));
}

export function getAuthStorageVersion(): string {
  return `${window.localStorage.getItem(usersKey) ?? ""}|${window.localStorage.getItem(sessionKey) ?? ""}`;
}

export function subscribeToAuthStorage(onChange: () => void): () => void {
  function handleStorage(event: StorageEvent): void {
    if (event.key === usersKey || event.key === sessionKey) onChange();
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(authEventName, onChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(authEventName, onChange);
  };
}

export function getCurrentUser(): AuthUser | null {
  const rawSession = window.localStorage.getItem(sessionKey);
  if (!rawSession) return null;

  const session = JSON.parse(rawSession) as AuthSession;
  const user = readUsers().find((item) => item.id === session.userId);
  return user ? publicUser(user) : null;
}

export function getFallbackAuthUser(): AuthUser {
  return fallbackUser();
}

export function registerUser(input: BuyerInfo & { password: string }): AuthResult {
  const users = readUsers();
  const email = input.email.trim().toLowerCase();

  if (users.some((user) => user.email.toLowerCase() === email)) {
    return { ok: false, message: "Email này đã được đăng ký." };
  }

  const user: StoredUser = {
    id: `user-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    fullName: input.fullName.trim(),
    phone: input.phone.trim(),
    email,
    password: input.password,
    createdAt: new Date().toISOString(),
  };
  writeUsers([user, ...users]);
  window.localStorage.setItem(sessionKey, JSON.stringify({ userId: user.id }));
  notifyAuthChange();

  return { ok: true, message: "Đăng ký thành công.", user: publicUser(user) };
}

export function loginUser(input: { email: string; password: string }): AuthResult {
  const email = input.email.trim().toLowerCase();
  const user = readUsers().find((item) => item.email.toLowerCase() === email && item.password === input.password);

  if (!user) {
    return { ok: false, message: "Email hoặc mật khẩu không đúng." };
  }

  window.localStorage.setItem(sessionKey, JSON.stringify({ userId: user.id }));
  notifyAuthChange();

  return { ok: true, message: "Đăng nhập thành công.", user: publicUser(user) };
}

export function logoutUser(): void {
  window.localStorage.removeItem(sessionKey);
  notifyAuthChange();
}
