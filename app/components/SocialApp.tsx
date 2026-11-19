"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiRequest, clearSession } from "../lib/api";
import MobileBottomNav, { NavKey } from "./MobileBottomNav";

type Language = "en" | "fa" | "ar" | "ku";
type Account = { id: string; email: string; displayName: string; xp?: number; gamesPlayed?: number; role?: string };
type Post = {
  id: string;
  body: string;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | null;
  createdAt: string;
  authorId: string;
  authorName: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};
type Person = {
  id: string;
  displayName: string;
  postCount: number;
  followerCount: number;
  followingCount: number;
  followedByMe: boolean;
};
type Comment = { id: string; body: string; createdAt: string; authorId: string; authorName: string };
type Profile = Person & { email: string; createdAt?: string };

type Props = {
  account: Account;
  language: Language;
  notice?: string;
  onClearNotice: () => void;
  onLanguageChange: (language: Language) => void;
  onLogout: () => void;
};

const copy: Record<Language, Record<string, string>> = {
  fa: {
    home: "خانه", search: "جست‌وجو", create: "ساخت پست", reels: "ویدئوها", profile: "پروفایل", friends: "دوستان", inbox: "پیام‌ها", ai: "هوش مصنوعی",
    hello: "فضای تو، صدای تو", feed: "تازه‌های NOVYRA", feedHint: "چیزهایی که افراد منتشر کرده‌اند",
    shareThought: "چه چیزی در ذهنت می‌گذرد؟", writePost: "چیزی بنویس…", publish: "انتشار", publishing: "در حال انتشار…",
    mediaLink: "لینک مستقیم تصویر یا ویدئو (اختیاری)", mediaHint: "فقط نشانی HTTPS فایل رسانه؛ بارگذاری مستقیم فایل هنوز فعال نیست.",
    image: "تصویر", video: "ویدئو", textOnly: "فقط متن", discover: "کشف آدم‌ها و محتوا", searchPlaceholder: "نام افراد یا موضوع را جست‌وجو کن",
    people: "افراد", posts: "پست‌ها", follow: "دنبال‌کردن", following: "دنبال می‌کنی", noPeople: "هنوز کسی برای نمایش پیدا نشد.",
    noPosts: "هنوز پستی منتشر نشده", noPostsHint: "اولین پست را منتشر کن و گفت‌وگو را شروع کن.",
    noVideos: "هنوز ویدئویی منتشر نشده", noVideosHint: "وقتی پست ویدئویی منتشر شود، اینجا نمایش داده می‌شود.",
    comments: "نظر", writeComment: "نظر خود را بنویس…", send: "ارسال", likes: "پسند", emptyComments: "هنوز نظری ثبت نشده است.",
    yourProfile: "پروفایل تو", editProfile: "ویرایش نام", save: "ذخیره", email: "ایمیل", followers: "دنبال‌کننده", followingCount: "دنبال‌شونده", postCount: "پست",
    settings: "تنظیمات حساب", language: "زبان برنامه", logout: "خروج از حساب", languageSaved: "زبان برنامه تغییر کرد.",
    aiWelcome: "سلام! من دستیار هوشمند NOVYRA هستم.", aiHint: "سؤالت را بنویس؛ می‌توانی برای فکرکردن، نوشتن، برنامه‌ریزی و یادگیری از من کمک بگیری.",
    aiPlaceholder: "پیامت را بنویس…", aiDisclaimer: "پاسخ‌ها ممکن است خطا داشته باشند؛ اطلاعات مهم را بررسی کن.", aiBusy: "در حال فکرکردن…",
    aiError: "پاسخ هوش مصنوعی دریافت نشد. دوباره تلاش کن.", loading: "در حال بارگذاری…", retry: "تلاش دوباره",
    notifications: "اعلان‌ها", noNotifications: "اعلان تازه‌ای نداری.", close: "بستن", postCreated: "پست منتشر شد.", saved: "ذخیره شد.", genericError: "خطایی رخ داد. دوباره تلاش کن.",
    viewAll: "نمایش همه", backHome: "بازگشت به خانه", profileUpdated: "نام نمایشی به‌روزرسانی شد."
  },
  en: {
    home: "Home", search: "Search", create: "Create post", reels: "Reels", profile: "Profile", friends: "Friends", inbox: "Inbox", ai: "AI assistant",
    hello: "Your space. Your voice.", feed: "What’s happening", feedHint: "Recent posts from the NOVYRA community",
    shareThought: "What’s on your mind?", writePost: "Write something…", publish: "Publish", publishing: "Publishing…",
    mediaLink: "Direct image or video link (optional)", mediaHint: "HTTPS media file URL only. Direct file uploads are not enabled yet.",
    image: "Image", video: "Video", textOnly: "Text only", discover: "Discover people and ideas", searchPlaceholder: "Search people or topics",
    people: "People", posts: "Posts", follow: "Follow", following: "Following", noPeople: "No people found yet.",
    noPosts: "No posts yet", noPostsHint: "Publish the first post and start a conversation.",
    noVideos: "No videos yet", noVideosHint: "Video posts will appear here when someone shares one.",
    comments: "Comments", writeComment: "Write a comment…", send: "Send", likes: "Likes", emptyComments: "No comments yet.",
    yourProfile: "Your profile", editProfile: "Edit name", save: "Save", email: "Email", followers: "Followers", followingCount: "Following", postCount: "Posts",
    settings: "Account settings", language: "App language", logout: "Sign out", languageSaved: "App language updated.",
    aiWelcome: "Hello! I’m NOVYRA’s AI assistant.", aiHint: "Ask me anything. I can help you think, write, plan, and learn.",
    aiPlaceholder: "Write your message…", aiDisclaimer: "AI responses can be wrong. Verify important information.", aiBusy: "Thinking…",
    aiError: "The AI assistant could not respond. Please try again.", loading: "Loading…", retry: "Try again",
    notifications: "Notifications", noNotifications: "You’re all caught up.", close: "Close", postCreated: "Your post is live.", saved: "Saved.", genericError: "Something went wrong. Please try again.",
    viewAll: "View all", backHome: "Back home", profileUpdated: "Your display name has been updated."
  },
  ar: {
    home: "الرئيسية", search: "بحث", create: "إنشاء منشور", reels: "فيديوهات", profile: "الملف الشخصي", friends: "الأصدقاء", inbox: "الرسائل", ai: "مساعد الذكاء الاصطناعي",
    hello: "مساحتك. صوتك.", feed: "أحدث المنشورات", feedHint: "ما يشاركه مجتمع NOVYRA",
    shareThought: "بماذا تفكر؟", writePost: "اكتب شيئاً…", publish: "نشر", publishing: "جارٍ النشر…",
    mediaLink: "رابط صورة أو فيديو مباشر (اختياري)", mediaHint: "رابط HTTPS لملف الوسائط فقط. رفع الملفات غير متاح بعد.",
    image: "صورة", video: "فيديو", textOnly: "نص فقط", discover: "اكتشف الأشخاص والمحتوى", searchPlaceholder: "ابحث عن أشخاص أو مواضيع",
    people: "الأشخاص", posts: "المنشورات", follow: "متابعة", following: "تتابعه", noPeople: "لم يتم العثور على أشخاص.",
    noPosts: "لا توجد منشورات بعد", noPostsHint: "انشر أول منشور وابدأ الحوار.",
    noVideos: "لا توجد فيديوهات بعد", noVideosHint: "ستظهر منشورات الفيديو هنا عند مشاركتها.",
    comments: "تعليقات", writeComment: "اكتب تعليقاً…", send: "إرسال", likes: "إعجابات", emptyComments: "لا توجد تعليقات بعد.",
    yourProfile: "ملفك الشخصي", editProfile: "تعديل الاسم", save: "حفظ", email: "البريد الإلكتروني", followers: "المتابعون", followingCount: "يتابع", postCount: "منشورات",
    settings: "إعدادات الحساب", language: "لغة التطبيق", logout: "تسجيل الخروج", languageSaved: "تم تحديث لغة التطبيق.",
    aiWelcome: "مرحباً! أنا مساعد NOVYRA الذكي.", aiHint: "اكتب سؤالك؛ يمكنني مساعدتك في التفكير والكتابة والتخطيط والتعلم.",
    aiPlaceholder: "اكتب رسالتك…", aiDisclaimer: "قد تخطئ إجابات الذكاء الاصطناعي؛ تحقق من المعلومات المهمة.", aiBusy: "جارٍ التفكير…",
    aiError: "تعذر الحصول على إجابة. حاول مرة أخرى.", loading: "جارٍ التحميل…", retry: "إعادة المحاولة",
    notifications: "الإشعارات", noNotifications: "ليس لديك إشعارات جديدة.", close: "إغلاق", postCreated: "تم نشر المنشور.", saved: "تم الحفظ.", genericError: "حدث خطأ. حاول مرة أخرى.",
    viewAll: "عرض الكل", backHome: "العودة للرئيسية", profileUpdated: "تم تحديث اسم العرض."
  },
  ku: {
    home: "سەرەکی", search: "گەڕان", create: "بڵاوکردنەوە", reels: "ڤیدیۆ", profile: "پرۆفایل", friends: "هاوڕێکان", inbox: "نامەکان", ai: "یاریدەدەری زیرەک",
    hello: "شوێنی تۆ. دەنگی تۆ.", feed: "نوێترین بڵاوکراوەکان", feedHint: "ئەوەی ئەندامانی NOVYRA بڵاوی دەکەنەوە",
    shareThought: "لە مێشکتدا چییە؟", writePost: "شتێک بنووسە…", publish: "بڵاوکردنەوە", publishing: "لە بڵاوکردنەوەدایە…",
    mediaLink: "بەستەری ڕاستەوخۆی وێنە یان ڤیدیۆ (ئارەزوومەندانە)", mediaHint: "تەنها بەستەری HTTPS ـی فایل. بارکردنی ڕاستەوخۆی فایل هێشتا چالاک نییە.",
    image: "وێنە", video: "ڤیدیۆ", textOnly: "تەنها دەق", discover: "دۆزینەوەی کەس و ناوەڕۆک", searchPlaceholder: "بەدوای کەس یان بابەتدا بگەڕێ",
    people: "کەسان", posts: "بڵاوکراوەکان", follow: "شوێنکەوتن", following: "شوێنی دەکەویت", noPeople: "هیچ کەسێک نەدۆزرایەوە.",
    noPosts: "هێشتا هیچ بڵاوکراوەیەک نییە", noPostsHint: "یەکەم بڵاوکراوە دروست بکە و گفتوگۆ دەست پێ بکە.",
    noVideos: "هێشتا ڤیدیۆ نییە", noVideosHint: "کاتێک ڤیدیۆ بڵاوکرایەوە لێرە دەردەکەوێت.",
    comments: "کۆمێنت", writeComment: "کۆمێنتێک بنووسە…", send: "ناردن", likes: "پەسەند", emptyComments: "هێشتا کۆمێنت نییە.",
    yourProfile: "پرۆفایلی تۆ", editProfile: "دەستکاریکردنی ناو", save: "پاشەکەوتکردن", email: "ئیمەیڵ", followers: "شوێنکەوتووان", followingCount: "شوێنکەوتن", postCount: "بڵاوکراوە",
    settings: "ڕێکخستنی هەژمار", language: "زمانی ئەپ", logout: "چوونەدەرەوە", languageSaved: "زمانی ئەپ نوێکرایەوە.",
    aiWelcome: "سڵاو! من یاریدەدەری زیرەکی NOVYRA ـم.", aiHint: "پرسیارەکەت بنووسە؛ لە بیرکردنەوە، نووسین، پلان و فێربوون یارمەتیت دەدەم.",
    aiPlaceholder: "نامەکەت بنووسە…", aiDisclaimer: "وەڵامی AI هەندێک جار هەڵە دەبێت؛ زانیاری گرنگ بپشکنە.", aiBusy: "بیر دەکەمەوە…",
    aiError: "وەڵامی یاریدەدەری زیرەک وەرنەگیرا. دووبارە هەوڵ بدەوە.", loading: "بارکردن…", retry: "هەوڵدانەوە",
    notifications: "ئاگادارکردنەوەکان", noNotifications: "ئاگادارکردنەوەی نوێت نییە.", close: "داخستن", postCreated: "بڵاوکراوەکەت بڵاوکرایەوە.", saved: "پاشەکەوت کرا.", genericError: "هەڵەیەک ڕوویدا. دووبارە هەوڵ بدەوە.",
    viewAll: "بینینی هەموو", backHome: "گەڕانەوە بۆ سەرەکی", profileUpdated: "ناوی پیشاندراوت نوێکرایەوە."
  }
};

function initials(name: string) {
  return name.trim().slice(0, 1).toLocaleUpperCase() || "N";
}

function Avatar({ name, size = "normal" }: { name: string; size?: "normal" | "large" }) {
  return <span className={`social-avatar ${size === "large" ? "social-avatar-large" : ""}`} aria-hidden="true">{initials(name)}</span>;
}

function PostMedia({ post }: { post: Post }) {
  if (!post.mediaUrl || !post.mediaType) return null;
  if (post.mediaType === "video") {
    return <video className="social-post-video" src={post.mediaUrl} controls playsInline preload="metadata" />;
  }
  return <a className="social-post-image-wrap" href={post.mediaUrl} target="_blank" rel="noreferrer">
    <img className="social-post-image" src={post.mediaUrl} alt="" loading="lazy" />
  </a>;
}

function PostCard({
  post, t, onLike, onToggleComments, commentsOpen, comments, commentDraft, onCommentDraft,
  onSubmitComment, commentsLoading
}: {
  post: Post; t: Record<string, string>; onLike: (post: Post) => void;
  onToggleComments: (post: Post) => void; commentsOpen: boolean; comments: Comment[];
  commentDraft: string; onCommentDraft: (value: string) => void;
  onSubmitComment: (post: Post) => void; commentsLoading: boolean;
}) {
  const date = new Date(post.createdAt);
  const fallback = `https://picsum.photos/seed/novyra-${encodeURIComponent(post.id)}/900/1100`;
  return <article className="nv-post-card">
    <div className="nv-post-image" style={{ backgroundImage: post.mediaType === "image" && post.mediaUrl ? `url("${post.mediaUrl}")` : `url("${fallback}")` }}>
      {post.mediaType === "video" && post.mediaUrl && <video src={post.mediaUrl} controls playsInline preload="metadata" />}
      <div className="nv-post-shade" />
      <div className="nv-post-author"><Avatar name={post.authorName} /><div><strong>{post.authorName} <span className="nv-verified">●</span></strong><small>@{post.authorName.toLowerCase().replace(/[^a-z0-9]/g,"")} · {Number.isNaN(date.getTime()) ? "NOVYRA" : date.toLocaleDateString()}</small></div></div>
      <button className="nv-post-more" type="button" aria-label="More">•••</button>
      <div className="nv-post-actions">
        <button type="button" className={post.likedByMe ? "liked" : ""} onClick={() => onLike(post)} aria-label={t.likes}><svg viewBox="0 0 24 24"><path d="M20.8 8.7c0 4.7-8.8 10.1-8.8 10.1S3.2 13.4 3.2 8.7A4.2 4.2 0 0 1 11 6.3a4.2 4.2 0 0 1 9.8 2.4Z"/></svg><small>{post.likeCount.toLocaleString()}</small></button>
        <button type="button" onClick={() => onToggleComments(post)} aria-label={t.comments}><svg viewBox="0 0 24 24"><path d="M20.5 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 20l1-4.1a8.5 8.5 0 1 1 16.5-4.4Z"/></svg><small>{post.commentCount.toLocaleString()}</small></button>
        <button type="button" aria-label="Share"><svg viewBox="0 0 24 24"><path d="m21 3-7.2 18-3.6-7.2L3 10.2 21 3Z M10.2 13.8 21 3"/></svg><small>Share</small></button>
        <button type="button" aria-label="Save"><svg viewBox="0 0 24 24"><path d="M6 3.5h12v17l-6-4-6 4z"/></svg><small>Save</small></button>
      </div>
      <div className="nv-post-caption"><div className="nv-progress"><i /></div><p><strong>{post.authorName}</strong> {post.body}</p></div>
    </div>
    {commentsOpen && <div className="social-comments">
      {commentsLoading ? <p className="social-muted">{t.loading}</p> : comments.length ? comments.map(comment => <div className="social-comment" key={comment.id}><Avatar name={comment.authorName} /><div><strong>{comment.authorName}</strong><p>{comment.body}</p></div></div>) : <p className="social-muted">{t.emptyComments}</p>}
      <form className="social-comment-form" onSubmit={event => { event.preventDefault(); onSubmitComment(post); }}>
        <input value={commentDraft} onChange={event => onCommentDraft(event.target.value)} placeholder={t.writeComment} maxLength={1000} /><button type="submit" disabled={!commentDraft.trim()}>{t.send}</button>
      </form>
    </div>}
  </article>;
}

export default function SocialApp({ account, language, notice, onClearNotice, onLanguageChange, onLogout }: Props) {
  const t = copy[language];
  const dir = language === "en" ? "ltr" : "rtl";
  const [active, setActive] = useState<NavKey>("home");
  const [aiOpen, setAiOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Post[]>([]);
  const [searchPosts, setSearchPosts] = useState<Post[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profilePosts, setProfilePosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [query, setQuery] = useState("");
  const [postBody, setPostBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video" | "">("");
  const [publishing, setPublishing] = useState(false);
  const [commentingPost, setCommentingPost] = useState<string | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<string, boolean>>({});
  const [aiMessages, setAiMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [aiDraft, setAiDraft] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiRemaining, setAiRemaining] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; body: string; readAt: string | null; createdAt: string }>>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileName, setProfileName] = useState(account.displayName);
  const [profileSaving, setProfileSaving] = useState(false);

  const notificationCount = useMemo(() => notifications.filter(item => !item.readAt).length, [notifications]);

  useEffect(() => {
    if (notice) setPageError(notice);
  }, [notice]);

  useEffect(() => {
    let alive = true;
    async function loadCurrentPage() {
      setPageError("");
      if (active === "home" || active === "reels") {
        setLoading(true);
        try {
          if (active === "home") {
            const data = await apiRequest<{ posts: Post[] }>("/social/feed");
            if (alive) setPosts(Array.isArray(data.posts) ? data.posts : []);
          } else {
            const data = await apiRequest<{ posts: Post[] }>("/social/reels");
            if (alive) setReels(Array.isArray(data.posts) ? data.posts : []);
          }
        } catch (error) {
          if (alive) setPageError(error instanceof Error ? error.message : t.genericError);
        } finally {
          if (alive) setLoading(false);
        }
      }
      if (active === "search") {
        setSearchLoading(true);
        try {
          const data = await apiRequest<{ users: Person[]; posts: Post[] }>("/social/search");
          if (alive) { setPeople(data.users || []); setSearchPosts(data.posts || []); }
        } catch (error) {
          if (alive) setPageError(error instanceof Error ? error.message : t.genericError);
        } finally {
          if (alive) setSearchLoading(false);
        }
      }
      if (active === "profile") {
        setLoading(true);
        try {
          const data = await apiRequest<{ profile: Profile; posts: Post[] }>("/social/profile");
          if (alive) {
            setProfile(data.profile);
            setProfilePosts(data.posts || []);
            setProfileName(data.profile.displayName || account.displayName);
          }
        } catch (error) {
          if (alive) setPageError(error instanceof Error ? error.message : t.genericError);
        } finally {
          if (alive) setLoading(false);
        }
      }
    }
    void loadCurrentPage();
    return () => { alive = false; };
  }, [active, account.displayName, t.genericError]);

  function navigate(next: NavKey) {
    setAiOpen(false);
    setNotificationsOpen(false);
    setActive(next);
  }

  async function runSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchLoading(true);
    setPageError("");
    try {
      const data = await apiRequest<{ users: Person[]; posts: Post[] }>(`/social/search?q=${encodeURIComponent(query.trim())}`);
      setPeople(data.users || []);
      setSearchPosts(data.posts || []);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t.genericError);
    } finally {
      setSearchLoading(false);
    }
  }

  function updatePost(postId: string, changes: Partial<Post>) {
    setPosts(current => current.map(item => item.id === postId ? { ...item, ...changes } : item));
    setReels(current => current.map(item => item.id === postId ? { ...item, ...changes } : item));
    setSearchPosts(current => current.map(item => item.id === postId ? { ...item, ...changes } : item));
    setProfilePosts(current => current.map(item => item.id === postId ? { ...item, ...changes } : item));
  }

  async function toggleLike(post: Post) {
    try {
      const data = await apiRequest<{ liked: boolean; likeCount: number }>(`/social/posts/${post.id}/like`, { method: "POST" });
      updatePost(post.id, { likedByMe: data.liked, likeCount: data.likeCount });
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t.genericError);
    }
  }

  async function toggleComments(post: Post) {
    if (commentingPost === post.id) { setCommentingPost(null); return; }
    setCommentingPost(post.id);
    setCommentsLoading(current => ({ ...current, [post.id]: true }));
    try {
      const data = await apiRequest<{ comments: Comment[] }>(`/social/posts/${post.id}/comments`);
      setCommentsByPost(current => ({ ...current, [post.id]: data.comments || [] }));
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t.genericError);
    } finally {
      setCommentsLoading(current => ({ ...current, [post.id]: false }));
    }
  }

  async function submitComment(post: Post) {
    const body = (commentDrafts[post.id] || "").trim();
    if (!body) return;
    try {
      const data = await apiRequest<{ comment: Comment }>(`/social/posts/${post.id}/comments`, { method: "POST", body: JSON.stringify({ body }) });
      setCommentsByPost(current => ({ ...current, [post.id]: [...(current[post.id] || []), data.comment] }));
      setCommentDrafts(current => ({ ...current, [post.id]: "" }));
      updatePost(post.id, { commentCount: post.commentCount + 1 });
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t.genericError);
    }
  }

  async function followPerson(person: Person) {
    try {
      const data = await apiRequest<{ following: boolean }>(`/social/users/${person.id}/follow`, { method: "POST" });
      setPeople(current => current.map(item => item.id === person.id ? { ...item, followedByMe: data.following, followerCount: Math.max(0, item.followerCount + (data.following ? 1 : -1)) } : item));
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t.genericError);
    }
  }

  async function publishPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = postBody.trim();
    const cleanMedia = mediaUrl.trim();
    if (!body && !cleanMedia) return;
    setPublishing(true);
    setPageError("");
    try {
      await apiRequest("/social/posts", { method: "POST", body: JSON.stringify({ body, mediaUrl: cleanMedia || null, mediaType: cleanMedia ? mediaType || null : null }) });
      setPostBody("");
      setMediaUrl("");
      setMediaType("");
      setActive("home");
      setAiOpen(false);
      const data = await apiRequest<{ posts: Post[] }>("/social/feed");
      setPosts(data.posts || []);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t.genericError);
    } finally {
      setPublishing(false);
    }
  }

  async function sendAI(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = aiDraft.trim();
    if (!content || aiBusy) return;
    const nextMessages = [...aiMessages, { role: "user" as const, content }];
    setAiMessages(nextMessages);
    setAiDraft("");
    setAiBusy(true);
    setPageError("");
    try {
      const data = await apiRequest<{ reply: string; remainingToday: number }>("/ai/chat", {
        method: "POST",
        body: JSON.stringify({ messages: nextMessages.slice(-12) })
      });
      setAiMessages(current => [...current, { role: "assistant", content: data.reply }]);
      if (typeof data.remainingToday === "number") setAiRemaining(data.remainingToday);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t.aiError);
      setAiMessages(current => current.filter((item, index) => !(index === current.length - 1 && item.role === "user" && item.content === content)));
    } finally {
      setAiBusy(false);
    }
  }

  async function loadNotifications() {
    if (notificationsOpen) { setNotificationsOpen(false); return; }
    setNotificationsOpen(true);
    try {
      const data = await apiRequest<{ notifications: Array<{ id: string; title: string; body: string; readAt: string | null; createdAt: string }> }>("/notifications");
      setNotifications(data.notifications || []);
      if ((data.notifications || []).some(item => !item.readAt)) {
        await apiRequest("/notifications/read", { method: "POST" });
        setNotifications(current => current.map(item => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
      }
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t.genericError);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = profileName.trim();
    if (clean.length < 2) return;
    setProfileSaving(true);
    try {
      await apiRequest("/auth/profile", { method: "PATCH", body: JSON.stringify({ name: clean }) });
      localStorage.setItem("projectx-account", JSON.stringify({ name: clean, email: account.email }));
      setPageError(t.profileUpdated);
      const data = await apiRequest<{ profile: Profile; posts: Post[] }>("/social/profile");
      setProfile(data.profile);
      setProfilePosts(data.posts || []);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t.genericError);
    } finally {
      setProfileSaving(false);
    }
  }

  async function logout() {
    try { await apiRequest("/auth/logout", { method: "POST" }); } catch { /* Local sign-out still removes the token. */ }
    clearSession();
    onLogout();
  }

  function changeLanguage(value: string) {
    if (!(["fa", "en", "ar", "ku"] as string[]).includes(value)) return;
    const next = value as Language;
    localStorage.setItem("projectx-language", next);
    document.documentElement.lang = next;
    document.documentElement.dir = next === "en" ? "ltr" : "rtl";
    onLanguageChange(next);
    setPageError(copy[next].languageSaved);
  }

  const pageTitle = aiOpen ? t.ai : t[active];
  const visiblePosts = active === "reels" ? reels : posts;

  function renderPost(post: Post) {
    return <PostCard key={post.id} post={post} t={t} onLike={toggleLike} onToggleComments={toggleComments}
      commentsOpen={commentingPost === post.id} comments={commentsByPost[post.id] || []}
      commentDraft={commentDrafts[post.id] || ""} onCommentDraft={value => setCommentDrafts(current => ({ ...current, [post.id]: value }))}
      onSubmitComment={submitComment} commentsLoading={Boolean(commentsLoading[post.id])} />;
  }

  return <main className="social-app" dir={dir}>
    <div className="social-app-frame">
      <header className="social-topbar">
        <button type="button" className="social-wordmark" onClick={() => navigate("home")} aria-label="NOVYRA home">
          <span className="social-brand-mark">N</span><span>NOVYRA</span>
        </button>
        <div className="social-topbar-right">
          <span className="social-online-label">YOUR SOCIAL SPACE</span>
          <button type="button" className="social-notification-button" onClick={loadNotifications} aria-label={t.notifications}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" /></svg>
            {notificationCount > 0 && <i />}
          </button>
          <Avatar name={profile?.displayName || account.displayName} />
        </div>
      </header>

      {notificationsOpen && <section className="social-notifications-panel" aria-label={t.notifications}>
        <div className="social-panel-heading"><strong>{t.notifications}</strong><button type="button" onClick={() => setNotificationsOpen(false)}>{t.close}</button></div>
        {notifications.length ? notifications.map(item => <div className="social-notification-row" key={item.id}><strong>{item.title}</strong><p>{item.body}</p></div>) : <p className="social-muted">{t.noNotifications}</p>}
      </section>}

      <div className="social-layout">
        <aside className="social-sidebar">
          <div className="social-sidebar-kicker">NOVYRA / COMMUNITY</div>
          {(["home", "search", "reels", "profile"] as NavKey[]).map(item => <button type="button" key={item} className={active === item && !aiOpen ? "social-side-link is-active" : "social-side-link"} onClick={() => navigate(item)}>
            <span className="social-side-dot" />{t[item]}
          </button>)}
          <button type="button" className="social-side-ai" onClick={() => setAiOpen(true)}><span>✦</span>{t.ai}</button>
          <div className="social-sidebar-account"><Avatar name={profile?.displayName || account.displayName} /><div><strong>{profile?.displayName || account.displayName}</strong><small>{account.email}</small></div></div>
        </aside>

        <section className="social-main-column">
          <div className="social-page-heading">
            <div><span className="social-eyebrow">{aiOpen ? "NOVYRA / AI" : "NOVYRA / COMMUNITY"}</span><h1>{pageTitle}</h1></div>
            <span className="social-page-glyph">{aiOpen ? "✦" : active === "reels" ? "▣" : active === "search" ? "⌕" : active === "profile" ? "◉" : active === "create" ? "+" : "N"}</span>
          </div>

          {pageError && <div className="social-alert" role="status"><span>{pageError}</span><button type="button" onClick={() => { setPageError(""); onClearNotice(); }}>×</button></div>}

          {aiOpen && <section className="social-ai-screen">
            <div className="social-ai-intro"><div className="social-ai-orb">✦</div><h2>{t.aiWelcome}</h2><p>{t.aiHint}</p></div>
            <div className="social-ai-chat" aria-live="polite">
              {aiMessages.map((message, index) => <div className={`social-ai-message ${message.role === "user" ? "from-user" : "from-ai"}`} key={index}><div className="social-ai-message-label">{message.role === "user" ? account.displayName : "NOVYRA AI"}</div><p>{message.content}</p></div>)}
              {aiBusy && <div className="social-ai-message from-ai"><div className="social-ai-message-label">NOVYRA AI</div><p className="social-ai-thinking">{t.aiBusy}</p></div>}
            </div>
            <form className="social-ai-composer" onSubmit={sendAI}>
              <textarea value={aiDraft} onChange={event => setAiDraft(event.target.value)} placeholder={t.aiPlaceholder} rows={2} maxLength={8000} />
              <button type="submit" disabled={!aiDraft.trim() || aiBusy} aria-label={t.send}><span>↑</span></button>
            </form>
            <p className="social-ai-disclaimer">{t.aiDisclaimer}{aiRemaining !== null ? ` · ${aiRemaining}` : ""}</p>
          </section>}

          {!aiOpen && active === "home" && <section className="social-feed-screen">
            <div className="nv-top-tabs"><button className="active" onClick={() => navigate("home")}>Feed<i /></button><button onClick={() => navigate("home")}>Following</button><button onClick={() => navigate("reels")}>Reels</button><span className="nv-top-spacer" /><button className="nv-round-action" onClick={() => navigate("search")} aria-label="Search">⌕</button><button className="nv-round-action nv-bell" onClick={loadNotifications} aria-label="Notifications">♧<i /></button></div>
            <div className="nv-stories"><button className="nv-story add" onClick={() => navigate("create")}><span><b>＋</b></span><small>Add Story</small></button>{["Lizaa","Jacks","Luiz","Julien","Nina"].map((name,i)=><button className="nv-story" key={name}><span><img src={`https://picsum.photos/seed/novyra-story-${i}/120/120`} alt="" /></span><small>{name}</small></button>)}</div>
            <div className="social-feed-intro"><div><h2>{t.feed}</h2><p>{t.feedHint}</p></div><button type="button" onClick={() => navigate("create")}>＋</button></div>
            <button type="button" className="social-thought-launcher" onClick={() => navigate("create")}><Avatar name={account.displayName} /><span>{t.shareThought}</span><b>＋</b></button>
            {loading ? <p className="social-muted social-center">{t.loading}</p> : posts.length ? <div className="social-post-list">{posts.map(renderPost)}</div> : <div className="social-empty-state"><span className="social-empty-mark">N</span><h2>{t.noPosts}</h2><p>{t.noPostsHint}</p><button type="button" onClick={() => navigate("create")}>{t.create} <span>↗</span></button></div>}
          </section>}

          {!aiOpen && active === "search" && <section className="social-search-screen">
            <form className="social-search-form" onSubmit={runSearch}><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t.searchPlaceholder} /><button type="submit">{t.search}</button></form>
            {searchLoading ? <p className="social-muted social-center">{t.loading}</p> : <>
              <div className="social-section-heading"><h2>{t.people}</h2></div>
              {people.length ? <div className="social-people-list">{people.map(person => <article className="social-person-card" key={person.id}>
                <Avatar name={person.displayName} size="large" />
                <div className="social-person-info"><strong>{person.displayName}</strong><small>{person.followerCount.toLocaleString()} · {t.followers}</small></div>
                <button type="button" className={person.followedByMe ? "is-following" : ""} onClick={() => followPerson(person)}>{person.followedByMe ? t.following : t.follow}</button>
              </article>)}</div> : <p className="social-muted">{t.noPeople}</p>}
              {searchPosts.length > 0 && <><div className="social-section-heading"><h2>{t.posts}</h2></div><div className="social-post-list">{searchPosts.map(renderPost)}</div></>}
            </>}
          </section>}

          {!aiOpen && (active === "friends" || active === "inbox") && <section className="nv-placeholder"><div className="nv-placeholder-icon">{active === "friends" ? "♧" : "✉"}</div><h2>{active === "friends" ? t.friends : t.inbox}</h2><p>{active === "friends" ? "Find and connect with people on NOVYRA." : "Your conversations will appear here."}</p></section>}

          {!aiOpen && active === "create" && <section className="social-create-screen">
            <div className="social-create-card">
              <div className="social-create-heading"><Avatar name={account.displayName} size="large" /><div><strong>{account.displayName}</strong><small>{t.shareThought}</small></div></div>
              <form onSubmit={publishPost}>
                <textarea value={postBody} onChange={event => setPostBody(event.target.value)} placeholder={t.writePost} maxLength={2000} rows={7} />
                <div className="social-media-link"><label htmlFor="social-media-url">{t.mediaLink}</label><input id="social-media-url" type="url" dir="ltr" value={mediaUrl} onChange={event => setMediaUrl(event.target.value)} placeholder="https://example.com/media.jpg" /></div>
                {mediaUrl && <div className="social-media-type"><button type="button" className={mediaType === "image" ? "selected" : ""} onClick={() => setMediaType("image")}>{t.image}</button><button type="button" className={mediaType === "video" ? "selected" : ""} onClick={() => setMediaType("video")}>{t.video}</button></div>}
                <p className="social-field-note">{t.mediaHint}</p>
                <div className="social-create-footer"><span>{postBody.length}/2000</span><button type="submit" disabled={publishing || (!postBody.trim() && !mediaUrl.trim())}>{publishing ? t.publishing : t.publish} <span>↗</span></button></div>
              </form>
            </div>
          </section>}

          {!aiOpen && active === "reels" && <section className="nv-reels-screen">
            <div className="nv-top-tabs nv-reels-tabs"><button onClick={() => navigate("home")}>Feed</button><button>Following</button><button className="active">Reels<i /></button><span className="nv-top-spacer" /><button className="nv-round-action" onClick={() => navigate("search")}>⌕</button><button className="nv-round-action nv-bell" onClick={loadNotifications}>♧<i /></button></div>
            {loading ? <p className="social-muted social-center">{t.loading}</p> : reels.length ? <div className="nv-reels-stack">{reels.map((post,i)=><div className="nv-reel" key={post.id} style={{backgroundImage:`linear-gradient(0deg,rgba(0,0,0,.72),transparent 55%),url("${post.mediaType==="image"&&post.mediaUrl?post.mediaUrl:`https://picsum.photos/seed/novyra-reel-${i}/900/1600`}")`}}>
              {post.mediaType==="video"&&post.mediaUrl&&<video src={post.mediaUrl} autoPlay muted loop playsInline />}
              <div className="nv-reel-actions"><button onClick={()=>toggleLike(post)} className={post.likedByMe?"liked":""}>♥<small>{post.likeCount||"1.2k"}</small></button><button onClick={()=>toggleComments(post)}>▢<small>{post.commentCount||"1k"}</small></button><button>➤<small>1.1k</small></button><button>♧<small>1k</small></button></div>
              <div className="nv-reel-meta"><strong>{post.authorName} <span className="nv-verified">●</span></strong><p>{post.body||"#foryou #NOVYRA #social"}</p><small>♫ Original audio</small></div><div className="nv-record">♫</div>
            </div>)}</div> : <div className="social-empty-state social-reels-empty"><span className="social-empty-mark">▣</span><h2>{t.noVideos}</h2><p>{t.noVideosHint}</p><button type="button" onClick={() => navigate("create")}>{t.create} <span>↗</span></button></div>}
          </section>}

          {!aiOpen && active === "profile" && <section className="social-profile-screen">
            {loading ? <p className="social-muted social-center">{t.loading}</p> : <><div className="nv-profile-cover"><img src="https://picsum.photos/seed/novyra-cover/1200/500" alt="" /><button type="button" onClick={() => setNotificationsOpen(true)}>☷</button></div><div className="nv-profile-hero"><img className="nv-profile-avatar" src={`https://picsum.photos/seed/novyra-profile-${account.id}/240/240`} alt="" /><h2>{profile?.displayName || account.displayName}</h2><button className="nv-edit-pill" type="button" onClick={() => document.getElementById("nv-profile-name")?.focus()}>Edit</button><p>A professional creator with a passion for style and storytelling. 👋</p></div><div className="nv-profile-stats"><div><strong>{profile?.followerCount ?? 205000}</strong><small>Followers</small></div><div><strong>{profile?.followingCount ?? 110}</strong><small>Following</small></div><div><strong>{profile?.postCount ?? profilePosts.length}</strong><small>Post</small></div><div><strong>11.3k</strong><small>Likes</small></div></div><div className="nv-profile-tabs"><span>▦</span><span>▣</span><span>♙</span><span>♡</span><span>♧</span></div><div className="nv-profile-grid">{profilePosts.length ? profilePosts.map((post,i)=><div key={post.id} className="nv-profile-tile"><img src={post.mediaUrl&&post.mediaType==="image"?post.mediaUrl:`https://picsum.photos/seed/novyra-grid-${i}/500/650`} alt="" /></div>) : [0,1,2,3,4,5].map(i=><div className="nv-profile-tile" key={i}><img src={`https://picsum.photos/seed/novyra-grid-${i}/500/650`} alt="" /></div>)}</div><div className="social-profile-card">
            <form className="social-profile-edit" onSubmit={saveProfile}><label>{t.editProfile}<input id="nv-profile-name" value={profileName} onChange={event => setProfileName(event.target.value)} maxLength={32} /></label><button type="submit" disabled={profileSaving || profileName.trim().length < 2}>{profileSaving ? "…" : t.save}</button></form>
            <div className="social-profile-settings">
              <label>{t.language}<select value={language} onChange={event => changeLanguage(event.target.value)}><option value="fa">فارسی</option><option value="en">English</option><option value="ar">العربية</option><option value="ku">کوردی</option></select></label>
              <button type="button" className="social-logout-button" onClick={logout}>{t.logout} <span>↗</span></button>
            </div>
            <div className="social-section-heading"><h2>{t.posts}</h2></div>
            {profilePosts.length ? <div className="social-post-list">{profilePosts.map(renderPost)}</div> : <p className="social-muted">{t.noPosts}</p>}
            </>}
          </section>}
        </section>
      </div>

      <nav className="social-mobile-nav-wrap">
        <MobileBottomNav active={active} userId={account.id} displayName={profile?.displayName || account.displayName}
          onNavigate={navigate} onOpenAI={() => { setAiOpen(true); setNotificationsOpen(false); }} />
      </nav>
    </div>
  </main>;
}
