"use client";

const DB_NAME = "flaire_community_db";
const STORE_NAME = "community_data";
const DB_VERSION = 2;

const POSTS_KEY = "community_posts";
const REPLIES_KEY = "community_replies";

export type CommunityPost = {
  id: string;
  author: string;
  initials: string;
  title: string;
  body: string;
  channel: string;
  likes: number;
  pinned?: boolean;
  createdAt: number;
};

export type CommunityReply = {
  id: string;
  postId: string;
  author: string;
  initials: string;
  body: string;
  createdAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getValue<T>(key: string, fallback: T): Promise<T> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => {
      const result = request.result;
      resolve(result ?? fallback);
    };

    request.onerror = () => reject(request.error);
  });
}

async function setValue<T>(key: string, value: T): Promise<void> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(value, key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function loadCommunityPosts(): Promise<CommunityPost[]> {
  const posts = await getValue<CommunityPost[]>(POSTS_KEY, []);
  return Array.isArray(posts) ? posts : [];
}

export async function saveCommunityPosts(posts: CommunityPost[]): Promise<void> {
  await setValue(POSTS_KEY, posts);
}

export async function loadCommunityReplies(): Promise<CommunityReply[]> {
  const replies = await getValue<CommunityReply[]>(REPLIES_KEY, []);
  return Array.isArray(replies) ? replies : [];
}

export async function saveCommunityReplies(replies: CommunityReply[]): Promise<void> {
  await setValue(REPLIES_KEY, replies);
}