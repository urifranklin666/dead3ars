'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export interface DiscussionPostView {
  id: number;
  author_id: number;
  author_name: string;
  author_role: string;
  body: string;
  created_at: string;
  replies: DiscussionPostView[];
}

/* The class discussion. Anyone in the class can start a thread or reply; a
 * teacher can delete any post, a student only their own. */
export function DiscussionThread({
  classId,
  threads,
  meId,
  canModerate,
}: {
  classId: number;
  threads: DiscussionPostView[];
  meId: number;
  canModerate: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post(text: string, parentId: number | null) {
    const res = await fetch(`/api/classes/${classId}/discussion`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body: text, parentId }),
    });
    return res.ok;
  }

  async function startThread(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const okRes = await post(body, null);
    setBusy(false);
    if (!okRes) {
      setError('Could not post that.');
      return;
    }
    setBody('');
    router.refresh();
  }

  async function remove(postId: number) {
    if (!confirm('Delete this post?')) return;
    await fetch(`/api/classes/${classId}/discussion?postId=${postId}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={startThread} className="space-y-2">
        <textarea
          className="dz-input min-h-20 resize-y text-sm leading-relaxed"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Ask the class a question, or share something you found."
          maxLength={8000}
        />
        <div className="flex items-center gap-3">
          <button className="dz-btn dz-btn-primary text-sm" type="submit" disabled={busy || body.trim() === ''}>
            {busy ? 'Posting…' : 'Start a thread'}
          </button>
          {error && <span className="text-xs text-danger">{error}</span>}
        </div>
      </form>

      {threads.length === 0 ? (
        <p className="text-sm text-muted">No threads yet. Be the first to post.</p>
      ) : (
        <ul className="space-y-5">
          {threads.map((t) => (
            <li key={t.id} className="space-y-3">
              <Post
                post={t}
                meId={meId}
                canModerate={canModerate}
                onReply={async (text) => {
                  const okRes = await post(text, t.id);
                  if (okRes) router.refresh();
                  return okRes;
                }}
                onDelete={remove}
              />
              {t.replies.length > 0 && (
                <ul className="ml-4 space-y-3 border-l border-line pl-4">
                  {t.replies.map((r) => (
                    <li key={r.id}>
                      <Post
                        post={r}
                        meId={meId}
                        canModerate={canModerate}
                        onReply={async (text) => {
                          const okRes = await post(text, t.id);
                          if (okRes) router.refresh();
                          return okRes;
                        }}
                        onDelete={remove}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Post({
  post,
  meId,
  canModerate,
  onReply,
  onDelete,
}: {
  post: DiscussionPostView;
  meId: number;
  canModerate: boolean;
  onReply: (text: string) => Promise<boolean>;
  onDelete: (id: number) => void;
}) {
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const mine = post.author_id === meId;

  return (
    <div className="dz-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm">
          <span className="font-medium">{post.author_name}</span>
          {post.author_role === 'teacher' && <span className="dz-badge dz-badge-neutral ml-2">teacher</span>}
        </span>
        <span className="text-xs text-muted">
          {post.created_at.slice(0, 16).replace('T', ' ')} UTC
        </span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{post.body}</p>

      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          className="text-xs text-muted hover:text-accent"
          onClick={() => setReplying((v) => !v)}
        >
          {replying ? 'cancel' : 'reply'}
        </button>
        {(mine || canModerate) && (
          <button type="button" className="text-xs text-muted hover:text-danger" onClick={() => onDelete(post.id)}>
            delete
          </button>
        )}
      </div>

      {replying && (
        <div className="mt-2 space-y-2">
          <textarea
            className="dz-input min-h-16 resize-y text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Your reply."
            maxLength={8000}
          />
          <button
            type="button"
            className="dz-btn text-sm"
            disabled={busy || text.trim() === ''}
            onClick={async () => {
              setBusy(true);
              const okRes = await onReply(text);
              setBusy(false);
              if (okRes) {
                setText('');
                setReplying(false);
              }
            }}
          >
            {busy ? 'Posting…' : 'Post reply'}
          </button>
        </div>
      )}
    </div>
  );
}
