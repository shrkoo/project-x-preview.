"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest, clearSession } from "../lib/api";
import MobileBottomNav, { NavKey } from "./MobileBottomNav";
import AppIcon from "./AppIcon";
import { Search, Bell, Image as ImageIcon, Clapperboard, LockKeyhole, Heart, Bookmark, MoreHorizontal, EllipsisVertical, MessageCircle, Share2, Music2, UsersRound, MessageSquare, Sparkles, Film, BadgeCheck, ChevronDown, X, Camera, UserRound, Clock, Play, Eye, ArrowRight, ArrowLeft, RotateCw } from "lucide-react";

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
  viewCount?: number;
};
type Person = {
  id: string;
  displayName: string;
  postCount: number;
  followerCount: number;
  followingCount: number;
  followedByMe: boolean;
  username?: string;
};
type Comment = { id: string; body: string; createdAt: string; authorId: string; authorName: string };
type Profile = Person & { email: string; createdAt?: string };

const demoPosts: Post[] = [
  {id:"demo-1",body:"Golden hour, good people, and a moment worth keeping. What made you smile today?",mediaUrl:"https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1000&auto=format&fit=crop",mediaType:"image",createdAt:"2026-11-20T10:00:00.000Z",authorId:"demo",authorName:"Alex Morgan",likeCount:212,commentCount:20,likedByMe:false},
  {id:"demo-2",body:"A little reminder to slow down and enjoy the small things around you.",mediaUrl:"https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=1000&auto=format&fit=crop",mediaType:"image",createdAt:"2026-11-20T09:48:00.000Z",authorId:"demo",authorName:"Alana Rose",likeCount:184,commentCount:16,likedByMe:false},
  {id:"demo-3",body:"New places, familiar faces, and stories still waiting to happen.",mediaUrl:"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=1000&auto=format&fit=crop",mediaType:"image",createdAt:"2026-11-20T09:36:00.000Z",authorId:"demo",authorName:"Marco Lee",likeCount:96,commentCount:8,likedByMe:false}
];

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
    home: "خانه", search: "اکسپلور", create: "ساخت پست", reels: "ویدئوها", profile: "پروفایل", friends: "دوستان", inbox: "پیام‌ها", ai: "هوش مصنوعی",
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
    home: "Home", search: "Explore", create: "Create post", reels: "Reels", profile: "Profile", friends: "Friends", inbox: "Inbox", ai: "AI assistant",
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
    home: "الرئيسية", search: "استكشاف", create: "إنشاء منشور", reels: "فيديوهات", profile: "الملف الشخصي", friends: "الأصدقاء", inbox: "الرسائل", ai: "مساعد الذكاء الاصطناعي",
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
    home: "سەرەکی", search: "گەڕانەوە", create: "بڵاوکردنەوە", reels: "ڤیدیۆ", profile: "پرۆفایل", friends: "هاوڕێکان", inbox: "نامەکان", ai: "یاریدەدەری زیرەک",
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
  onSubmitComment, commentsLoading, onSave
}: {
  post: Post; t: Record<string, string>; onLike: (post: Post) => void;
  onToggleComments: (post: Post) => void; commentsOpen: boolean; comments: Comment[];
  commentDraft: string; onCommentDraft: (value: string) => void;
  onSubmitComment: (post: Post) => void; commentsLoading: boolean; onSave: (post: Post) => void;
}) {
  const date = new Date(post.createdAt);
  const photo = post.mediaUrl && post.mediaType === "image" ? post.mediaUrl : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1000&auto=format&fit=crop";
  const ago = Number.isNaN(date.getTime()) ? "12 min ago" : "12 min ago";
  return <article className="nv-post-card">
    <div className="nv-post-head"><Avatar name={post.authorName}/><div className="nv-post-person"><strong><bdi dir="auto">{post.authorName}</bdi></strong><small><bdi dir="auto">{ago}</bdi></small></div><button className="nv-post-menu" type="button" aria-label="Save post" onClick={() => onSave(post)}><AppIcon icon={EllipsisVertical}/></button></div>
    <div className="nv-post-photo"><img src={photo} alt="" loading="lazy"/>{post.mediaType === "video" && post.mediaUrl && <video src={post.mediaUrl} controls playsInline preload="metadata"/>}</div>
    <div className="nv-post-interactions">
      <button type="button" className={post.likedByMe ? "liked" : ""} onClick={() => onLike(post)} aria-label={t.likes}><AppIcon icon={Heart} fill="currentColor"/><span>{post.likeCount || 212}</span></button>
      <button type="button" onClick={() => onToggleComments(post)} aria-label={t.comments}><AppIcon icon={MessageCircle}/><span>{post.commentCount || 20}</span></button>
      <button type="button" className="nv-reply-pill" onClick={() => onToggleComments(post)}><AppIcon icon={Share2}/><span>Reply</span></button>
    </div>
    <p className="nv-post-copy"><strong><bdi dir="auto">{post.authorName}</bdi></strong> {post.body || "A little moment worth remembering. Sharing the good energy with everyone today."}</p>
    {commentsOpen && <div className="social-comments">
      {commentsLoading ? <p className="social-muted">{t.loading}</p> : comments.length ? comments.map(comment => <div className="social-comment" key={comment.id}><Avatar name={comment.authorName}/><div><strong><bdi dir="auto">{comment.authorName}</bdi></strong><p>{comment.body}</p></div></div>) : <p className="social-muted">{t.emptyComments}</p>}
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
  const [feedMenuOpen, setFeedMenuOpen] = useState(false);
  const [reelsMode, setReelsMode] = useState<"videos" | "explore">("videos");
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [explorePosts, setExplorePosts] = useState<Post[]>([]);
  const [exploreOffset, setExploreOffset] = useState(0);
  const [exploreHasMore, setExploreHasMore] = useState(true);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<Array<{id:string;type:"user"|"query";query?:string;userId?:string;displayName?:string;username?:string}>>([]);
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [viewedProfile, setViewedProfile] = useState<{profile:Profile;posts:Post[]}|null>(null);
  const [selectedGridPost, setSelectedGridPost] = useState<Post|null>(null);
  const [touchStartY, setTouchStartY] = useState<number|null>(null);
  const exploreSentinelRef = useRef<HTMLDivElement|null>(null);

  const notificationCount = useMemo(() => notifications.filter(item => !item.readAt).length, [notifications]);

  useEffect(() => {
    try {
      const ids = JSON.parse(localStorage.getItem("novyra-saved-posts") || "[]");
      const cached = JSON.parse(localStorage.getItem("novyra-saved-post-data") || "[]");
      if (Array.isArray(ids)) setSavedPostIds(ids.filter((id): id is string => typeof id === "string"));
      if (Array.isArray(cached)) setSavedPosts(cached.filter((post): post is Post => Boolean(post && typeof post.id === "string")));
    } catch { /* Ignore invalid local saved-post cache. */ }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dir = language === "en" ? "ltr" : "rtl";
  }, [language]);

  useEffect(() => {
    if (notice) setPageError(notice);
  }, [notice]);

  useEffect(() => {
    let alive = true;
    async function loadCurrentPage() {
      setPageError("");
      if (active === "home" || (active === "reels" && reelsMode === "videos")) {
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
          if (alive && active === "home") setPosts(demoPosts);
          if (alive && active === "reels") setReels(demoPosts);
        } finally {
          if (alive) setLoading(false);
        }
      }
      if (active === "search" || (active === "reels" && reelsMode === "explore")) {
        void loadExplore(true);
        void loadSearchHistory();
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
  }, [active, reelsMode, account.displayName, t.genericError]);

  function navigate(next: NavKey) {
    setAiOpen(false);
    setNotificationsOpen(false);
    if (next === "search") {
      setReelsMode("explore");
      setSearchOpen(false);
      setViewedProfile(null);
      setActive("reels");
      return;
    }
    if (next === "reels") setReelsMode("videos");
    setSearchOpen(false);
    setViewedProfile(null);
    setActive(next);
  }


  async function loadExplore(reset = false, shuffle = false) {
    if (exploreLoading) return;
    setExploreLoading(true);
    try {
      const offset = reset ? 0 : exploreOffset;
      const data = await apiRequest<{posts:Post[];nextOffset:number;hasMore:boolean}>(`/social/explore?limit=30&offset=${offset}`);
      let incoming = data.posts || [];
      if (shuffle) incoming = [...incoming].sort(() => Math.random() - 0.5);
      setExplorePosts(current => reset ? incoming : [...current, ...incoming]);
      setExploreOffset(data.nextOffset ?? offset + incoming.length);
      setExploreHasMore(Boolean(data.hasMore));
    } catch (error) { setPageError(error instanceof Error ? error.message : t.genericError); }
    finally { setExploreLoading(false); }
  }

  async function loadSearchHistory() {
    try {
      const data = await apiRequest<{items:typeof recentSearches}>("/social/search-history");
      setRecentSearches(data.items || []);
    } catch { setRecentSearches([]); }
  }

  async function deleteSearchHistory(id: string) {
    try {
      await apiRequest(`/social/search-history/${id}`, {method:"DELETE"});
      setRecentSearches(current => current.filter(item => item.id !== id));
    } catch (error) { setPageError(error instanceof Error ? error.message : t.genericError); }
  }

  async function clearSearchHistory() {
    try {
      await apiRequest("/social/search-history/clear", {method:"DELETE"});
      setRecentSearches([]);
      setHistoryExpanded(false);
    } catch (error) { setPageError(error instanceof Error ? error.message : t.genericError); }
  }

  async function openPersonProfile(person: Person) {
    if (!person.id) return;
    try {
      const data = await apiRequest<{profile:Profile;posts:Post[]}>(`/social/users/${person.id}/profile`);
      await apiRequest("/social/search-history", {method:"POST",body:JSON.stringify({type:"user",userId:person.id})});
      setViewedProfile({profile:data.profile,posts:data.posts||[]});
      setProfileTab("Photos");
      await loadSearchHistory();
    } catch (error) { setPageError(error instanceof Error ? error.message : t.genericError); }
  }

  async function recordQuerySearch(value: string) {
    const clean=value.trim();
    if (!clean) return;
    try {
      await apiRequest("/social/search-history", {method:"POST",body:JSON.stringify({type:"query",query:clean})});
      await loadSearchHistory();
    } catch { /* Keep search usable when history storage is unavailable. */ }
  }

  async function openExplorePost(post: Post) {
    setSelectedGridPost(post);
    try {
      const data=await apiRequest<{viewCount:number}>(`/social/posts/${post.id}/view`,{method:"POST"});
      setExplorePosts(current=>current.map(item=>item.id===post.id?{...item,viewCount:data.viewCount}:item));
      setSelectedGridPost(current=>current?.id===post.id?{...current,viewCount:data.viewCount}:current);
    } catch { /* Keep the media viewer open even if the counter cannot update. */ }
  }

  async function runSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchLoading(true);
    setPageError("");
    try {
      const data = await apiRequest<{ users: Person[]; posts: Post[] }>(`/social/search?q=${encodeURIComponent(query.trim())}`);
      setPeople(data.users || []);
      setSearchPosts(data.posts || []);
      await recordQuerySearch(query);
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
      setViewedProfile(current => current?.profile.id === person.id ? { ...current, profile: { ...current.profile, followedByMe: data.following, followerCount: Math.max(0, current.profile.followerCount + (data.following ? 1 : -1)) } } : current);
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


  useEffect(() => {
    if (active !== "search" || !searchOpen) return;
    const term=query.trim();
    if (!term) { setSearchResults([]); setSearchLoading(false); return; }
    const timer=window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const data=await apiRequest<{users:Person[];posts:Post[]}>(`/social/search?q=${encodeURIComponent(term)}`);
        setSearchResults(data.users||[]);
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    },220);
    return () => window.clearTimeout(timer);
  },[active,searchOpen,query]);

  useEffect(() => {
    if (active!=="search" || searchOpen || viewedProfile || !exploreHasMore) return;
    const node=exploreSentinelRef.current;
    if (!node || typeof IntersectionObserver==="undefined") return;
    const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)&&!exploreLoading)void loadExplore(false);},{rootMargin:"240px"});
    observer.observe(node);
    return ()=>observer.disconnect();
  },[active,searchOpen,viewedProfile,exploreHasMore,exploreLoading,exploreOffset]);

  const pageTitle = aiOpen ? t.ai : t[active];
  const visiblePosts = active === "reels" ? reels : posts;

  function toggleSavedPost(post: Post) {
    const removing = savedPostIds.includes(post.id);
    const nextIds = removing ? savedPostIds.filter(id => id !== post.id) : [...savedPostIds, post.id];
    const nextPosts = removing ? savedPosts.filter(item => item.id !== post.id) : [post, ...savedPosts.filter(item => item.id !== post.id)];
    setSavedPostIds(nextIds);
    setSavedPosts(nextPosts);
    localStorage.setItem("novyra-saved-posts", JSON.stringify(nextIds));
    localStorage.setItem("novyra-saved-post-data", JSON.stringify(nextPosts));
  }

  function renderPost(post: Post) {
    return <PostCard key={post.id} post={post} t={t} onLike={toggleLike} onToggleComments={toggleComments}
      commentsOpen={commentingPost === post.id} comments={commentsByPost[post.id] || []}
      commentDraft={commentDrafts[post.id] || ""} onCommentDraft={value => setCommentDrafts(current => ({ ...current, [post.id]: value }))}
      onSubmitComment={submitComment} commentsLoading={Boolean(commentsLoading[post.id])} onSave={toggleSavedPost} />;
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
            <div className="nv-feed-header"><div className="nv-feed-switch"><button className="nv-feed-title" onClick={() => setFeedMenuOpen(v => !v)}>{t.reels} <AppIcon icon={ChevronDown}/></button>{feedMenuOpen && <div className="nv-feed-menu"><button onClick={() => {setFeedMenuOpen(false);navigate("home")}}>Feed</button><button onClick={() => {setFeedMenuOpen(false);navigate("friends")}}>Following</button><button onClick={() => {setFeedMenuOpen(false);navigate("reels")}}>Reels</button></div>}</div><div className="nv-feed-tools"><button className="nv-round-action" onClick={() => navigate("search")} aria-label="Search"><AppIcon icon={Search}/></button><button className="nv-round-action nv-bell" onClick={loadNotifications} aria-label="Notifications"><AppIcon icon={Bell}/><i/></button></div></div>
            <div className="nv-stories"><button className="nv-story add" onClick={() => navigate("create")}><span><img src={`https://i.pravatar.cc/120?u=${encodeURIComponent(account.id)}`} alt=""/><b>+</b></span><small>You</small></button>{["alex","alana","marco","john","jim"].map((name,i)=><button className="nv-story" key={name}><span><img src={`https://i.pravatar.cc/120?img=${i+12}`} alt=""/></span><small>@{name}</small></button>)}</div>
            {loading ? <p className="social-muted social-center">{t.loading}</p> : <div className="social-post-list">{(posts.length ? posts : demoPosts).map(renderPost)}</div>}
          </section>}

          {!aiOpen && active === "reels" && reelsMode === "explore" && <section className="nv-explore-screen">
            {viewedProfile ? <div className="nv-other-profile">
              <div className="nv-other-profile-head"><button type="button" onClick={()=>setViewedProfile(null)} aria-label="Back"><AppIcon icon={language==="fa"?ArrowRight:ArrowLeft}/></button><strong>{viewedProfile.profile.displayName}</strong></div>
              <div className="nv-profile-hero"><div className="nv-avatar-wrap"><span className="nv-profile-avatar nv-profile-avatar-placeholder"><AppIcon icon={UserRound}/></span></div><h2>{viewedProfile.profile.displayName}</h2><p>@{viewedProfile.profile.displayName.toLowerCase().replace(/[^a-z0-9]/g,"")}</p></div>
              <div className="nv-profile-stats"><div><strong>{viewedProfile.profile.postCount}</strong><small>{t.postCount}</small></div><div><strong>{viewedProfile.profile.followerCount}</strong><small>{t.followers}</small></div><div><strong>{viewedProfile.profile.followingCount}</strong><small>{t.followingCount}</small></div></div>
              <div className="nv-profile-buttons"><button type="button" className="nv-follow-profile" onClick={()=>followPerson(viewedProfile.profile)}>{viewedProfile.profile.followedByMe?t.following:t.follow}</button></div>
              <div className="nv-profile-tabs" role="tablist" aria-label="User media"><button type="button" className={profileTab==="Photos"?"is-active":""} onClick={()=>setProfileTab("Photos")}>عکس‌ها</button><button type="button" className={profileTab==="Videos"?"is-active":""} onClick={()=>setProfileTab("Videos")}>ویدئوها</button></div><div className="nv-profile-grid is-other-profile">{viewedProfile.posts.filter(post=>profileTab==="Photos"?post.mediaType==="image":post.mediaType==="video").map(post=><button type="button" className="nv-profile-tile" key={post.id} onClick={()=>void openExplorePost(post)}>{post.mediaType==="video"?<><video src={post.mediaUrl||undefined} muted playsInline preload="metadata"/><span className="nv-tile-play"><AppIcon icon={Play}/></span></>:<img src={post.mediaUrl||undefined} alt="" loading="lazy"/>}</button>)}</div>
            </div> : !searchOpen ? <>
              <div className="nv-explore-toolbar" dir="rtl"><button type="button" className="nv-explore-search-trigger" onClick={()=>setSearchOpen(true)}><span>جستجوی کاربران</span><AppIcon icon={Search}/></button><button type="button" className="nv-explore-bookmark" aria-label="Refresh explore" title="تازه‌سازی محتوا" onClick={()=>void loadExplore(true)} disabled={exploreLoading}><AppIcon icon={RotateCw}/></button></div>
              <div className="nv-explore-grid" dir="rtl" onTouchStart={event=>setTouchStartY(event.touches[0]?.clientY??null)} onTouchEnd={event=>{const end=event.changedTouches[0]?.clientY??0;if(touchStartY!==null&&end-touchStartY>70)void loadExplore(true,true);setTouchStartY(null);}}>
                {explorePosts.map(post=><button type="button" className="nv-explore-tile" key={post.id} onClick={()=>void openExplorePost(post)}>
                  {post.mediaType==="video"&&post.mediaUrl?<video src={post.mediaUrl} muted playsInline preload="metadata"/>:post.mediaType==="image"&&post.mediaUrl?<img src={post.mediaUrl} alt="" loading="lazy"/>:<span className="nv-explore-text-tile">{post.body}</span>}
                  {post.mediaType==="video"&&<span className="nv-tile-play"><AppIcon icon={Play}/></span>}
                  <span className="nv-explore-views"><AppIcon icon={Eye}/>{new Intl.NumberFormat("fa-IR",{notation:"compact",compactDisplay:"long",maximumFractionDigits:1}).format(post.viewCount||0)}</span>
                </button>)}
              </div>
              <div ref={exploreSentinelRef} className="nv-explore-sentinel">{exploreLoading?"در حال بارگذاری…":""}</div>
              {!exploreLoading&&!explorePosts.length&&<p className="social-muted social-center">هنوز محتوایی برای نمایش وجود ندارد.</p>}
            </> : <div className="nv-search-page" dir="rtl">
              <div className="nv-search-page-head"><button type="button" onClick={()=>{setSearchOpen(false);setQuery("");}} aria-label="Back"><AppIcon icon={ArrowRight}/></button><form onSubmit={runSearch}><AppIcon icon={Search}/><input autoFocus value={query} onChange={event=>setQuery(event.target.value)} placeholder="جستجو" /></form></div>
              {!query.trim() ? <>
                <div className="nv-recent-heading"><strong>جدید</strong><button type="button" onClick={()=>setHistoryExpanded(value=>!value)}>دیدن همه</button></div>
                <div className="nv-recent-list">{(historyExpanded?recentSearches:recentSearches.slice(0,8)).map(item=><div className="nv-recent-row" key={item.id}>
                  <button type="button" className="nv-recent-main" onClick={()=>item.type==="user"&&item.userId?void openPersonProfile({id:item.userId,displayName:item.displayName||"",username:item.username,postCount:0,followerCount:0,followingCount:0,followedByMe:false}):setQuery(item.query||"")}>
                    <span className="nv-recent-avatar">{item.type==="user"?<AppIcon icon={UserRound}/>:<AppIcon icon={Clock}/>}</span><span className="nv-recent-copy">{item.type==="user"?<><strong>{item.username||item.displayName}</strong><small>{item.displayName}</small></>:<strong>{item.query}</strong>}</span>
                  </button><button type="button" className="nv-recent-remove" onClick={()=>void deleteSearchHistory(item.id)} aria-label="Remove">×</button>
                </div>)}</div>
                {recentSearches.length>0&&<button type="button" className="nv-clear-history" onClick={()=>void clearSearchHistory()}>پاک کردن تاریخچه</button>}
              </> : <div className="nv-live-results">{searchLoading?<p className="social-muted">در حال جستجو…</p>:searchResults.map(person=><button type="button" className="nv-recent-row" key={person.id} onClick={()=>void openPersonProfile(person)}><span className="nv-recent-avatar"><AppIcon icon={UserRound}/></span><span className="nv-recent-copy"><strong>{person.username||person.displayName}</strong><small>{person.displayName}</small></span></button>)}</div>}
            </div>}
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

          {!aiOpen && active === "reels" && reelsMode === "videos" && <section className="nv-reels-screen">
            <div className="nv-top-tabs nv-reels-tabs"><div className="nv-reels-mode-switch"><button className="nv-reels-mode-title" type="button" onClick={() => setFeedMenuOpen(value => !value)}>ویدئوها <AppIcon icon={ChevronDown}/></button>{feedMenuOpen && <div className="nv-feed-menu"><button type="button" onClick={() => {setFeedMenuOpen(false);setReelsMode("videos");}}>ویدئوها</button><button type="button" onClick={() => {setFeedMenuOpen(false);setReelsMode("explore");setSearchOpen(false);void loadExplore(true);void loadSearchHistory();}}>اکسپلور</button></div>}</div><span className="nv-top-spacer"/><button className="nv-round-action nv-bell" onClick={loadNotifications} aria-label="Notifications"><AppIcon icon={Bell}/><i/></button></div>
            {loading ? <p className="social-muted social-center">{t.loading}</p> : <div className="nv-reels-stack">{(reels.length ? reels : (posts.length ? posts : demoPosts)).map((post,i)=><button type="button" className="nv-reel-list-card" key={post.id} onClick={() => setSelectedReel(post)} style={{backgroundImage:`linear-gradient(0deg,rgba(0,0,0,.65),transparent 58%),url("${post.mediaUrl || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900`}")`}}><span>{post.authorName}</span><small>Watch reel</small></button>)}</div>}
          </section>}

          {!aiOpen && active === "profile" && <section className="social-profile-screen">
            {loading ? <p className="social-muted social-center">{t.loading}</p> : <>
              <div className="nv-profile-cover"><img src="https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1400&auto=format&fit=crop" alt=""/><span className="nv-cover-status"/></div>
              <div className="nv-profile-hero"><div className="nv-avatar-wrap"><img className="nv-profile-avatar" src={`https://i.pravatar.cc/240?u=${encodeURIComponent(account.id)}`} alt=""/><button type="button" className="nv-camera-badge" aria-label="Change profile photo"><AppIcon icon={Camera}/></button></div><h2>{profile?.displayName || account.displayName}</h2><p>@{(profile?.displayName || account.displayName).toLowerCase().replace(/[^a-z0-9]/g,"") || "username"}</p></div>
              <div className="nv-profile-stats"><div><strong>{profile?.postCount ?? profilePosts.length}</strong><small>{t.postCount}</small></div><div><strong>{(profile?.followerCount ?? 0).toLocaleString(language==="fa"?"fa-IR":undefined)}</strong><small>{t.followers}</small></div><div><strong>{(profile?.followingCount ?? 0).toLocaleString(language==="fa"?"fa-IR":undefined)}</strong><small>{t.followingCount}</small></div></div>
              <div className="nv-profile-buttons own-profile"><button type="button" className="nv-message-profile" onClick={() => document.getElementById("nv-profile-name")?.focus()}>{t.editProfile}</button></div>
              <div className="nv-profile-tabs" role="tablist" aria-label="Profile content">{(["Photos","Videos","Saved"] as const).map(tab=><button key={tab} type="button" className={profileTab===tab?"is-active":""} onClick={() => setProfileTab(tab)}>{tab==="Saved" && <AppIcon icon={LockKeyhole}/>}<span>{tab}</span></button>)}</div>
              <div className="nv-profile-grid">{(profileTab==="Saved"?savedPosts:profilePosts.filter(post=>profileTab==="Photos"?post.mediaType==="image":post.mediaType==="video")).map(item=><button type="button" key={item.id} className="nv-profile-tile" onClick={()=>void openExplorePost(item)}>{item.mediaType==="video"?<><video src={item.mediaUrl||undefined} muted playsInline preload="metadata"/><AppIcon icon={Play}/></>:item.mediaUrl?<img src={item.mediaUrl} alt="" loading="lazy"/>:<span className="nv-explore-text-tile">{item.body}</span>}</button>)}</div>
              <form className="social-profile-edit" onSubmit={saveProfile}><label>{t.editProfile}<input id="nv-profile-name" value={profileName} onChange={event => setProfileName(event.target.value)} maxLength={32}/></label><button type="submit" disabled={profileSaving || profileName.trim().length<2}>{profileSaving?"…":t.save}</button></form>
              <div className="social-profile-settings"><label>{t.language}<select value={language} onChange={event => changeLanguage(event.target.value)}><option value="fa">فارسی</option><option value="en">English</option><option value="ar">العربية</option><option value="ku">کوردی</option></select></label><button type="button" className="social-logout-button" onClick={logout}>{t.logout}</button></div>
            </>}
          </section>}
        </section>
      </div>

      {selectedGridPost && <section className="nv-grid-post-viewer" role="dialog" aria-modal="true" onClick={()=>setSelectedGridPost(null)}><button type="button" className="nv-grid-viewer-close" onClick={()=>setSelectedGridPost(null)} aria-label="Close">×</button><div className="nv-grid-viewer-media" onClick={event=>event.stopPropagation()}>{selectedGridPost.mediaType==="video"&&selectedGridPost.mediaUrl?<video src={selectedGridPost.mediaUrl} autoPlay controls playsInline/>:selectedGridPost.mediaUrl?<img src={selectedGridPost.mediaUrl} alt=""/>:<p>{selectedGridPost.body}</p>}</div></section>}
      {selectedReel && <section className="nv-full-reel" role="dialog" aria-modal="true">
        <div className="nv-full-reel-media">{selectedReel.mediaType==="video"&&selectedReel.mediaUrl?<video src={selectedReel.mediaUrl} autoPlay loop playsInline controls/>:<img src={selectedReel.mediaUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1200"} alt="Reel"/>}</div>
        <div className="nv-full-reel-top"><button onClick={()=>setSelectedReel(null)} aria-label="Back"><AppIcon icon={ChevronDown}/></button><button onClick={()=>{setSelectedReel(null);navigate("search")}} aria-label="Search"><AppIcon icon={Search}/></button></div>
        <div className="nv-full-reel-actions"><button onClick={()=>toggleLike(selectedReel)}><AppIcon icon={Heart} fill={selectedReel.likedByMe?"#ef4444":"none"}/><small>4.2k</small></button><button onClick={()=>toggleComments(selectedReel)}><AppIcon icon={MessageCircle}/><small>4.2k</small></button><button onClick={()=>{const url=window.location.href;if(navigator.share)void navigator.share({title:"NOVYRA",text:selectedReel.body,url}).catch(()=>undefined);else void navigator.clipboard?.writeText(url)}}><AppIcon icon={Share2}/></button><button><AppIcon icon={MoreHorizontal}/></button></div>
        <div className="nv-full-reel-caption"><div className="nv-full-reel-user"><Avatar name={selectedReel.authorName}/><div><strong><bdi dir="auto">{selectedReel.authorName}</bdi></strong><small><bdi dir="auto">19 hour ago</bdi></small></div><button>{t.follow}</button></div><p>{selectedReel.body.slice(0,110)}... <span>{language === "fa" ? "بیشتر" : "more"}</span></p><small><AppIcon icon={Music2}/> Remix with laddu_jaan...</small></div><div className="nv-reel-home-indicator"/>
      </section>}
      <nav className="social-mobile-nav-wrap" style={selectedReel ? {display:"none"} : undefined}>
        <MobileBottomNav active={active} labels={{home:t.home,reels:t.reels,message:t.inbox,search:"",profile:t.profile}} userId={account.id} displayName={profile?.displayName || account.displayName}
          onNavigate={navigate} onOpenAI={() => { setAiOpen(true); setNotificationsOpen(false); }} />
      </nav>
    </div>
  </main>;
}
