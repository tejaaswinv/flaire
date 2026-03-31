"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "../../../components/layout/app-shell";
import PageContainer from "../../../components/ui/page-container";
import SectionCard from "../../../components/ui/section-card";
import Button from "../../../components/ui/button";
import Badge from "../../../components/ui/badge";
import Textarea from "../../../components/ui/textarea";
import {
  loadCommunityPosts,
  saveCommunityPosts,
  loadCommunityReplies,
  saveCommunityReplies,
  type CommunityPost as Post,
  type CommunityReply as Reply,
} from "../../../lib/community-storage";

function timeAgoLabel(createdAt: number) {
  const diffMs = Date.now() - createdAt;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function CommunityPostDetailPage() {
  const params = useParams<{ postId: string }>();
  const postId = String(params.postId);

  const [posts, setPosts] = useState<Post[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyDraft, setReplyDraft] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const [storedPosts, storedReplies] = await Promise.all([
        loadCommunityPosts(),
        loadCommunityReplies(),
      ]);

      if (cancelled) return;

      setPosts(storedPosts);
      setReplies(storedReplies);
      setLoading(false);
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  const post = useMemo(
    () => posts.find((item) => item.id === postId) ?? null,
    [posts, postId]
  );

  const postReplies = useMemo(
    () =>
      replies
        .filter((reply) => reply.postId === postId)
        .sort((a, b) => a.createdAt - b.createdAt),
    [replies, postId]
  );

  const handleLike = async () => {
    if (!post) return;

    const updatedPosts = posts.map((item) =>
      item.id === post.id ? { ...item, likes: item.likes + 1 } : item
    );

    setPosts(updatedPosts);
    await saveCommunityPosts(updatedPosts);
  };

  const handleReply = async () => {
    const body = replyDraft.trim();
    if (!body) return;

    const newReply: Reply = {
      id: crypto.randomUUID(),
      postId,
      author: "You",
      initials: "YO",
      body,
      createdAt: Date.now(),
    };

    const updatedReplies = [...replies, newReply];
    setReplies(updatedReplies);
    await saveCommunityReplies(updatedReplies);
    setReplyDraft("");
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!post) {
    return (
      <AppShell>
        <PageContainer title="Post not found" subtitle="This discussion may have been removed.">
          <Link href="/community">
            <Button variant="soft">Back to Community</Button>
          </Link>
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageContainer
        title="Discussion"
        subtitle="Read the full post and join the conversation"
        actions={
          <Link href="/community">
            <Button variant="soft">Back</Button>
          </Link>
        }
      >
        <div className="space-y-6">
          <SectionCard>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d9c1df] font-semibold text-slate-700">
                {post.initials}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-2xl font-semibold text-slate-800">{post.author}</p>
                  <span className="text-sm text-slate-500">
                    {timeAgoLabel(post.createdAt)}
                  </span>
                  {post.pinned ? <Badge tone="blue">Pinned</Badge> : null}
                </div>

                <h1 className="mt-3 text-3xl font-semibold text-slate-800">
                  {post.title}
                </h1>

                <p className="mt-4 text-slate-600">{post.body}</p>

                <div className="mt-4">
                  <Badge>{post.channel}</Badge>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-5 text-slate-500">
                  <button onClick={handleLike}>♡ {post.likes}</button>
                  <span>💬 {postReplies.length} repl{postReplies.length === 1 ? "y" : "ies"}</span>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Replies" subtitle="Join the thread">
            <div className="space-y-4">
              {postReplies.length === 0 ? (
                <p className="text-slate-500">No replies yet.</p>
              ) : (
                postReplies.map((reply) => (
                  <div
                    key={reply.id}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e7d8ec] text-sm font-semibold text-slate-700">
                        {reply.initials}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{reply.author}</p>
                        <p className="text-xs text-slate-500">
                          {timeAgoLabel(reply.createdAt)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-slate-700">{reply.body}</p>
                  </div>
                ))
              )}

              <div className="pt-2">
                <Textarea
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  placeholder="Write a reply..."
                  rows={4}
                />
                <div className="mt-3">
                  <Button onClick={handleReply}>Reply</Button>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </PageContainer>
    </AppShell>
  );
}