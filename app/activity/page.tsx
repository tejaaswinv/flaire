"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/layout/app-shell";
import PageContainer from "../../components/ui/page-container";
import SectionCard from "../../components/ui/section-card";
import Badge from "../../components/ui/badge";
import {
  loadCommunityPosts,
  loadCommunityReplies,
  type CommunityPost as Post,
  type CommunityReply as Reply,
} from "../../lib/community-storage";

type ActivityItem =
  | {
      id: string;
      type: "post";
      createdAt: number;
      title: string;
      description: string;
      postId: string;
      channel: string;
    }
  | {
      id: string;
      type: "reply";
      createdAt: number;
      title: string;
      description: string;
      postId: string;
      channel: string;
    };

function timeAgoLabel(createdAt: number) {
  const diffMs = Date.now() - createdAt;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function ActivityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
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

  const activity = useMemo(() => {
    const postMap = new Map(posts.map((post) => [post.id, post]));

    const items: ActivityItem[] = [
      ...posts.map((post) => ({
        id: `post-${post.id}`,
        type: "post" as const,
        createdAt: post.createdAt,
        title: post.title,
        description: `${post.author} created a post`,
        postId: post.id,
        channel: post.channel,
      })),
      ...replies
        .map((reply) => {
          const parentPost = postMap.get(reply.postId);
          if (!parentPost) return null;

          return {
            id: `reply-${reply.id}`,
            type: "reply" as const,
            createdAt: reply.createdAt,
            title: parentPost.title,
            description: `${reply.author} replied: ${reply.body}`,
            postId: parentPost.id,
            channel: parentPost.channel,
          };
        })
        .filter(Boolean) as ActivityItem[],
    ];

    return items.sort((a, b) => b.createdAt - a.createdAt);
  }, [posts, replies]);

  const stats = useMemo(() => {
    return {
      posts: posts.length,
      replies: replies.length,
      today:
        activity.filter(
          (item) =>
            new Date(item.createdAt).toISOString().slice(0, 10) ===
            new Date().toISOString().slice(0, 10)
        ).length,
    };
  }, [posts, replies, activity]);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <AppShell>
      <PageContainer
        title="Activity"
        subtitle="See the latest community activity in one place"
      >
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <SectionCard>
              <p className="text-sm text-slate-500">Total posts</p>
              <p className="mt-2 text-3xl font-semibold text-slate-800">
                {stats.posts}
              </p>
            </SectionCard>

            <SectionCard>
              <p className="text-sm text-slate-500">Total replies</p>
              <p className="mt-2 text-3xl font-semibold text-slate-800">
                {stats.replies}
              </p>
            </SectionCard>

            <SectionCard>
              <p className="text-sm text-slate-500">Today’s activity</p>
              <p className="mt-2 text-3xl font-semibold text-slate-800">
                {stats.today}
              </p>
            </SectionCard>
          </div>

          <SectionCard title="Recent Activity">
            {activity.length === 0 ? (
              <p className="text-slate-500">No activity yet.</p>
            ) : (
              <div className="space-y-4">
                {activity.map((item) => (
                  <Link key={item.id} href={`/community/${item.postId}`}>
                    <div className="rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge tone={item.type === "post" ? "blue" : "green"}>
                          {item.type === "post" ? "Post" : "Reply"}
                        </Badge>
                        <Badge>{item.channel}</Badge>
                        <span className="text-sm text-slate-500">
                          {timeAgoLabel(item.createdAt)}
                        </span>
                      </div>

                      <h3 className="mt-3 text-xl font-semibold text-slate-800">
                        {item.title}
                      </h3>

                      <p className="mt-2 text-slate-600">{item.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </PageContainer>
    </AppShell>
  );
}