"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest, clearSession } from "../lib/api";
import MobileBottomNav, { NavKey } from "./MobileBottomNav";
import AppIcon from "./AppIcon";
import { FeedMedia, MediaViewer, formatSocialCount } from "./MediaExperience";
import type { SocialMediaPost, SocialMediaPerson } from "./MediaExperience";
import { Search, Bell, Image as ImageIcon, Clapperboard, LockKeyhole, Heart, Bookmark, MoreHorizontal, EllipsisVertical, MessageCircle, Share2, Music2, Send, UsersRound, MessageSquare, Sparkles, Film, BadgeCheck, ChevronDown, X, Camera, UserRound, Clock, Play, Eye, ArrowRight, ArrowLeft, Repeat2 } from "lucide-react";

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
  repostCount?: number;
  shareCount?: number;
  saveCount?: number;
  savedByMe?: boolean;
  likedByNames?: string[];
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
type ShareTarget = Pick<Person,"id"|"displayName"|"username">;
type Comment = { id: string; body: string; createdAt: string; authorId: string; authorName: string };
type SharedMessage = { id: string; body: string; createdAt: string; senderId: string; senderName: string; recipientId: string; recipientName: string; sharedPostId?: string | null; postBody?: string | null; mediaUrl?: string | null; mediaType?: "image" | "video" | null; postAuthorId?: string | null; postAuthorName?: string | null; received: boolean };
type Profile = Person & { email: string; createdAt?: string; avatarUrl?: string; avatar_url?: string; photoUrl?: string; imageUrl?: string };

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
    home: "Home", search: "Explore", create: "Create post", reels: "Videos", profile: "Profile", friends: "Friends", inbox: "Inbox", ai: "AI assistant",
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

function formatExploreViews(value: number | undefined) {
  const count = Math.max(0, Number(value) || 0);
  const format = (number: number) => new Intl.NumberFormat("fa-IR", {
    minimumFractionDigits: Number.isInteger(number) ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(number).replace(/,/g, "٬").replace(/\./g, "٫");
  if (count < 10000) return new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(Math.floor(count));
  if (count < 1000000) return `${format(Math.round((count / 1000) * 10) / 10)} هزار`;
  return `${format(Math.round((count / 1000000) * 10) / 10)} میلیون`;
}

function formatPostAge(createdAt: string, language: Language) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absolute = Math.abs(seconds);
  const locale = language === "fa" ? "fa-IR" : language === "ar" ? "ar" : language === "ku" ? "fa-IR" : "en";
  let value = seconds;
  let unit: Intl.RelativeTimeFormatUnit = "second";
  if (absolute >= 60 * 60 * 24 * 30) { value = Math.round(seconds / (60 * 60 * 24 * 30)); unit = "month"; }
  else if (absolute >= 60 * 60 * 24) { value = Math.round(seconds / (60 * 60 * 24)); unit = "day"; }
  else if (absolute >= 60 * 60) { value = Math.round(seconds / (60 * 60)); unit = "hour"; }
  else if (absolute >= 60) { value = Math.round(seconds / 60); unit = "minute"; }
  try { return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(value, unit); }
  catch { return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(value, unit); }
}


const DEMO_MEDIA_POSTS: Post[] = [
  {id:"demo-01",body:"صبحی تازه، نوری تازه؛ لحظه‌ها را زندگی کن. ✨",mediaUrl:"https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200&auto=format&fit=crop",mediaType:"image",createdAt:new Date(Date.now()-1000*60*18).toISOString(),authorId:"demo-user-1",authorName:"آرمان",likeCount:248,commentCount:18,likedByMe:false,viewCount:1840,repostCount:12,shareCount:8,saveCount:31},
  {id:"demo-02",body:"یک گل کوچک، یک حال خوب 🌸",mediaUrl:"https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",mediaType:"video",createdAt:new Date(Date.now()-1000*60*45).toISOString(),authorId:"demo-user-2",authorName:"رها",likeCount:932,commentCount:42,likedByMe:false,viewCount:12600,repostCount:37,shareCount:21,saveCount:84},
  {id:"demo-03",body:"شهر از زاویه‌ای دیگر؛ زیبایی در جزئیات است.",mediaUrl:"https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=1200&auto=format&fit=crop",mediaType:"image",createdAt:new Date(Date.now()-1000*60*90).toISOString(),authorId:"demo-user-3",authorName:"کیان",likeCount:517,commentCount:26,likedByMe:false,viewCount:7600,repostCount:19,shareCount:14,saveCount:62},
  {id:"demo-04",body:"چند ثانیه آرامش در دل طبیعت 🌿",mediaUrl:"https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",mediaType:"video",createdAt:new Date(Date.now()-1000*60*60*3).toISOString(),authorId:"demo-user-4",authorName:"سارا",likeCount:1200,commentCount:73,likedByMe:false,viewCount:24100,repostCount:51,shareCount:33,saveCount:106},
  {id:"demo-05",body:"گاهی بهترین مقصد، خود مسیر است.",mediaUrl:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&auto=format&fit=crop",mediaType:"image",createdAt:new Date(Date.now()-1000*60*60*5).toISOString(),authorId:"demo-user-5",authorName:"نیما",likeCount:386,commentCount:15,likedByMe:false,viewCount:5300,repostCount:9,shareCount:6,saveCount:47},
  {id:"demo-06",body:"یک قاب کوتاه از طبیعت؛ صدای زندگی.",mediaUrl:"https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",mediaType:"video",createdAt:new Date(Date.now()-1000*60*60*8).toISOString(),authorId:"demo-user-6",authorName:"هلیا",likeCount:764,commentCount:39,likedByMe:false,viewCount:9800,repostCount:24,shareCount:17,saveCount:73}
];

function Avatar({ name, size = "normal" }: { name: string; size?: "normal" | "large" }) {
  return <span className={`social-avatar ${size === "large" ? "social-avatar-large" : ""}`} aria-hidden="true">{initials(name)}</span>;
}

function PostCard({
  post, t, language, onLike, onToggleComments, commentsOpen, comments, commentDraft, onCommentDraft,
  onSubmitComment, commentsLoading, onSave, saved, onRepost, onShare, onOpenMedia, onView
}: {
  post: Post; t: Record<string, string>; language: Language; onLike: (post: Post) => void;
  onToggleComments: (post: Post) => void; commentsOpen: boolean; comments: Comment[];
  commentDraft: string; onCommentDraft: (value: string) => void;
  onSubmitComment: (post: Post) => void; commentsLoading: boolean;
  onSave: (post: Post) => void; saved: boolean; onRepost: (post: Post) => void;
  onShare: (post: Post) => void; onOpenMedia: (post: Post) => void; onView: (post: Post) => void;
}) {
  const [captionExpanded,setCaptionExpanded]=useState(false);
  const [menuOpen,setMenuOpen]=useState(false);
  return <article className="nv-post-card" dir={language==="en"?"ltr":"rtl"}>
    <div className="nv-post-head">
      <Avatar name={post.authorName}/>
      <div className="nv-post-person"><strong><bdi dir="auto">{post.authorName}</bdi></strong><small><bdi dir="auto">{formatPostAge(post.createdAt,language)}</bdi></small></div>
      <button className="nv-post-menu" type="button" aria-label="گزینه‌های بیشتر" onClick={()=>setMenuOpen(value=>!value)}><AppIcon icon={MoreHorizontal}/></button>
      {menuOpen&&<div className="nv-post-menu-popover"><button type="button" onClick={()=>{onSave(post);setMenuOpen(false);}}>{saved?"حذف از ذخیره‌شده‌ها":"ذخیره"}</button><button type="button" onClick={()=>{onRepost(post);setMenuOpen(false);}}>بازنشر</button><button type="button" onClick={()=>{onShare(post);setMenuOpen(false);}}>ارسال</button></div>}
    </div>
    {post.mediaUrl && post.mediaType && <div className="nv-post-photo"><FeedMedia post={post} onOpen={()=>onOpenMedia(post)} onLike={()=>onLike(post)} onView={()=>onView(post)}/></div>}
    {!post.mediaUrl && post.body && <div className="nv-post-text-only"><p>{post.body}</p></div>}
    <div className="nv-post-interactions" dir="rtl">
      <button type="button" className={post.likedByMe ? "liked" : ""} onClick={() => onLike(post)} aria-label={t.likes}><AppIcon icon={Heart} fill={post.likedByMe ? "currentColor" : "none"}/><span>{formatSocialCount(post.likeCount)}</span></button>
      <button type="button" onClick={() => onToggleComments(post)} aria-label={t.comments}><AppIcon icon={MessageCircle}/><span>{formatSocialCount(post.commentCount)}</span></button>
      <button type="button" onClick={() => onRepost(post)} aria-label="بازنشر"><AppIcon icon={Repeat2}/><span>{formatSocialCount(post.repostCount)}</span></button>
      <button type="button" onClick={() => onShare(post)} aria-label={t.send}><AppIcon icon={Send}/><span>{formatSocialCount(post.shareCount)}</span></button>
      <button type="button" className={saved?"is-saved":""} onClick={() => onSave(post)} aria-label={t.save}><AppIcon icon={Bookmark} fill={saved?"currentColor":"none"}/></button>
    </div>
    <div className="nv-post-like-summary">{post.likedByNames?.length ? <><span className="nv-post-liker-avatars">{post.likedByNames.slice(0,2).map(name=><Avatar key={name} name={name}/>)}</span><span><strong>{post.likedByNames[0]}</strong>{language==="fa"?" و دیگران پسندیدند":" and others liked this"}</span></> : <span>{language==="fa"?"هنوز کسی این پست را نپسندیده":"No likes yet"}</span>}</div>
    {post.body && post.mediaUrl && <button type="button" className={captionExpanded?"nv-post-copy is-expanded":"nv-post-copy"} onClick={()=>setCaptionExpanded(value=>!value)}><strong><bdi dir="auto">{post.authorName}</bdi></strong> <bdi dir="auto">{post.body}</bdi>{!captionExpanded&&post.body.length>90?<span className="nv-post-more"> … بیشتر</span>:null}</button>}
    <small className="nv-post-age"><bdi dir="auto">{formatPostAge(post.createdAt,language)}</bdi></small>
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
  const [demoMode] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("demo") === "1");
  const [aiOpen, setAiOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Post[]>([]);
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
  const [profileTab, setProfileTab] = useState<"Photos" | "Videos" | "Saved">("Photos");
  const [feedMenuOpen, setFeedMenuOpen] = useState(false);
  const [friends, setFriends] = useState<Person[]>([]);
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerPosts, setViewerPosts] = useState<Post[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerMode, setViewerMode] = useState<"explore" | "profile">("explore");
  const [sharingPost, setSharingPost] = useState<Post | null>(null);
  const [shareTargets, setShareTargets] = useState<ShareTarget[]>([]);
  const [shareSending, setShareSending] = useState<string | null>(null);
  const [sharedMessages, setSharedMessages] = useState<SharedMessage[]>([]);
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [explorePosts, setExplorePosts] = useState<Post[]>([]);
  const [exploreOffset, setExploreOffset] = useState(0);
  const [exploreHasMore, setExploreHasMore] = useState(true);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showSavedPosts, setShowSavedPosts] = useState(false);
  const [exploreSeed, setExploreSeed] = useState(0);
  const [recentSearches, setRecentSearches] = useState<Array<{id:string;type:"user"|"query";query?:string;userId?:string;displayName?:string;username?:string}>>([]);
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [viewedProfile, setViewedProfile] = useState<{profile:Profile;posts:Post[]}|null>(null);
  const [touchStartY, setTouchStartY] = useState<number|null>(null);
  const exploreSentinelRef = useRef<HTMLDivElement|null>(null);

  const notificationCount = useMemo(() => notifications.filter(item => !item.readAt).length, [notifications]);

  useEffect(() => {
    void loadSavedPosts();
    void loadFriends();
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
      if (demoMode) {
        setPosts(DEMO_MEDIA_POSTS);
        setReels(DEMO_MEDIA_POSTS.filter(post => post.mediaType === "video"));
        setExplorePosts(DEMO_MEDIA_POSTS);
        setProfilePosts(DEMO_MEDIA_POSTS);
        setSavedPosts(DEMO_MEDIA_POSTS.slice(0, 2));
        setSavedPostIds(DEMO_MEDIA_POSTS.slice(0, 2).map(post => post.id));
        setProfile({id:account.id,displayName:account.displayName,email:account.email,postCount:DEMO_MEDIA_POSTS.length,followerCount:1280,followingCount:342,followedByMe:false});
        setLoading(false);
        return;
      }
      if (active === "home" || active === "reels") {
        setLoading(true);
        try {
          if (active === "home") {
            const data = await apiRequest<{ posts: Post[] }>("/social/feed");
            if (alive) setPosts(Array.isArray(data.posts) ? data.posts : []);
          } else {
            const data = await apiRequest<{ posts: Post[] }>(`/social/reels${friendsOnly ? "?friends=1" : ""}`);
            if (alive) setReels((Array.isArray(data.posts) ? data.posts : []).filter(post => Boolean(post.mediaUrl) && post.mediaType === "video"));
            if (alive && !friends.length) void loadFriends();
          }
        } catch (error) {
          if (alive) {
            setPageError(error instanceof Error ? error.message : t.genericError);
            if (active === "home") setPosts([]);
            if (active === "reels") setReels([]);
          }
        } finally {
          if (alive) setLoading(false);
        }
      }
      if (active === "search") {
        void loadExplore(true, true);
        void loadSearchHistory();
      }
      if (active === "inbox") {
        setLoading(true);
        try {
          const data=await apiRequest<{messages:SharedMessage[]}>("/social/messages");
          if(alive) setSharedMessages(data.messages||[]);
        } catch(error) {
          if(alive) {setSharedMessages([]);setPageError(error instanceof Error?error.message:t.genericError);}
        } finally { if(alive) setLoading(false); }
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
  }, [active, friendsOnly, account.displayName, account.email, account.id, t.genericError, demoMode]);

  function navigate(next: NavKey) {
    setAiOpen(false);
    setNotificationsOpen(false);
    if (next === "search") {
      setSearchOpen(false);
      setShowSavedPosts(false);
      setViewedProfile(null);
      setActive("search");
      return;
    }
    if (next === "reels") setFriendsOnly(false);
    setViewerOpen(false);
    setShowSavedPosts(false);
    setSearchOpen(false);
    setViewedProfile(null);
    setActive(next);
  }


  async function loadExplore(reset = false, shuffle = false) {
    if (exploreLoading) return;
    setExploreLoading(true);
    const requestSeed = shuffle || !exploreSeed ? Math.floor(Math.random() * 1000000) + 1 : exploreSeed;
    if (reset) {
      setExploreSeed(requestSeed);
      setExploreOffset(0);
    }
    try {
      const offset = reset ? 0 : exploreOffset;
      const data = await apiRequest<{posts:Post[];nextOffset:number;hasMore:boolean}>(`/social/explore?limit=30&offset=${offset}&seed=${requestSeed}`);
      const incoming = (data.posts || []).filter(post => Boolean(post.mediaUrl) && (post.mediaType === "image" || post.mediaType === "video"));
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
    setShowSavedPosts(false);
    try {
      const data = await apiRequest<{profile:Profile;posts:Post[]}>(`/social/users/${person.id}/profile`);
      setViewedProfile({profile:data.profile,posts:data.posts||[]});
      setProfileTab("Photos");
      try {
        await apiRequest("/social/search-history", {method:"POST",body:JSON.stringify({type:"user",userId:person.id})});
        await loadSearchHistory();
      } catch { /* Profile navigation remains available if history storage fails. */ }
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

  function openMediaViewer(post: Post, list: Post[], mode: "explore" | "profile" = "explore") {
    const items=list.filter(item=>Boolean(item.mediaUrl)&&(item.mediaType==="image"||item.mediaType==="video"));
    const index=Math.max(0,items.findIndex(item=>item.id===post.id));
    setViewerPosts(items);
    setViewerIndex(index);
    setViewerMode(mode);
    setViewerOpen(true);
  }

  function closeMediaViewer() { setViewerOpen(false); }

  async function loadSavedPosts() {
    try {
      const data=await apiRequest<{posts:Post[]}>("/social/saved");
      const next=data.posts||[];
      setSavedPosts(next);
      setSavedPostIds(next.map(post=>post.id));
    } catch { setSavedPosts([]); setSavedPostIds([]); }
  }

  async function loadFriends() {
    try {
      const data=await apiRequest<{friends:Person[]}>("/social/friends");
      setFriends(data.friends||[]);
    } catch { setFriends([]); }
  }

  async function recordPostView(post: Post) {
    try {
      const data=await apiRequest<{viewCount:number}>(`/social/posts/${post.id}/view`,{method:"POST"});
      updatePost(post.id,{viewCount:data.viewCount});
    } catch { /* View playback remains available if view tracking is not ready on the API yet. */ }
  }

  async function openShareSheet(post: Post) {
    setSharingPost(post);
    try {
      const data=await apiRequest<{users:ShareTarget[]}>(`/social/posts/${post.id}/share-targets`);
      setShareTargets(data.users||[]);
    } catch (error) {
      setShareTargets([]);
      setPageError(error instanceof Error?error.message:t.genericError);
    }
  }

  async function sendPostToUser(target: ShareTarget) {
    if(!sharingPost || shareSending) return;
    setShareSending(target.id);
    try {
      const data=await apiRequest<{shareCount:number}>(`/social/posts/${sharingPost.id}/share`,{method:"POST",body:JSON.stringify({targetUserId:target.id})});
      updatePost(sharingPost.id,{shareCount:data.shareCount});
      setSharingPost(null);
    } catch (error) { setPageError(error instanceof Error?error.message:t.genericError); }
    finally { setShareSending(null); }
  }

  async function runSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchLoading(true);
    setPageError("");
    try {
      const data = await apiRequest<{ users: Person[]; posts: Post[] }>(`/social/search?q=${encodeURIComponent(query.trim())}`);
      setPeople(data.users || []);
      await recordQuerySearch(query);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t.genericError);
    } finally {
      setSearchLoading(false);
    }
  }

  function updatePost(postId: string, changes: Partial<Post>) {
    const update=(items:Post[])=>items.map(item=>item.id===postId?{...item,...changes}:item);
    setPosts(update);
    setReels(update);
    setProfilePosts(update);
    setExplorePosts(update);
    setSavedPosts(update);
    setViewerPosts(update);
    setViewedProfile(current=>current?{...current,posts:update(current.posts)}:current);
  }

  async function toggleLike(post: Post) {
    try {
      const data = await apiRequest<{ liked: boolean; likeCount: number }>(`/social/posts/${post.id}/like`, { method: "POST" });
      updatePost(post.id, { likedByMe: data.liked, likeCount: data.likeCount });
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t.genericError);
    }
  }

  async function toggleRepost(post: Post) {
    try {
      const data=await apiRequest<{reposted:boolean;repostCount:number}>(`/social/posts/${post.id}/repost`,{method:"POST"});
      updatePost(post.id,{repostCount:data.repostCount});
    } catch(error) { setPageError(error instanceof Error?error.message:t.genericError); }
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
      setFriends(current=>data.following?(current.some(item=>item.id===person.id)?current:[...current,{...person,followedByMe:true}]):current.filter(item=>item.id!==person.id));
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
    if (active !== "search" || searchOpen || showSavedPosts || viewedProfile || !exploreHasMore) return;
    const node=exploreSentinelRef.current;
    if (!node || typeof IntersectionObserver==="undefined") return;
    const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)&&!exploreLoading)void loadExplore(false);},{rootMargin:"240px"});
    observer.observe(node);
    return ()=>observer.disconnect();
  },[active,searchOpen,showSavedPosts,viewedProfile,exploreHasMore,exploreLoading,exploreOffset]);

  const pageTitle = aiOpen ? t.ai : t[active];
  const visiblePosts = active === "reels" ? reels : posts;

  async function toggleSavedPost(post: Post) {
    try {
      const data=await apiRequest<{saved:boolean;saveCount:number}>(`/social/posts/${post.id}/save`,{method:"POST"});
      updatePost(post.id,{savedByMe:data.saved,saveCount:data.saveCount});
      setSavedPostIds(current=>data.saved?[...new Set([...current,post.id])]:current.filter(id=>id!==post.id));
      setSavedPosts(current=>data.saved?[{...post,savedByMe:true,saveCount:data.saveCount},...current.filter(item=>item.id!==post.id)]:current.filter(item=>item.id!==post.id));
    } catch(error) { setPageError(error instanceof Error?error.message:t.genericError); }
  }

  function renderPost(post: Post) {
    return <PostCard key={post.id} post={post} t={t} onLike={toggleLike} onToggleComments={toggleComments}
      commentsOpen={commentingPost === post.id} comments={commentsByPost[post.id] || []}
      commentDraft={commentDrafts[post.id] || ""} onCommentDraft={value => setCommentDrafts(current => ({ ...current, [post.id]: value }))}
      onSubmitComment={submitComment} commentsLoading={Boolean(commentsLoading[post.id])}
      onSave={toggleSavedPost} saved={savedPostIds.includes(post.id)||Boolean(post.savedByMe)}
      onRepost={toggleRepost} onShare={openShareSheet} onOpenMedia={item=>openMediaViewer(item,posts,"profile")} onView={item=>void recordPostView(item as Post)} language={language} />;
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

      {demoMode && <div role="status" style={{background:"#fff3cd",color:"#664d03",padding:"9px 14px",textAlign:"center",fontSize:13,fontWeight:700}}>حالت پیش‌نمایش — محتوای نمونه است و در حساب یا دیتابیس ذخیره نمی‌شود.</div>}
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
            <div className="nv-feed-header"><div className="nv-feed-switch"><button className="nv-feed-title" onClick={() => setFeedMenuOpen(v => !v)}>{t.home} <AppIcon icon={ChevronDown}/></button>{feedMenuOpen && <div className="nv-feed-menu"><button onClick={() => {setFeedMenuOpen(false);navigate("home")}}>Feed</button><button onClick={() => {setFeedMenuOpen(false);navigate("friends")}}>Following</button><button onClick={() => {setFeedMenuOpen(false);navigate("reels")}}>Reels</button></div>}</div><div className="nv-feed-tools"><button className="nv-round-action nv-bell" onClick={loadNotifications} aria-label="Notifications"><AppIcon icon={Bell}/><i/></button></div></div>
            <div className="nv-stories"><button className="nv-story add" onClick={() => navigate("create")} aria-label={t.create}><span className="nv-story-own-avatar"><Avatar name={account.displayName}/><b>+</b></span><small>{language === "fa" ? "پست جدید" : "New post"}</small></button></div>
            {loading ? <p className="social-muted social-center">{t.loading}</p> : posts.length ? <div className="social-post-list">{posts.map(renderPost)}</div> : <div className="nv-feed-empty"><strong>{t.noPosts}</strong><p>{t.noPostsHint}</p><button type="button" onClick={() => navigate("create")}>{t.create}</button></div>}
          </section>}

          {!aiOpen && active === "search" && <section className="nv-explore-screen">
            
            {viewedProfile ? <div className="nv-other-profile">
              <div className="nv-other-profile-head"><button type="button" onClick={()=>setViewedProfile(null)} aria-label="Back"><AppIcon icon={language==="fa"?ArrowRight:ArrowLeft}/></button><strong>{viewedProfile.profile.displayName}</strong></div>
              <div className="nv-profile-hero"><div className="nv-avatar-wrap"><span className="nv-profile-avatar nv-profile-avatar-placeholder"><AppIcon icon={UserRound}/></span></div><h2>{viewedProfile.profile.displayName}</h2><p>@{viewedProfile.profile.username || viewedProfile.profile.displayName.toLowerCase().replace(/\s+/g,"")}</p></div>
              <div className="nv-profile-stats"><div><strong>{viewedProfile.profile.postCount}</strong><small>{t.postCount}</small></div><div><strong>{viewedProfile.profile.followerCount}</strong><small>{t.followers}</small></div><div><strong>{viewedProfile.profile.followingCount}</strong><small>{t.followingCount}</small></div></div>
              <div className="nv-profile-buttons"><button type="button" className="nv-follow-profile" onClick={()=>followPerson(viewedProfile.profile)}>{viewedProfile.profile.followedByMe?t.following:t.follow}</button></div>
              <div className="nv-profile-grid is-other-profile">{viewedProfile.posts.filter(post=>Boolean(post.mediaUrl)&&(post.mediaType==="image"||post.mediaType==="video")).map(post=><button type="button" className="nv-profile-tile" key={post.id} onClick={()=>openMediaViewer(post,viewedProfile.posts,"profile")}>{post.mediaType==="video"?<video src={post.mediaUrl||undefined} muted playsInline preload="metadata"/>:<img src={post.mediaUrl||undefined} alt="" loading="lazy"/>}</button>)}</div>
            </div> : showSavedPosts ? <div className="nv-saved-explore-screen" dir="rtl">
              <div className="nv-explore-subpage-head"><button type="button" onClick={()=>setShowSavedPosts(false)} aria-label="بازگشت"><AppIcon icon={ArrowRight}/></button><strong>ذخیره‌شده‌ها</strong></div>
              <div className="nv-explore-grid">
                {savedPosts.filter(post=>Boolean(post.mediaUrl)&&(post.mediaType==="image"||post.mediaType==="video")).map(post=><button type="button" className="nv-explore-tile" key={post.id} onClick={()=>openMediaViewer(post,savedPosts,"explore")} aria-label={`${post.authorName}، ${formatExploreViews(post.viewCount)} بازدید`}>
                  {post.mediaType==="video"?<video src={post.mediaUrl||undefined} muted playsInline preload="metadata" onLoadedData={event=>{event.currentTarget.dataset.loaded="true";}}/>:<img src={post.mediaUrl||""} alt="" loading="lazy" onLoad={event=>{event.currentTarget.dataset.loaded="true";}}/>}
                  <span className="nv-explore-views"><AppIcon icon={Eye}/>{formatExploreViews(post.viewCount)}</span>
                </button>)}
              </div>
              {!savedPosts.some(post=>Boolean(post.mediaUrl)&&(post.mediaType==="image"||post.mediaType==="video"))&&<p className="social-muted social-center">هنوز محتوایی ذخیره نکرده‌ای.</p>}
            </div> : !searchOpen ? <>
              <div className="nv-explore-toolbar" dir="rtl"><form className="nv-explore-search-trigger" onSubmit={runSearch}><AppIcon icon={Search}/><input aria-label="جستجوی محتوا و مکان" value={query} onFocus={()=>{setSearchOpen(true);setShowSavedPosts(false);}} onChange={event=>setQuery(event.target.value)} placeholder="جستجو" /></form><button type="button" className="nv-explore-bookmark" aria-label="ذخیره‌شده‌ها" title="ذخیره‌شده‌ها" onClick={()=>{setShowSavedPosts(true);setSearchOpen(false);setViewedProfile(null);void loadSavedPosts();}}><AppIcon icon={Bookmark}/></button></div>
              <div className="nv-explore-grid" dir="rtl" onTouchStart={event=>setTouchStartY(event.touches[0]?.clientY??null)} onTouchEnd={event=>{const end=event.changedTouches[0]?.clientY??0;if(window.scrollY<=2&&touchStartY!==null&&end-touchStartY>70)void loadExplore(true,true);setTouchStartY(null);}}>
                {explorePosts.map(post=><button type="button" className="nv-explore-tile" key={post.id} onClick={()=>openMediaViewer(post,explorePosts,"explore")} aria-label={`${post.authorName}، ${formatExploreViews(post.viewCount)} بازدید`}>
                  {post.mediaType==="video"&&post.mediaUrl?<><video src={post.mediaUrl} muted playsInline preload="metadata" onLoadedData={event=>{event.currentTarget.dataset.loaded="true";}}/><span className="nv-tile-play"><AppIcon icon={Play}/></span></>:<img src={post.mediaUrl||""} alt="" loading="lazy" onLoad={event=>{event.currentTarget.dataset.loaded="true";}}/>}
                  <span className="nv-explore-views"><AppIcon icon={Eye}/>{formatExploreViews(post.viewCount)}</span>
                </button>)}
              </div>
              <div ref={exploreSentinelRef} className="nv-explore-sentinel">{exploreLoading?"در حال بارگذاری…":""}</div>
              {!exploreLoading&&!explorePosts.length&&<p className="social-muted social-center">هنوز محتوایی برای نمایش وجود ندارد.</p>}
            </> : <div className="nv-search-page" dir="rtl">
              <div className="nv-search-page-head"><button type="button" onClick={()=>{setSearchOpen(false);setQuery("");setHistoryExpanded(false);}} aria-label="بازگشت"><AppIcon icon={ArrowRight}/></button><form onSubmit={runSearch}><AppIcon icon={Search}/><input autoFocus value={query} onChange={event=>setQuery(event.target.value)} placeholder="جستجو" /></form></div>
              {!query.trim() ? <>
                <div className="nv-recent-heading"><strong>جدید</strong><button type="button" onClick={()=>setHistoryExpanded(value=>!value)}>دیدن همه</button></div>
                <div className="nv-recent-list">{(historyExpanded?recentSearches:recentSearches.slice(0,8)).map(item=><div className="nv-recent-row" key={item.id}>
                  <button type="button" className="nv-recent-main" onClick={()=>item.type==="user"&&item.userId?void openPersonProfile({id:item.userId,displayName:item.displayName||"",username:item.username,postCount:0,followerCount:0,followingCount:0,followedByMe:false}):setQuery(item.query||"")}>
                    <span className="nv-recent-avatar">{item.type==="user"?<AppIcon icon={UserRound}/>:<AppIcon icon={Clock}/>}</span><span className="nv-recent-copy">{item.type==="user"?<><strong>{item.username||item.displayName}</strong><small>{item.displayName}</small></>:<strong>{item.query}</strong>}</span>
                  </button><button type="button" className="nv-recent-remove" onClick={()=>void deleteSearchHistory(item.id)} aria-label="Remove">×</button>
                </div>)}</div>
                {recentSearches.length>0&&<button type="button" className="nv-clear-history" onClick={()=>void clearSearchHistory()}>پاک کردن تاریخچه</button>}
              </> : <div className="nv-live-results">{searchLoading?<p className="social-muted">در حال جستجو…</p>:searchResults.length?searchResults.map(person=><button type="button" className="nv-recent-row" key={person.id} onClick={()=>void openPersonProfile(person)}><span className="nv-recent-avatar"><AppIcon icon={UserRound}/></span><span className="nv-recent-copy"><strong>{person.username||person.displayName}</strong><small>{person.displayName}</small></span></button>):<p className="social-muted social-center">کاربری پیدا نشد.</p>}</div>}
            </div>}
          </section>}
          {!aiOpen && active === "friends" && <section className="nv-placeholder"><div className="nv-placeholder-icon"><AppIcon icon={UsersRound}/></div><h2>{t.friends}</h2><p>Find and connect with people on NOVYRA.</p></section>}
          {!aiOpen && active === "inbox" && <section className="nv-shared-inbox" dir="rtl">
            <header><MessageSquare/><strong>{t.inbox}</strong></header>
            {loading?<p className="social-muted social-center">{t.loading}</p>:sharedMessages.length?sharedMessages.map(message=><article className="nv-shared-message" key={message.id}>
              <div className="nv-shared-message-user"><Avatar name={message.received?message.senderName:message.recipientName}/><div><strong>{message.received?message.senderName:message.recipientName}</strong><small>{message.received?"برای تو فرستاد":"ارسال‌شده توسط تو"} · {formatPostAge(message.createdAt,language)}</small></div></div>
              <p>{message.body}</p>
              {message.sharedPostId&&<div className="nv-shared-message-post">
                {message.mediaUrl&&message.mediaType==="video"?<video src={message.mediaUrl} controls playsInline preload="metadata"/>:message.mediaUrl&&message.mediaType==="image"?<img src={message.mediaUrl} alt="" loading="lazy"/>:null}
                <p><bdi dir="auto">{message.postAuthorName||""}</bdi>{message.postBody ? " — "+message.postBody : ""}</p>
              </div>}
            </article>):<div className="nv-placeholder"><div className="nv-placeholder-icon"><AppIcon icon={MessageSquare}/></div><h2>{t.inbox}</h2><p>هنوز پستی برایت ارسال نشده است.</p></div>}
          </section>}

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
            {loading ? <p className="social-muted social-center">{t.loading}</p> : <MediaViewer
              items={reels as SocialMediaPost[]}
              mode="reels"
              userId={account.id}
              friends={friends as SocialMediaPerson[]}
              friendsOnly={friendsOnly}
              onFriendsToggle={()=>setFriendsOnly(value=>!value)}
              onCreate={()=>{setMediaType("video");navigate("create");}}
              onLike={post=>void toggleLike(post as Post)}
              onComments={post=>void toggleComments(post as Post)}
              onRepost={post=>void toggleRepost(post as Post)}
              onShare={post=>void openShareSheet(post as Post)}
              onSave={post=>void toggleSavedPost(post as Post)}
              onView={post=>void recordPostView(post as Post)}
              onFollow={person=>void followPerson(person as Person)}
              followingIds={friends.map(person=>person.id)}
              savedPostIds={savedPostIds}
              commentsByPost={commentsByPost}
              commentsLoading={commentsLoading}
              commentDrafts={commentDrafts}
              commentsOpenFor={commentingPost}
              onCommentDraft={(postId,value)=>setCommentDrafts(current=>({...current,[postId]:value}))}
              onSubmitComment={post=>void submitComment(post as Post)}
            />}
          </section>}

          {!aiOpen && active === "profile" && <section className="social-profile-screen">
            {loading ? <p className="social-muted social-center">{t.loading}</p> : <>
              <div className="nv-profile-cover"><span className="nv-cover-status"/></div>
              <div className="nv-profile-hero"><div className="nv-avatar-wrap"><span className="nv-profile-avatar nv-profile-avatar-placeholder">{initials(profile?.displayName || account.displayName)}</span><button type="button" className="nv-camera-badge" aria-label="Change profile photo"><AppIcon icon={Camera}/></button></div><h2>{profile?.displayName || account.displayName}</h2><p>@{(profile?.displayName || account.displayName).toLowerCase().replace(/[^a-z0-9]/g,"") || "username"}</p><button type="button" className="nv-edit-pill" onClick={() => document.getElementById("nv-profile-name")?.focus()}>{t.editProfile}</button></div>
              <div className="nv-profile-stats"><div><strong>{profile?.postCount ?? profilePosts.length}</strong><small>{t.postCount}</small></div><div><strong>{(profile?.followerCount ?? 0).toLocaleString(language==="fa"?"fa-IR":undefined)}</strong><small>{t.followers}</small></div><div><strong>{(profile?.followingCount ?? 0).toLocaleString(language==="fa"?"fa-IR":undefined)}</strong><small>{t.followingCount}</small></div><div><strong>{profilePosts.reduce((sum,post)=>sum+(post.likeCount||0),0).toLocaleString(language==="fa"?"fa-IR":undefined)}</strong><small>{language==="fa"?"پسندها":"Likes"}</small></div></div>
              <div className="nv-profile-tabs" role="tablist" aria-label="Profile content">{(["Photos","Videos","Saved"] as const).map(tab=><button key={tab} type="button" className={profileTab===tab?"is-active":""} onClick={() => {setProfileTab(tab);if(tab==="Saved")void loadSavedPosts();}}>{tab==="Saved" && <AppIcon icon={LockKeyhole}/>}<span>{tab}</span></button>)}</div>
              <div className="nv-profile-grid">{(profileTab==="Saved"?savedPosts:profilePosts.filter(post=>profileTab==="Photos"?post.mediaType==="image":post.mediaType==="video")).map(item=><button type="button" key={item.id} className="nv-profile-tile" onClick={()=>openMediaViewer(item,profileTab==="Saved"?savedPosts:profilePosts.filter(post=>profileTab==="Photos"?post.mediaType==="image":post.mediaType==="video"),"profile")}>{item.mediaType==="video"?<><video src={item.mediaUrl||undefined} muted playsInline preload="metadata"/><AppIcon icon={Play}/></>:item.mediaUrl?<img src={item.mediaUrl} alt="" loading="lazy"/>:<span className="nv-explore-text-tile">{item.body}</span>}</button>)}</div>
              <form className="social-profile-edit" onSubmit={saveProfile}><label>{t.editProfile}<input id="nv-profile-name" value={profileName} onChange={event => setProfileName(event.target.value)} maxLength={32}/></label><button type="submit" disabled={profileSaving || profileName.trim().length<2}>{profileSaving?"…":t.save}</button></form>
              <div className="social-profile-settings"><label>{t.language}<select value={language} onChange={event => changeLanguage(event.target.value)}><option value="fa">فارسی</option><option value="en">English</option><option value="ar">العربية</option><option value="ku">کوردی</option></select></label><button type="button" className="social-logout-button" onClick={logout}>{t.logout}</button></div>
            </>}
          </section>}
        </section>
      </div>

      {viewerOpen && <MediaViewer
        key={viewerMode}
        items={viewerPosts as SocialMediaPost[]}
        initialIndex={viewerIndex}
        mode={viewerMode}
        userId={account.id}
        friends={friends as SocialMediaPerson[]}
        onClose={closeMediaViewer}
        onLike={post=>void toggleLike(post as Post)}
        onComments={post=>void toggleComments(post as Post)}
        onRepost={post=>void toggleRepost(post as Post)}
        onShare={post=>void openShareSheet(post as Post)}
        onSave={post=>void toggleSavedPost(post as Post)}
        onView={post=>void recordPostView(post as Post)}
        onFollow={person=>void followPerson(person as Person)}
        followingIds={friends.map(person=>person.id)}
        savedPostIds={savedPostIds}
        commentsByPost={commentsByPost}
        commentsLoading={commentsLoading}
        commentDrafts={commentDrafts}
        commentsOpenFor={commentingPost}
        onCommentDraft={(postId,value)=>setCommentDrafts(current=>({...current,[postId]:value}))}
        onSubmitComment={post=>void submitComment(post as Post)}
      />}
      {sharingPost && <section className="nv-share-sheet-backdrop" role="dialog" aria-modal="true" onClick={()=>setSharingPost(null)}>
        <div className="nv-share-sheet" dir="rtl" onClick={event=>event.stopPropagation()}>
          <div className="nv-share-sheet-head"><strong>ارسال برای دوستان</strong><button type="button" onClick={()=>setSharingPost(null)} aria-label="بستن"><AppIcon icon={X}/></button></div>
          {shareTargets.length ? shareTargets.map(person=><button type="button" className="nv-share-target" key={person.id} onClick={()=>void sendPostToUser(person)} disabled={Boolean(shareSending)}><Avatar name={person.displayName}/><span><strong>{person.displayName}</strong><small>@{person.username||person.displayName.toLowerCase().replace(/\s+/g,"")}</small></span><span className="nv-share-send">{shareSending===person.id?"…":"ارسال"}</span></button>) : <p className="social-muted social-center">هنوز کاربر دیگری در NOVYRA ثبت‌نام نکرده است.</p>}
        </div>
      </section>}
      <nav className="social-mobile-nav-wrap">
        <MobileBottomNav active={active} labels={{home:t.home,reels:t.reels,message:t.inbox,search:t.search,profile:t.profile}} userId={account.id} displayName={profile?.displayName || account.displayName} avatarUrl={profile?.avatarUrl || profile?.avatar_url || profile?.photoUrl || profile?.imageUrl}
          onNavigate={navigate} onOpenAI={() => { setAiOpen(true); setNotificationsOpen(false); }} />
      </nav>
    </div>
  </main>;
}
