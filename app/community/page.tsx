"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/layout/app-shell";
import PageContainer from "../../components/ui/page-container";
import SectionCard from "../../components/ui/section-card";
import Button from "../../components/ui/button";
import Input from "../../components/ui/input";
import Badge from "../../components/ui/badge";
import Textarea from "../../components/ui/textarea";
import Select from "../../components/ui/select";
import Link from "next/link";
import {
  loadCommunityPosts,
  saveCommunityPosts,
  loadCommunityReplies,
  saveCommunityReplies,
  type CommunityPost as Post,
  type CommunityReply as Reply,
} from "../../lib/community-storage";

const CHANNELS = [
  "All Channels",
  "Rheumatoid Arthritis",
  "Lupus",
  "Pain Management",
  "Working Out with Symptoms",
];

const INITIAL_POSTS: Post[] = [
  {
    id: "1",
    author: "Sarah M.",
    initials: "SM",
    title: "Tips for managing morning stiffness",
    body: "I've found that gentle stretching before getting out of bed really helps. Does anyone else have strategies that work?",
    channel: "Pain Management",
    likes: 24,
    pinned: true,
    createdAt: Date.now() - 2 * 60 * 60 * 1000,
  },
  {
    id: "2",
    author: "Michael K.",
    initials: "MK",
    title: "New to RA - feeling overwhelmed",
    body: "Just diagnosed last month. Any advice for someone just starting this journey?",
    channel: "Rheumatoid Arthritis",
    likes: 18,
    createdAt: Date.now() - 4 * 60 * 60 * 1000,
  },
  {
    id: "3",
    author: "Emma L.",
    initials: "EL",
    title: "Sun sensitivity - what products do you use?",
    body: "Looking for recommendations on sunscreen and protective clothing that actually works.",
    channel: "Lupus",
    likes: 31,
    pinned: true,
    createdAt: Date.now() - 6 * 60 * 60 * 1000,
  },
  {
    id: "4",
    author: "David R.",
    initials: "DR",
    title: "Fatigue management strategies",
    body: "The fatigue has been hitting hard lately. What helps you get through the day?",
    channel: "Pain Management",
    likes: 42,
    createdAt: Date.now() - 24 * 60 * 60 * 1000,
  },
];

function timeAgoLabel(createdAt: number) {
  const diffMs = Date.now() - createdAt;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function CommunityPage() {
  const [selectedChannel, setSelectedChannel] = useState("All Channels");
  const [sortMode, setSortMode] = useState<"trending" | "latest">("trending");
  const [search, setSearch] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);

  const [showComposer, setShowComposer] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newChannel, setNewChannel] = useState("Pain Management");

  const [expandedPosts, setExpandedPosts] = useState<string[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingReplyBody, setEditingReplyBody] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const [storedPosts, storedReplies] = await Promise.all([
        loadCommunityPosts(),
        loadCommunityReplies(),
      ]);

      if (cancelled) return;

      if (storedPosts.length > 0) {
        setPosts(storedPosts);
      } else {
        setPosts(INITIAL_POSTS);
        await saveCommunityPosts(INITIAL_POSTS);
      }

      setReplies(storedReplies);
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  const replyCountMap = useMemo(() => {
    const map = new Map<string, number>();
    replies.forEach((reply) => {
      map.set(reply.postId, (map.get(reply.postId) ?? 0) + 1);
    });
    return map;
  }, [replies]);

  const visiblePosts = useMemo(() => {
    let result = [...posts];

    if (selectedChannel !== "All Channels") {
      result = result.filter((post) => post.channel === selectedChannel);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (post) =>
          post.title.toLowerCase().includes(q) ||
          post.body.toLowerCase().includes(q) ||
          post.author.toLowerCase().includes(q)
      );
    }

    if (sortMode === "trending") {
      result.sort((a, b) => {
        const scoreA = a.likes + (replyCountMap.get(a.id) ?? 0) + (a.pinned ? 12 : 0);
        const scoreB = b.likes + (replyCountMap.get(b.id) ?? 0) + (b.pinned ? 12 : 0);
        return scoreB - scoreA;
      });
    } else {
      result.sort((a, b) => b.createdAt - a.createdAt);
    }

    return result;
  }, [posts, search, selectedChannel, sortMode, replyCountMap]);

  const repliesByPost = useMemo(() => {
    const grouped: Record<string, Reply[]> = {};
    replies.forEach((reply) => {
      if (!grouped[reply.postId]) grouped[reply.postId] = [];
      grouped[reply.postId].push(reply);
    });

    Object.values(grouped).forEach((items) =>
      items.sort((a, b) => a.createdAt - b.createdAt)
    );

    return grouped;
  }, [replies]);

  const resetComposer = () => {
    setShowComposer(false);
    setEditingPostId(null);
    setNewTitle("");
    setNewBody("");
    setNewChannel("Pain Management");
  };

  const handleCreateOrUpdatePost = async () => {
    const title = newTitle.trim();
    const body = newBody.trim();
    if (!title || !body) return;

    if (editingPostId) {
      const updatedPosts = posts.map((post) =>
        post.id === editingPostId
          ? { ...post, title, body, channel: newChannel }
          : post
      );
      setPosts(updatedPosts);
      await saveCommunityPosts(updatedPosts);
      resetComposer();
      return;
    }

    const post: Post = {
      id: crypto.randomUUID(),
      author: "You",
      initials: "YO",
      title,
      body,
      channel: newChannel,
      likes: 0,
      createdAt: Date.now(),
    };

    const updated = [post, ...posts];
    setPosts(updated);
    await saveCommunityPosts(updated);

    setSelectedChannel("All Channels");
    setSortMode("latest");
    setSearch("");
    resetComposer();
  };

  const startEditPost = (post: Post) => {
    setEditingPostId(post.id);
    setNewTitle(post.title);
    setNewBody(post.body);
    setNewChannel(post.channel);
    setShowComposer(true);
  };

  const deletePost = async (postId: string) => {
    const updatedPosts = posts.filter((post) => post.id !== postId);
    const updatedReplies = replies.filter((reply) => reply.postId !== postId);

    setPosts(updatedPosts);
    setReplies(updatedReplies);

    await Promise.all([
      saveCommunityPosts(updatedPosts),
      saveCommunityReplies(updatedReplies),
    ]);

    setExpandedPosts((prev) => prev.filter((id) => id !== postId));

    if (editingPostId === postId) {
      resetComposer();
    }
  };

  const handleLike = async (id: string) => {
    const updated = posts.map((post) =>
      post.id === id ? { ...post, likes: post.likes + 1 } : post
    );
    setPosts(updated);
    await saveCommunityPosts(updated);
  };

  const toggleReplies = (postId: string) => {
    setExpandedPosts((prev) =>
      prev.includes(postId)
        ? prev.filter((id) => id !== postId)
        : [...prev, postId]
    );
  };

  const handleReply = async (postId: string) => {
    const body = (replyDrafts[postId] ?? "").trim();
    if (!body) return;

    const reply: Reply = {
      id: crypto.randomUUID(),
      postId,
      author: "You",
      initials: "YO",
      body,
      createdAt: Date.now(),
    };

    const updatedReplies = [...replies, reply];
    setReplies(updatedReplies);
    await saveCommunityReplies(updatedReplies);

    setReplyDrafts((prev) => ({ ...prev, [postId]: "" }));
    if (!expandedPosts.includes(postId)) {
      setExpandedPosts((prev) => [...prev, postId]);
    }
  };

  const startEditReply = (reply: Reply) => {
    setEditingReplyId(reply.id);
    setEditingReplyBody(reply.body);
    if (!expandedPosts.includes(reply.postId)) {
      setExpandedPosts((prev) => [...prev, reply.postId]);
    }
  };

  const cancelEditReply = () => {
    setEditingReplyId(null);
    setEditingReplyBody("");
  };

  const saveEditedReply = async () => {
    const body = editingReplyBody.trim();
    if (!editingReplyId || !body) return;

    const updatedReplies = replies.map((reply) =>
      reply.id === editingReplyId ? { ...reply, body } : reply
    );

    setReplies(updatedReplies);
    await saveCommunityReplies(updatedReplies);
    cancelEditReply();
  };

  const deleteReply = async (replyId: string) => {
    const updatedReplies = replies.filter((reply) => reply.id !== replyId);
    setReplies(updatedReplies);
    await saveCommunityReplies(updatedReplies);

    if (editingReplyId === replyId) {
      cancelEditReply();
    }
  };

  return (
    <AppShell>
      <PageContainer
        title="Community"
        subtitle="Connect with others who understand your journey"
        actions={
          <Button onClick={() => (showComposer ? resetComposer() : setShowComposer(true))}>
            {showComposer ? "Close" : "+ New Post"}
          </Button>
        }
      >
        <div className="space-y-6">
          <SectionCard className="border-0 bg-[#7c9dc9] text-white">
            <h2 className="text-3xl font-semibold">Community</h2>
            <p className="mt-2 text-white/90">
              Connect with others who understand your journey
            </p>
          </SectionCard>

          {showComposer ? (
            <SectionCard
              title={editingPostId ? "Edit Post" : "Create Post"}
              subtitle="Share your experience with the community"
            >
              <div className="space-y-4">
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Post title"
                />

                <Select value={newChannel} onChange={(e) => setNewChannel(e.target.value)}>
                  {CHANNELS.filter((channel) => channel !== "All Channels").map((channel) => (
                    <option key={channel} value={channel}>
                      {channel}
                    </option>
                  ))}
                </Select>

                <Textarea
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="Write your post..."
                  rows={5}
                />

                <div className="flex gap-3">
                  <Button onClick={handleCreateOrUpdatePost}>
                    {editingPostId ? "Save Post" : "Post"}
                  </Button>
                  <Button variant="soft" onClick={resetComposer}>
                    Cancel
                  </Button>
                </div>
              </div>
            </SectionCard>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {CHANNELS.map((channel) => {
              const active = selectedChannel === channel;
              return (
                <button
                  key={channel}
                  onClick={() => setSelectedChannel(channel)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-[#7c9dc9] text-white"
                      : "border border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {channel}
                </button>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-6">
              <SectionCard>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search discussions..."
                    className="md:max-w-[420px]"
                  />

                  <div className="flex gap-2">
                    <Button
                      variant={sortMode === "trending" ? "secondary" : "soft"}
                      onClick={() => setSortMode("trending")}
                    >
                      Trending
                    </Button>
                    <Button
                      variant={sortMode === "latest" ? "secondary" : "soft"}
                      onClick={() => setSortMode("latest")}
                    >
                      Latest
                    </Button>
                  </div>
                </div>
              </SectionCard>

              <div className="space-y-4">
                {visiblePosts.map((post) => {
                  const postReplies = repliesByPost[post.id] ?? [];
                  const isExpanded = expandedPosts.includes(post.id);

                  return (
                    <SectionCard key={post.id}>
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d9c1df] font-semibold text-slate-700">
                          {post.initials}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="text-2xl font-semibold text-slate-800">
                              {post.author}
                            </p>
                            <span className="text-sm text-slate-500">
                              {timeAgoLabel(post.createdAt)}
                            </span>
                            {post.pinned ? <Badge tone="blue">Pinned</Badge> : null}
                          </div>

                         <Link href={`/community/${post.id}`}>
  <h3 className="mt-3 text-2xl font-semibold text-slate-800 hover:underline">
    {post.title}
  </h3>
</Link>

                          <p className="mt-3 text-slate-600">{post.body}</p>

                          <div className="mt-3">
                            <Badge>{post.channel}</Badge>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-5 text-slate-500">
                            <button onClick={() => handleLike(post.id)}>♡ {post.likes}</button>
                            <button onClick={() => toggleReplies(post.id)}>
                              💬 {postReplies.length} repl{postReplies.length === 1 ? "y" : "ies"}
                            </button>
                            <span>↗ Share</span>
                          </div>

                          <div className="mt-4 flex gap-2">
                            <Button variant="soft" onClick={() => startEditPost(post)}>
                              Edit Post
                            </Button>
                            <Button variant="soft" onClick={() => deletePost(post.id)}>
                              Delete Post
                            </Button>
                          </div>

                          {isExpanded ? (
                            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                              <div className="space-y-4">
                                {postReplies.length === 0 ? (
                                  <p className="text-sm text-slate-500">No replies yet.</p>
                                ) : (
                                  postReplies.map((reply) => {
                                    const isEditing = editingReplyId === reply.id;

                                    return (
                                      <div
                                        key={reply.id}
                                        className="rounded-xl border border-slate-200 bg-white p-3"
                                      >
                                        <div className="flex items-center justify-between gap-4">
                                          <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e7d8ec] text-sm font-semibold text-slate-700">
                                              {reply.initials}
                                            </div>
                                            <div>
                                              <p className="font-medium text-slate-800">
                                                {reply.author}
                                              </p>
                                              <p className="text-xs text-slate-500">
                                                {timeAgoLabel(reply.createdAt)}
                                              </p>
                                            </div>
                                          </div>

                                          <div className="flex gap-2">
                                            <Button
                                              variant="soft"
                                              onClick={() => startEditReply(reply)}
                                            >
                                              Edit
                                            </Button>
                                            <button
                                              onClick={() => deleteReply(reply.id)}
                                              className="text-2xl text-slate-500 hover:text-red-500"
                                            >
                                              ×
                                            </button>
                                          </div>
                                        </div>

                                        {isEditing ? (
                                          <div className="mt-3">
                                            <Textarea
                                              value={editingReplyBody}
                                              onChange={(e) => setEditingReplyBody(e.target.value)}
                                              rows={3}
                                            />
                                            <div className="mt-3 flex gap-2">
                                              <Button onClick={saveEditedReply}>Save</Button>
                                              <Button variant="soft" onClick={cancelEditReply}>
                                                Cancel
                                              </Button>
                                            </div>
                                          </div>
                                        ) : (
                                          <p className="mt-3 text-slate-700">{reply.body}</p>
                                        )}
                                      </div>
                                    );
                                  })
                                )}

                                <div className="pt-2">
                                  <Textarea
                                    value={replyDrafts[post.id] ?? ""}
                                    onChange={(e) =>
                                      setReplyDrafts((prev) => ({
                                        ...prev,
                                        [post.id]: e.target.value,
                                      }))
                                    }
                                    placeholder="Write a reply..."
                                    rows={3}
                                  />
                                  <div className="mt-3">
                                    <Button onClick={() => handleReply(post.id)}>
                                      Reply
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </SectionCard>
                  );
                })}

                {visiblePosts.length === 0 ? (
                  <SectionCard>
                    <p className="text-slate-500">No discussions found.</p>
                  </SectionCard>
                ) : null}
              </div>
            </div>

            <div className="space-y-6">
              <SectionCard title="Trending Topics">
                <div className="space-y-4">
                  {[
                    ["Morning Stiffness Tips", 42],
                    ["Medication Side Effects", 38],
                    ["Diet & Inflammation", 35],
                    ["Exercise Routines", 29],
                    ["Sleep Strategies", 24],
                  ].map(([label, count]) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-slate-700">{label}</span>
                      <Badge tone="green">{count}</Badge>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Upcoming Events">
                <div className="space-y-5">
                  <div>
                    <p className="font-semibold text-slate-800">Weekly Support Group</p>
                    <p className="mt-1 text-slate-500">Every Thursday 7PM EST</p>
                    <p className="mt-1 text-sm text-slate-500">45 attending</p>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-800">Yoga for Joint Health</p>
                    <p className="mt-1 text-slate-500">Mar 30, 2026 - 10AM EST</p>
                    <p className="mt-1 text-sm text-slate-500">28 attending</p>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-800">Ask a Rheumatologist</p>
                    <p className="mt-1 text-slate-500">Apr 5, 2026 - 3PM EST</p>
                    <p className="mt-1 text-sm text-slate-500">156 attending</p>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Community Guidelines">
                <div className="space-y-3 text-slate-700">
                  <p>• Be kind and supportive</p>
                  <p>• Respect privacy - no medical advice</p>
                  <p>• Share experiences, not judgments</p>
                  <p>• Report concerning content</p>
                </div>
              </SectionCard>
            </div>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}