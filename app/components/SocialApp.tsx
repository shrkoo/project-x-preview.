"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiRequest, clearSession } from "../lib/api";
import MobileBottomNav, { NavKey } from "./MobileBottomNav";
import AppIcon from "./AppIcon";
import { Search, Bell, Image as ImageIcon, Clapperboard, LockKeyhole, Heart, Bookmark, MoreHorizontal, EllipsisVertical, MessageCircle, Share2, Music2, UsersRound, MessageSquare, Sparkles, Film, BadgeCheck, ChevronDown, X, Camera, UserRound } from "lucide-react";

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
  return <span className={`social-avatar ${size === "large" ? "social-avatar-large" : ""}`} aria-hidden="true"><img src={`https://i.pravatar.cc/96?u=${encodeURIComponent(name)}`} alt="" loading="lazy" /></span>;
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
  const photo = post.mediaUrl && post.mediaType === "image" ? post.mediaUrl : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1000&auto=format&fit=crop";
  const ago = Number.isNaN(date.getTime()) ? "12 min ago" : "12 min ago";
  return <article className="nv-post-card">
    <div className="nv-post-head"><Avatar name={post.authorName}/><div className="nv-post-person"><strong>{post.authorName}</strong><small>{ago}</small></div><button className="nv-post-menu" type="button" aria-label="More options"><AppIcon icon={EllipsisVertical}/></button></div>
    <div className="nv-post-photo"><img src={photo} alt="" loading="lazy"/>{post.mediaType === "video" && post.mediaUrl && <video src={post.mediaUrl} controls playsInline preload="metadata"/>}</div>
    <div className="nv-post-interactions">
      <button type="button" className={post.likedByMe ? "liked" : ""} onClick={() => onLike(post)} aria-label={t.likes}><AppIcon icon={Heart} fill="currentColor"/><span>{post.likeCount || 212}</span></button>
      <button type="button" onClick={() => onToggleComments(post)} aria-label={t.comments}><AppIcon icon={MessageCircle}/><span>{post.commentCount || 20}</span></button>
      <button type="button" className="nv-reply-pill" onClick={() => onToggleComments(post)}><AppIcon icon={Share2}/><span>Reply</span></button>
    </div>
    <p className="nv-post-copy"><strong>{post.authorName}</strong> {post.body || "A little moment worth remembering. Sharing the good energy with everyone today."}</p>
    {commentsOpen && <div className="social-comments">
      {commentsLoading ? <p className="social-muted">{t.loading}</p> : comments.length ? comments.map(comment => <div className="social-comment" key={comment.id}><Avatar name={comment.authorName}/><div><strong>{comment.authorName}</strong><p>{comment.body}</p></div></div>) : <p className="social-muted">{t.emptyComments}</p>}
      <form className="social-comment-form" onSubmit={event => { event.preventDefault(); onSubmitComment(post); }}>
        <input value={commentDraft} onChange={event => onCommentDraft(event.target.value)} placeholder={t.writeComment} maxLength={1000}/><button type="submit" disabled={!commentDraft.trim()}>{t.send}</button>
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
  const [selectedReel, setSelectedReel] = useState<Post | null>(null);
  const [profileTab, setProfileTab] = useState<"Photos" | "Videos" | "Saved">("Photos");

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
            <AppIcon icon={Bell} />
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
          <button type="button" className="social-side-ai" onClick={() => setAiOpen(true)}><AppIcon icon={Sparkles} />{t.ai}</button>
          <div className="social-sidebar-account"><Avatar name={profile?.displayName || account.displayName} /><div><strong>{profile?.displayName || account.displayName}</strong><small>{account.email}</small></div></div>
        </aside>

        <section className="social-main-column">
          <div className="social-page-heading">
            <div><span className="social-eyebrow">{aiOpen ? "NOVYRA / AI" : "NOVYRA / COMMUNITY"}</span><h1>{pageTitle}</h1></div>
            <span className="social-page-glyph">{aiOpen ? <AppIcon icon={Sparkles} /> : active === "reels" ? <AppIcon icon={Film} /> : active === "search" ? <AppIcon icon={Search} /> : active === "profile" ? <AppIcon icon={ImageIcon} /> : active === "create" ? "+" : "N"}</span>
          </div>

          {pageError && <div className="social-alert" role="status"><span>{pageError}</span><button type="button" onClick={() => { setPageError(""); onClearNotice(); }}>×</button></div>}

          {aiOpen && <section className="social-ai-screen">
            <div className="social-ai-intro"><div className="social-ai-orb"><AppIcon icon={Sparkles} /></div><h2>{t.aiWelcome}</h2><p>{t.aiHint}</p></div>
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
            <div className="nv-feed-header"><button className="nv-feed-title" onClick={() => navigate("home")}>Reels <AppIcon icon={ChevronDown}/></button><div className="nv-feed-tools"><button className="nv-round-action" onClick={() => navigate("search")} aria-label="Search"><AppIcon icon={Search}/></button><button className="nv-round-action nv-bell" onClick={loadNotifications} aria-label="Notifications"><AppIcon icon={Bell}/><i/></button></div></div>
            <div className="nv-stories"><button className="nv-story add" onClick={() => navigate("create")}><span><img src={`https://i.pravatar.cc/120?u=${encodeURIComponent(account.id)}`} alt=""/><b>+</b></span><small>You</small></button>{["alex","alana","marco","john","jim"].map((name,i)=><button className="nv-story" key={name}><span><img src={`https://i.pravatar.cc/120?img=${i+12}`} alt=""/></span><small>@{name}</small></button>)}</div>
            {loading ? <p className="social-muted social-center">{t.loading}</p> : <div className="social-post-list">{(posts.length ? posts : [
              {id:"demo-1",body:"Golden hour, good people, and a moment worth keeping. What made you smile today?",mediaUrl:"https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1000&auto=format&fit=crop",mediaType:"image",createdAt:new Date().toISOString(),authorId:"demo",authorName:"Alex Morgan",likeCount:212,commentCount:20,likedByMe:false},
              {id:"demo-2",body:"A little reminder to slow down and enjoy the small things around you.",mediaUrl:"https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=1000&auto=format&fit=crop",mediaType:"image",createdAt:new Date().toISOString(),authorId:"demo",authorName:"Alana Rose",likeCount:184,commentCount:16,likedByMe:false},
              {id:"demo-3",body:"New places, familiar faces, and stories still waiting to happen.",mediaUrl:"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=1000&auto=format&fit=crop",mediaType:"image",createdAt:new Date().toISOString(),authorId:"demo",authorName:"Marco Lee",likeCount:96,commentCount:8,likedByMe:false}
            ] as Post[]).map(renderPost)}</div>}
          </section>}

          {!aiOpen && active === "search" && <section className="social-search-screen">
            <form className="social-search-form" onSubmit={runSearch}><AppIcon icon={Search} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t.searchPlaceholder} /><button type="submit">{t.search}</button></form>
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

          {!aiOpen && (active === "friends" || active === "inbox") && <section className="nv-placeholder"><div className="nv-placeholder-icon">{active === "friends" ? <AppIcon icon={UsersRound} /> : <AppIcon icon={MessageSquare} />}</div><h2>{active === "friends" ? t.friends : t.inbox}</h2><p>{active === "friends" ? "Find and connect with people on NOVYRA." : "Your conversations will appear here."}</p></section>}

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
            <div className="nv-top-tabs nv-reels-tabs"><button onClick={() => navigate("home")}>Feed</button><button onClick={() => navigate("friends")}>Following</button><button className="active">Reels<i/></button><span className="nv-top-spacer"/><button className="nv-round-action" onClick={() => navigate("search")} aria-label="Search"><AppIcon icon={Search}/></button><button className="nv-round-action nv-bell" onClick={loadNotifications} aria-label="Notifications"><AppIcon icon={Bell}/><i/></button></div>
            {loading ? <p className="social-muted social-center">{t.loading}</p> : <div className="nv-reels-stack">{(reels.length ? reels : posts.slice(0,3)).map((post,i)=><button type="button" className="nv-reel-list-card" key={post.id} onClick={() => setSelectedReel(post)} style={{backgroundImage:`linear-gradient(0deg,rgba(0,0,0,.65),transparent 58%),url("${post.mediaUrl || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900`}")`}}><span>{post.authorName}</span><small>Watch reel</small></button>)}</div>}
          </section>}

          {!aiOpen && active === "profile" && <section className="social-profile-screen">
            {loading ? <p className="social-muted social-center">{t.loading}</p> : <>
              <div className="nv-profile-cover"><img src="https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1400&auto=format&fit=crop" alt=""/><span className="nv-cover-status"/></div>
              <div className="nv-profile-hero"><div className="nv-avatar-wrap"><img className="nv-profile-avatar" src={`https://i.pravatar.cc/240?u=${encodeURIComponent(account.id)}`} alt=""/><button type="button" className="nv-camera-badge" aria-label="Change profile photo"><AppIcon icon={Camera}/></button></div><h2>{profile?.displayName || account.displayName}</h2><p>@{(profile?.displayName || account.displayName).toLowerCase().replace(/[^a-z0-9]/g,"") || "username"}</p></div>
              <div className="nv-profile-stats"><div><strong>{(profile?.postCount ?? profilePosts.length) || 240}</strong><small>Post</small></div><div><strong>{profile?.followerCount ? profile.followerCount.toLocaleString() : "47.36K"}</strong><small>Followers</small></div><div><strong>{profile?.followingCount ? profile.followingCount.toLocaleString() : "32K"}</strong><small>Following</small></div></div>
              <div className="nv-profile-buttons"><button type="button" className="nv-message-profile" onClick={() => navigate("inbox")}>Message</button><button type="button" className="nv-follow-profile" onClick={() => setPageError("This is your profile.")}>Follow</button></div>
              <div className="nv-profile-tabs" role="tablist" aria-label="Profile content">{(["Photos","Videos","Saved"] as const).map(tab=><button key={tab} type="button" className={profileTab===tab?"is-active":""} onClick={() => setProfileTab(tab)}>{tab}</button>)}</div>
              <div className="nv-profile-grid">{(profilePosts.length ? profilePosts : [0,1,2]).filter((item:any)=>typeof item==="number" || profileTab==="Photos").map((item:any,i:number)=><div key={typeof item==="number"?item:item.id} className={`nv-profile-tile nv-profile-masonry-${i%3}`}><img src={typeof item==="number"?[`https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=700`,`https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=700`,`https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=700`][i%3]:(item.mediaUrl || `https://i.pravatar.cc/500?img=${i+20}`)} alt="" /></div>)}</div>
              <form className="social-profile-edit" onSubmit={saveProfile}><label>{t.editProfile}<input id="nv-profile-name" value={profileName} onChange={event => setProfileName(event.target.value)} maxLength={32}/></label><button type="submit" disabled={profileSaving || profileName.trim().length<2}>{profileSaving?"…":t.save}</button></form>
              <div className="social-profile-settings"><label>{t.language}<select value={language} onChange={event => changeLanguage(event.target.value)}><option value="fa">فارسی</option><option value="en">English</option><option value="ar">العربية</option><option value="ku">کوردی</option></select></label><button type="button" className="social-logout-button" onClick={logout}>{t.logout}</button></div>
            </>}
          </section>}
        </section>
      </div>

      {selectedReel && <section className="nv-full-reel" role="dialog" aria-modal="true">
        <div className="nv-full-reel-media">{selectedReel.mediaType==="video"&&selectedReel.mediaUrl?<video src={selectedReel.mediaUrl} autoPlay loop playsInline controls/>:<img src={selectedReel.mediaUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1200"} alt="Reel"/>}</div>
        <div className="nv-full-reel-top"><button onClick={()=>setSelectedReel(null)} aria-label="Back"><AppIcon icon={ChevronDown}/></button><button onClick={()=>{setSelectedReel(null);navigate("search")}} aria-label="Search"><AppIcon icon={Search}/></button></div>
        <div className="nv-full-reel-actions"><button onClick={()=>toggleLike(selectedReel)}><AppIcon icon={Heart} fill={selectedReel.likedByMe?"#ef4444":"none"}/><small>4.2k</small></button><button onClick={()=>toggleComments(selectedReel)}><AppIcon icon={MessageCircle}/><small>4.2k</small></button><button onClick={()=>{const url=window.location.href;if(navigator.share)void navigator.share({title:"NOVYRA",text:selectedReel.body,url}).catch(()=>undefined);else void navigator.clipboard?.writeText(url)}}><AppIcon icon={Share2}/></button><button><AppIcon icon={MoreHorizontal}/></button></div>
        <div className="nv-full-reel-caption"><div className="nv-full-reel-user"><Avatar name={selectedReel.authorName}/><div><strong>{selectedReel.authorName}</strong><small>19 hour ago</small></div><button>Follow</button></div><p>{selectedReel.body.slice(0,110)}... <span>more</span></p><small><AppIcon icon={Music2}/> Remix with laddu_jaan...</small></div><div className="nv-reel-home-indicator"/>
      </section>}
      <nav className="social-mobile-nav-wrap" style={selectedReel ? {display:"none"} : undefined}>
        <MobileBottomNav active={active} userId={account.id} displayName={profile?.displayName || account.displayName}
          onNavigate={navigate} onOpenAI={() => { setAiOpen(true); setNotificationsOpen(false); }} />
      </nav>
    </div>
  </main>;
}
