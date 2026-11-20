"use client";

import { useEffect, useRef, useState } from "react";
import { Bookmark, Heart, MessageCircle, MoreHorizontal, Plus, Repeat2, Send, Volume2, VolumeX, ArrowRight, X } from "lucide-react";

export type SocialMediaPost = {
  id: string; body: string; mediaUrl?: string | null; mediaType?: "image" | "video" | null;
  createdAt: string; authorId: string; authorName: string; likeCount: number; commentCount: number;
  likedByMe: boolean; viewCount?: number; repostCount?: number; shareCount?: number;
  saveCount?: number; savedByMe?: boolean;
};
export type SocialMediaPerson = { id: string; displayName: string; username?: string; followedByMe?: boolean };
export type SocialMediaComment = { id: string; body: string; createdAt: string; authorId: string; authorName: string };

const faDigits = (value: string | number) => String(value).replace(/[0-9]/g, digit => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
export function formatSocialCount(value: number | undefined) {
  const count = Math.max(0, Number(value) || 0);
  if (count < 10000) return faDigits(Math.floor(count).toLocaleString("en-US").replace(/,/g, "٬"));
  const unit = count < 1000000 ? 1000 : 1000000;
  const suffix = count < 1000000 ? " هزار" : " میلیون";
  const rounded = Math.round((count / unit) * 10) / 10;
  return faDigits(String(rounded).replace(".", "٫")) + suffix;
}
const initials = (name: string) => name.trim().slice(0, 1).toLocaleUpperCase() || "N";

function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  return <span className={small ? "nv-social-avatar is-small" : "nv-social-avatar"} aria-hidden="true">{initials(name)}</span>;
}

type FeedMediaProps = {
  post: SocialMediaPost;
  onOpen: () => void;
  onLike: () => void;
  onView: (post: SocialMediaPost) => void;
};

export function FeedMedia({ post, onOpen, onLike, onView }: FeedMediaProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewedRef = useRef(false);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const [muted, setMuted] = useState(true);
  const [showHeart, setShowHeart] = useState(false);
  const [loading, setLoading] = useState(post.mediaType === "video");
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState(0);
  const heartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (post.mediaType !== "video" || !hostRef.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(entries => {
      const entry = entries[0];
      const video = videoRef.current;
      if (!video || !entry) return;
      if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
        video.muted = muted;
        void video.play().then(() => {
          if (!viewedRef.current) { viewedRef.current = true; onView(post); }
        }).catch(() => {
          video.muted = true;
          setMuted(true);
          void video.play().catch(() => setFailed(true));
        });
      } else video.pause();
    }, { threshold: [0, 0.6, 1] });
    observer.observe(hostRef.current);
    return () => { observer.disconnect(); videoRef.current?.pause(); };
  }, [post.id, post.mediaType, muted, onView]);

  useEffect(() => { if (videoRef.current) videoRef.current.muted = muted; }, [muted]);

  function toggleSound(event?: { stopPropagation(): void }) {
    event?.stopPropagation();
    const video = videoRef.current;
    const nextMuted = !muted;
    setMuted(nextMuted);
    if (video) {
      video.volume = 1;
      video.muted = nextMuted;
      if (!nextMuted) void video.play().catch(() => { video.muted = true; setMuted(true); });
    }
  }
  function handleTap() {
    if (longPressed.current) { longPressed.current = false; return; }
    if (tapTimer.current) {
      clearTimeout(tapTimer.current); tapTimer.current = null;
      onLike(); setShowHeart(true);
      if (heartTimer.current) clearTimeout(heartTimer.current);
      heartTimer.current = setTimeout(() => setShowHeart(false), 650);
      return;
    }
    tapTimer.current = setTimeout(() => { tapTimer.current = null; onOpen(); }, 260);
  }
  function startPress() {
    longPressed.current = false;
    longPressTimer.current = setTimeout(() => { longPressed.current = true; videoRef.current?.pause(); }, 360);
  }
  function endPress() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
    if (longPressed.current) void videoRef.current?.play().catch(() => undefined);
  }
  function retryVideo(event: { stopPropagation(): void }) {
    event.stopPropagation(); setFailed(false); setLoading(true);
    const video = videoRef.current;
    if (video) { video.load(); void video.play().catch(() => undefined); }
  }

  if (!post.mediaUrl || !post.mediaType) return null;
  return <div className="nv-feed-media" ref={hostRef} onPointerDown={startPress} onPointerUp={endPress} onPointerCancel={endPress} onPointerLeave={endPress} onContextMenu={event => event.preventDefault()}>
    {post.mediaType === "video"
      ? <video ref={videoRef} src={post.mediaUrl} className="nv-feed-media-el" muted={muted} loop playsInline preload="metadata" poster="https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200&auto=format&fit=crop" onLoadedData={() => {setLoading(false);setFailed(false);}} onCanPlay={() => setLoading(false)} onError={() => {setLoading(false);setFailed(true);}} onTimeUpdate={event => {const v=event.currentTarget; if(v.duration) setProgress(v.currentTime/v.duration*100);}} onClick={event => {event.stopPropagation();handleTap();}}/>
      : <img src={post.mediaUrl} className="nv-feed-media-el" alt="" loading="lazy" onClick={handleTap} onError={event => {event.currentTarget.style.opacity="0";}}/>}
    {post.mediaType === "video" && <>
      {loading && !failed && <span className="nv-media-loading" aria-label="در حال بارگذاری"><i/></span>}
      {failed && <button type="button" className="nv-media-retry" onClick={retryVideo}>↻<small>تلاش دوباره</small></button>}
      <button type="button" className="nv-feed-volume" aria-label={muted ? "فعال‌کردن صدا" : "بی‌صدا کردن"} onClick={toggleSound}>{muted ? <VolumeX/> : <Volume2/>}</button>
      <span className="nv-video-progress"><i style={{width: progress + "%"}}/></span>
    </>}
    {showHeart && <span className="nv-feed-heart-pop"><Heart fill="currentColor"/></span>}
  </div>;
}

type ViewerProps = {
  items: SocialMediaPost[];
  initialIndex?: number;
  mode: "reels" | "explore" | "profile";
  userId: string;
  friends?: SocialMediaPerson[];
  friendsOnly?: boolean;
  onFriendsToggle?: () => void;
  onCreate?: () => void;
  onClose?: () => void;
  onLike: (post: SocialMediaPost) => void;
  onComments: (post: SocialMediaPost) => void;
  onRepost: (post: SocialMediaPost) => void;
  onShare: (post: SocialMediaPost) => void;
  onSave: (post: SocialMediaPost) => void;
  onView: (post: SocialMediaPost) => void;
  onFollow: (person: SocialMediaPerson) => void;
  followingIds?: string[];
  savedPostIds?: string[];
  commentsByPost?: Record<string, SocialMediaComment[]>;
  commentsLoading?: Record<string, boolean>;
  commentDrafts?: Record<string, string>;
  commentsOpenFor?: string | null;
  onCommentDraft?: (postId: string, value: string) => void;
  onSubmitComment?: (post: SocialMediaPost) => void;
};

export function MediaViewer({
  items, initialIndex = 0, mode, userId, friends = [], friendsOnly = false, onFriendsToggle, onCreate, onClose,
  onLike, onComments, onRepost, onShare, onSave, onView, onFollow, followingIds = [], savedPostIds = [],
  commentsByPost = {}, commentsLoading = {}, commentDrafts = {}, commentsOpenFor, onCommentDraft, onSubmitComment
}: ViewerProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const viewedIds = useRef(new Set<string>());
  const tapTimers = useRef<Record<string, ReturnType<typeof setTimeout> | undefined>>({});
  const pressTimers = useRef<Record<string, ReturnType<typeof setTimeout> | undefined>>({});
  const pausedByPress = useRef(new Set<string>());
  const [activeIndex, setActiveIndex] = useState(Math.max(0, initialIndex));
  const [muted, setMuted] = useState(true);
  const [expandedCaption, setExpandedCaption] = useState<string | null>(null);
  const [menuPostId, setMenuPostId] = useState<string | null>(null);
  const [heartPostId, setHeartPostId] = useState<string | null>(null);
  const [volumePulse, setVolumePulse] = useState(false);
  const [videoLoading, setVideoLoading] = useState<Record<string, boolean>>({});
  const [videoFailed, setVideoFailed] = useState<Record<string, boolean>>({});
  const [videoProgress, setVideoProgress] = useState<Record<string, number>>({});
  const volumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const target = root.children[Math.min(initialIndex, Math.max(0, items.length - 1))] as HTMLElement | undefined;
    if (target) root.scrollTop = target.offsetTop;
  }, [initialIndex, items.length]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(".nv-media-slide"));
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const node = entry.target as HTMLElement;
        const index = Number(node.dataset.index || 0);
        const post = items[index];
        const video = node.querySelector("video");
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6 && post) {
          setActiveIndex(index);
          if (!viewedIds.current.has(post.id)) { viewedIds.current.add(post.id); onView(post); }
          if (video) {
            video.muted = muted;
            void video.play().catch(() => {
              video.muted = true;
              setMuted(true);
              void video.play().catch(() => setVideoFailed(current => ({...current,[post.id]:true})));
            });
          }
        } else if (video) {
          video.pause();
        }
      }
    }, { root, threshold: [0, 0.6, 1] });
    nodes.forEach(node => observer.observe(node));
    return () => { observer.disconnect(); root.querySelectorAll("video").forEach(video => video.pause()); };
  }, [items, muted, onView]);

  useEffect(() => {
    const videos = scrollRef.current?.querySelectorAll("video");
    videos?.forEach((video, index) => {
      video.muted = muted;
      video.preload = Math.abs(index - activeIndex) <= 1 ? "auto" : "metadata";
      if (index !== activeIndex) video.pause();
      else void video.play().catch(() => undefined);
    });
  }, [activeIndex, muted]);

  const activePost = items[activeIndex];
  function toggleViewerSound(event?: { stopPropagation(): void }) {
    event?.stopPropagation();
    const nextMuted = !muted;
    setMuted(nextMuted);
    const video = scrollRef.current?.querySelector<HTMLVideoElement>('.nv-media-slide[data-index="' + activeIndex + '"] video');
    if (video) {
      video.volume = 1;
      video.muted = nextMuted;
      if (!nextMuted) void video.play().catch(() => {video.muted = true;setMuted(true);});
    }
    showVolume();
  }
  function retryViewerVideo(post: SocialMediaPost, index: number) {
    setVideoFailed(current => ({...current,[post.id]:false}));
    setVideoLoading(current => ({...current,[post.id]:true}));
    const video = scrollRef.current?.querySelector<HTMLVideoElement>('.nv-media-slide[data-index="' + index + '"] video');
    if (video) {video.load();void video.play().catch(() => undefined);}
  }
  function showVolume() {
    setVolumePulse(true);
    if (volumeTimer.current) clearTimeout(volumeTimer.current);
    volumeTimer.current = setTimeout(() => setVolumePulse(false), 650);
  }
  function handleTap(post: SocialMediaPost, index: number) {
    if (pausedByPress.current.has(post.id)) { pausedByPress.current.delete(post.id); return; }
    const video = scrollRef.current?.querySelector<HTMLElement>(`.nv-media-slide[data-index="${index}"] video`);
    if (tapTimers.current[post.id]) {
      clearTimeout(tapTimers.current[post.id]);
      delete tapTimers.current[post.id];
      onLike(post);
      setHeartPostId(post.id);
      setTimeout(() => setHeartPostId(current => current === post.id ? null : current), 700);
      return;
    }
    tapTimers.current[post.id] = setTimeout(() => {
      delete tapTimers.current[post.id];
      if (video) {
        setMuted(current => !current);
        showVolume();
      }
    }, 250);
  }
  function startLongPress(post: SocialMediaPost, index: number) {
    if (pressTimers.current[post.id]) clearTimeout(pressTimers.current[post.id]);
    pressTimers.current[post.id] = setTimeout(() => {
      pausedByPress.current.add(post.id);
      const video = scrollRef.current?.querySelector<HTMLVideoElement>(`.nv-media-slide[data-index="${index}"] video`);
      video?.pause();
    }, 360);
  }
  function endLongPress(post: SocialMediaPost, index: number) {
    if (pressTimers.current[post.id]) clearTimeout(pressTimers.current[post.id]);
    delete pressTimers.current[post.id];
    if (pausedByPress.current.has(post.id)) {
      const video = scrollRef.current?.querySelector<HTMLVideoElement>(`.nv-media-slide[data-index="${index}"] video`);
      void video?.play().catch(() => undefined);
    }
  }
  const handleScroll = () => {
    const root = scrollRef.current;
    if (!root) return;
    const next = Math.min(items.length - 1, Math.max(0, Math.round(root.scrollTop / Math.max(root.clientHeight, 1))));
    setActiveIndex(next);
  };
  if (!items.length) return <div className={`nv-media-empty mode-${mode}`}>{mode === "reels" ? "هنوز ویدئویی منتشر نشده" : "محتوایی برای نمایش وجود ندارد."}</div>;

  return <section className={`nv-media-viewer mode-${mode}`} role={mode === "reels" ? "region" : "dialog"} aria-modal={mode !== "reels" ? true : undefined}>
    <div className="nv-media-scroll" ref={scrollRef} onScroll={handleScroll}>
      {items.map((post, index) => <article className="nv-media-slide" data-index={index} key={post.id}>
        <div className="nv-media-stage" onClick={() => handleTap(post, index)} onPointerDown={() => startLongPress(post, index)} onPointerUp={() => endLongPress(post, index)} onPointerCancel={() => endLongPress(post, index)} onPointerLeave={() => endLongPress(post, index)} onContextMenu={event => event.preventDefault()}>
          {post.mediaType === "video" && post.mediaUrl
            ? <video src={post.mediaUrl} playsInline loop muted={muted} preload={Math.abs(index - activeIndex) <= 1 ? "auto" : "metadata"} poster="https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200&auto=format&fit=crop" onLoadStart={() => setVideoLoading(current => ({...current,[post.id]:true}))} onLoadedData={() => {setVideoLoading(current => ({...current,[post.id]:false}));setVideoFailed(current => ({...current,[post.id]:false}));}} onCanPlay={() => setVideoLoading(current => ({...current,[post.id]:false}))} onError={() => {setVideoLoading(current => ({...current,[post.id]:false}));setVideoFailed(current => ({...current,[post.id]:true}));}} onTimeUpdate={event => {const v=event.currentTarget;if(v.duration)setVideoProgress(current => ({...current,[post.id]:v.currentTime/v.duration*100}));}} onClick={event => {event.stopPropagation();handleTap(post,index);}} />
            : post.mediaUrl ? <img src={post.mediaUrl} alt="" loading={Math.abs(index - activeIndex) <= 1 ? "eager" : "lazy"} onError={event => {event.currentTarget.style.opacity="0";}} /> : <div className="nv-media-text-fallback">{post.body}</div>}
          {post.mediaType === "video" && post.mediaUrl && <>
            {videoLoading[post.id] && !videoFailed[post.id] && <span className="nv-media-loading"><i/></span>}
            {videoFailed[post.id] && <button type="button" className="nv-media-retry" onClick={event => {event.stopPropagation();retryViewerVideo(post,index);}}>↻<small>تلاش دوباره</small></button>}
            {index === activeIndex && <button type="button" className="nv-viewer-volume" aria-label={muted ? "فعال‌کردن صدا" : "بی‌صدا کردن"} onClick={toggleViewerSound}>{muted ? <VolumeX/> : <Volume2/>}</button>}
            <span className="nv-video-progress"><i style={{width:(videoProgress[post.id] || 0) + "%"}}/></span>
          </>}
          {heartPostId === post.id && <span className="nv-media-heart-pop"><Heart fill="currentColor"/></span>}
          {volumePulse && index === activeIndex && post.mediaType === "video" && <span className="nv-media-volume-pop">{muted ? <VolumeX/> : <Volume2/>}</span>}
        </div>

        {mode === "reels" && index === activeIndex && <div className="nv-media-reels-top" dir="rtl">
          <button type="button" className="nv-media-add" onClick={onCreate} aria-label="ساخت ویدئو"><Plus/></button>
          <strong>Reels</strong>
          <button type="button" className={friendsOnly ? "is-active" : ""} onClick={onFriendsToggle}>دوستان <span className="nv-friend-avatars">{friends.slice(0,3).map(friend => <Avatar key={friend.id} name={friend.displayName} small/>)}</span></button>
        </div>}
        {mode !== "reels" && index === activeIndex && <button type="button" className="nv-media-back" onClick={onClose} aria-label="بازگشت"><ArrowRight/></button>}

        <div className="nv-media-actions" dir="ltr">
          <button type="button" className={post.likedByMe ? "is-liked" : ""} onClick={() => onLike(post)} aria-label="پسندیدن"><Heart fill={post.likedByMe ? "currentColor" : "none"}/><small>{formatSocialCount(post.likeCount)}</small></button>
          <button type="button" onClick={() => onComments(post)} aria-label="دیدن دیدگاه‌ها"><MessageCircle/><small>{formatSocialCount(post.commentCount)}</small></button>
          <button type="button" onClick={() => onRepost(post)} aria-label="بازنشر"><Repeat2/><small>{formatSocialCount(post.repostCount)}</small></button>
          <button type="button" onClick={() => onShare(post)} aria-label="ارسال"><Send/><small>{formatSocialCount(post.shareCount)}</small></button>
          <button type="button" className={post.savedByMe || savedPostIds.includes(post.id) ? "is-saved" : ""} onClick={() => onSave(post)} aria-label="ذخیره"><Bookmark fill={post.savedByMe || savedPostIds.includes(post.id) ? "currentColor" : "none"}/><small>{formatSocialCount(post.saveCount)}</small></button>
          <button type="button" onClick={() => setMenuPostId(current => current === post.id ? null : post.id)} aria-label="گزینه‌های بیشتر"><MoreHorizontal/></button>
          {menuPostId === post.id && <div className="nv-media-more-menu"><button onClick={() => onSave(post)}>ذخیره‌کردن</button><button onClick={() => onShare(post)}>ارسال برای دوست</button></div>}
        </div>

        <div className="nv-media-caption-area" dir="rtl">
          <div className="nv-media-author-row">
            <Avatar name={post.authorName}/>
            <div className="nv-media-author-copy"><strong><bdi dir="auto">{post.authorName}</bdi></strong><small>ویدئوی منتشرشده</small></div>
            {post.authorId !== userId && <button type="button" className="nv-media-follow" onClick={() => onFollow({id:post.authorId,displayName:post.authorName,followedByMe:followingIds.includes(post.authorId)})}>{followingIds.includes(post.authorId) ? "دنبال‌شده" : "دنبال‌کردن"}</button>}
          </div>
          {post.body && <button type="button" className={expandedCaption === post.id ? "nv-media-caption is-expanded" : "nv-media-caption"} onClick={() => setExpandedCaption(current => current === post.id ? null : post.id)}><bdi dir="auto">{post.body}</bdi></button>}
          <small className="nv-media-age">{post.createdAt ? new Intl.DateTimeFormat("fa-IR", { dateStyle:"medium" }).format(new Date(post.createdAt)) : ""}</small>
        </div>

        {commentsOpenFor === post.id && index === activeIndex && <div className="nv-media-comments" dir="rtl">
          <div className="nv-media-comments-head"><strong>دیدگاه‌ها</strong><button type="button" onClick={() => onComments(post)}><X/></button></div>
          <div className="nv-media-comments-list">{commentsLoading[post.id] ? <p>در حال بارگذاری…</p> : (commentsByPost[post.id] || []).length ? (commentsByPost[post.id] || []).map(comment => <div key={comment.id}><Avatar name={comment.authorName} small/><span><b>{comment.authorName}</b> {comment.body}</span></div>) : <p>هنوز نظری ثبت نشده است.</p>}</div>
          <form onSubmit={event => {event.preventDefault();onSubmitComment?.(post);}}><input value={commentDrafts[post.id] || ""} onChange={event => onCommentDraft?.(post.id,event.target.value)} placeholder="نظر خود را بنویس…"/><button type="submit">ارسال</button></form>
        </div>}
      </article>)}
    </div>
    {mode !== "reels" && <button type="button" className="nv-media-close" onClick={onClose} aria-label="بستن"><X/></button>}
  </section>;
}
