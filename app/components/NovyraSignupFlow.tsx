"use client";
import {useEffect,useMemo,useState} from "react";
import Script from "next/script";
import {useForm} from "react-hook-form";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {ArrowLeft,ArrowRight,Globe,Eye,EyeOff,Wallet,BriefcaseBusiness,ShieldCheck,Check,LockKeyhole, Fingerprint, Sparkles} from "lucide-react";
import {API_BASE,apiRequest,setSession,createPasswordSalt,derivePasswordHash,deriveAppLockHash,ApiRequestError} from "../lib/api";
import {saveDeviceLock} from "../lib/device-lock";
import {countries} from "../data/countries";
import {currencies} from "../data/currencies";
import {Button} from "./novyra/Button";
import {Input} from "./novyra/Input";
import {Card} from "./novyra/Card";
import {StepProgress} from "./novyra/StepProgress";
import {CountrySelect} from "./novyra/CountrySelect";
import {PinPad} from "./novyra/PinPad";
import {PatternLock} from "./novyra/PatternLock";
import {detectLocale,localeMeta,translate,type Locale} from "./novyra/i18n";
import {normalizeEmail,isValidEmail} from "../../workers/api/auth-email.mjs";
import {authErrorKey} from "../lib/auth-errors";

type Values={firstName:string;lastName:string;email:string;country:string;password:string;confirmPassword:string};
type Lock="none"|"pin"|"pattern";
type Mode="personal"|"business";
type User={id:string;email:string;displayName:string;xp?:number;gamesPlayed?:number;role?:string;profile?:{accountType?:"personal"|"business";appLockType?:Lock;currency?:string}};
declare global { interface Window { turnstile?: { render:(container:string,options:any)=>string; reset:(id?:string)=>void; }; } }
type Props={onComplete:(user:User|null,language:any)=>void;initialNotice?:string};
const schema=z.object({firstName:z.string().trim().min(1),lastName:z.string().trim().min(1),email:z.string().trim().refine(isValidEmail,{message:"emailInvalid"}),country:z.string().min(2),password:z.string().min(10),confirmPassword:z.string().min(1)}).refine(v=>!v.confirmPassword || !v.password || v.password===v.confirmPassword,{path:["confirmPassword"],message:"passwordMismatch"});
function base64UrlToBytes(value:string){const normalized=value.replace(/-/g,"+").replace(/_/g,"/");const binary=atob(normalized.padEnd(Math.ceil(normalized.length/4)*4,"="));return Uint8Array.from(binary,char=>char.charCodeAt(0));}
function bytesToBase64Url(value:ArrayBuffer){const bytes=new Uint8Array(value);let binary="";for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");}
const currenciesFallback=["USD","EUR","GBP","IRR","TRY","AED","SAR","CAD","AUD","CHF","JPY","CNY","NOK","SEK","DKK"];
export default function NovyraSignupFlow({onComplete,initialNotice=""}:Props){
 const [locale,setLocale]=useState<Locale>("en"),[step,setStep]=useState(0),[mode,setMode]=useState<Mode>("personal"),[lock,setLock]=useState<Lock>("none"),[pin,setPin]=useState(""),[pinConfirm,setPinConfirm]=useState(""),[pattern,setPattern]=useState(""),[patternConfirm,setPatternConfirm]=useState(""),[lockPhase,setLockPhase]=useState<"create"|"confirm">("create"),[lockNotice,setLockNotice]=useState(""),[currency,setCurrency]=useState(""),[company,setCompany]=useState(""),[busy,setBusy]=useState(false),[notice,setNotice]=useState(initialNotice),[showPassword,setShowPassword]=useState(false),[showConfirm,setShowConfirm]=useState(false),[strength,setStrength]=useState(0),[complete,setComplete]=useState(false),[loginMode,setLoginMode]=useState(false),[forgotMode,setForgotMode]=useState(false),[forgotEmail,setForgotEmail]=useState(""),[forgotSuccess,setForgotSuccess]=useState(false),[forgotError,setForgotError]=useState(""),[forgotRequestId,setForgotRequestId]=useState(""),[verificationCode,setVerificationCode]=useState(""),[verificationPending,setVerificationPending]=useState(false),[resetToken,setResetToken]=useState(""),[resetPassword,setResetPassword]=useState(""),[resetConfirm,setResetConfirm]=useState(""),[captchaToken,setCaptchaToken]=useState(""),[captchaWidget,setCaptchaWidget]=useState<string|null>(null),[captchaReady,setCaptchaReady]=useState(false),[captchaLoadError,setCaptchaLoadError]=useState(false),[emailAccountType,setEmailAccountType]=useState<"password"|"google"|null>(null),[emailContinueChecked,setEmailContinueChecked]=useState(false),[resendSeconds,setResendSeconds]=useState(0),[biometricRegistration,setBiometricRegistration]=useState<any>(null),[biometricSupported,setBiometricSupported]=useState(false),[biometricLoginAvailable,setBiometricLoginAvailable]=useState(false),[loginErrorKind,setLoginErrorKind]=useState<"credentials"|"reset"|"unverified"|"rate"|"network"|"server"|null>(null),[loginRequestId,setLoginRequestId]=useState("");
 const t=(key:string)=>translate(locale,key),rtl=localeMeta[locale].dir==="rtl"; const NextIcon=rtl?ArrowLeft:ArrowRight;
 const form=useForm<Values>({resolver:zodResolver(schema),mode:"onTouched",defaultValues:{firstName:"",lastName:"",email:"",country:"",password:"",confirmPassword:""}});
 const {register,handleSubmit,setValue,watch,formState:{errors,touchedFields}}=form;
 const values=watch();
 function mountTurnstile(){const siteKey=process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;if(!siteKey){console.warn("[NOVYRA] NEXT_PUBLIC_TURNSTILE_SITE_KEY is missing; Turnstile will be skipped in this environment.");return;}if(!window.turnstile||captchaWidget)return;setCaptchaLoadError(false);const id=window.turnstile.render("#novyra-turnstile",{sitekey:siteKey,theme:"light",appearance:"always",callback:(token:string)=>{setCaptchaToken(token);setCaptchaLoadError(false);},"expired-callback":()=>setCaptchaToken(""),"error-callback":()=>{setCaptchaToken("");setCaptchaLoadError(true);}});setCaptchaWidget(id);}
 const captchaRequired=!!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
 async function verifySignupCode(){if(busy)return;if(!/^\d{6}$/.test(verificationCode)){setNotice(t("codeInvalid"));return;}setBusy(true);try{const data=await apiRequest<{token:string;user:User}>("/auth/verify-code",{method:"POST",body:JSON.stringify({email:normalizeEmail(values.email),code:verificationCode})});setSession(data.token);localStorage.setItem("projectx-language",locale);localStorage.setItem("projectx-country",values.country);localStorage.setItem("projectx-account-type",mode);localStorage.setItem("novyra-finance-currency",currency);await saveDeviceLock(data.user.id,lock,lock==="none"?undefined:(lock==="pin"?pin:pattern));localStorage.setItem("projectx-app-lock-user",data.user.id);localStorage.setItem("projectx-app-lock-biometric",lock!=="none"&&biometricRegistration?"1":"0");if(lock!=="none"&&biometricRegistration)localStorage.setItem("projectx-app-lock-credential",biometricRegistration.id);localStorage.setItem("projectx-first-run-complete","1");setComplete(true);setStep(4);}catch(e){setNotice(e instanceof Error?e.message:t("error"));}finally{setBusy(false);}}
 async function submitPasswordReset(){if(resetPassword.length<10||resetPassword!==resetConfirm){setNotice(resetPassword!==resetConfirm?t("passwordMismatch"):t("passwordShort"));return;}setBusy(true);try{const salt=createPasswordSalt();const passwordHash=await derivePasswordHash(resetPassword,salt);await apiRequest("/auth/reset-password",{method:"POST",body:JSON.stringify({token:resetToken,salt,passwordHash})});window.history.replaceState({},"",window.location.pathname);setResetToken("");setLoginMode(true);setStep(1);setNotice(t("passwordResetDone"));}catch(e){setNotice(e instanceof Error?e.message:t("error"));}finally{setBusy(false);}}
 async function resendSignupCode(){if(busy)return;setBusy(true);try{await apiRequest("/auth/resend-code",{method:"POST",body:JSON.stringify({email:values.email.trim().toLowerCase()})});setResendSeconds(60);setNotice(t("codeResent"));}catch(e){setNotice(e instanceof Error?e.message:t("error"));}finally{setBusy(false);}}
 useEffect(()=>{const next=detectLocale();setLocale(next);document.documentElement.lang=next;document.documentElement.dir=localeMeta[next].dir;if(window.isSecureContext&&typeof PublicKeyCredential!=="undefined"){const check=(PublicKeyCredential as unknown as {isUserVerifyingPlatformAuthenticatorAvailable?:()=>Promise<boolean>}).isUserVerifyingPlatformAuthenticatorAvailable;if(typeof check==="function")check().then(setBiometricSupported).catch(()=>setBiometricSupported(false));}const rememberedAccount=(()=>{try{return JSON.parse(localStorage.getItem("projectx-account")||"null")}catch{return null}})();if(localStorage.getItem("projectx-app-lock-biometric")==="1"&&localStorage.getItem("projectx-app-lock-user")&&rememberedAccount?.email){setValue("email",rememberedAccount.email);setBiometricLoginAvailable(true);}const token=new URLSearchParams(window.location.search).get("reset");if(token){setResetToken(token);setStep(6);}},[]);
 useEffect(()=>{if(captchaReady&&step>=1&&step<=3&&!loginMode){const timer=window.setTimeout(mountTurnstile,100);return()=>window.clearTimeout(timer)}},[captchaReady,step,loginMode]);
 useEffect(()=>{setEmailContinueChecked(false);setEmailAccountType(null);},[values.email]);
 useEffect(()=>{if(resendSeconds<=0)return;const timer=window.setInterval(()=>setResendSeconds(v=>Math.max(0,v-1)),1000);return()=>window.clearInterval(timer)},[resendSeconds>0]);
 useEffect(()=>{const p=values.password||"";let s=0;if(p.length>=10)s++;if(/[A-Z]/.test(p)&&/[a-z]/.test(p))s++;if(/\d/.test(p))s++;if(/[^A-Za-z0-9]/.test(p))s++;setStrength(s);},[values.password]);
 const country=useMemo(()=>countries.find(c=>c.code===values.country),[values.country]);
 useEffect(()=>{setCurrency(country?.defaultCurrency||"");},[country?.code]);
 const stepTitle=step===1?t("step1Title"):step===2?t("step2Title"):step===3?t("step3Title"):t("step4Title");
 const localizedCurrency=(code:string)=>{try{return new Intl.DisplayNames([locale],{type:"currency"}).of(code)||code}catch{return code}};
 const currencyList=useMemo(()=>Array.from(new Set([...currencies.map(c=>c.code),...currenciesFallback])).sort(),[]);
 async function checkEmailExists(){
  const email=normalizeEmail(values.email);
  if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  try{
    const result=await apiRequest<{exists:boolean;provider:"password"|"google"|null}>("/auth/email-check",{method:"POST",body:JSON.stringify({email,turnstileToken:captchaToken})});
    setEmailAccountType(result.exists?result.provider:null);
    if(result.exists) setNotice(t("accountExists"));
    else setNotice(current=>current===t("accountExists")?"":current);
    return result.exists;
  }catch(e){
    setNotice(e instanceof Error?e.message:t("error"));
    return null;
  }
 }
 async function forgotPassword(){
  if(busy||resendSeconds>0&&forgotSuccess)return;
  const email=normalizeEmail(forgotEmail);
  setForgotError("");setForgotRequestId("");
  if(!isValidEmail(email)){setForgotError(t("emailInvalid"));return;}
  setBusy(true);
  try{
    await apiRequest("/auth/forgot-password",{method:"POST",body:JSON.stringify({email})});
    setForgotSuccess(true);setResendSeconds(60);setNotice("");
  }catch(error){
    if(error instanceof ApiRequestError){
      setForgotRequestId(error.requestId||"");
      setForgotError(t(authErrorKey(error.code,error.status)));
    }else setForgotError(t(authErrorKey("NETWORK")));
  }finally{setBusy(false);}
 }
 async function submitDetails(){
  setNotice("");
  if(captchaRequired&&!captchaToken){setNotice(t("captchaAgain"));return;}
  setBusy(true);
  try{
    const exists=await checkEmailExists();
    if(exists){setLoginMode(true);setStep(1);setNotice(t("accountExists"));return;}
    if(exists===null)return;
    setEmailContinueChecked(true);
    setStep(2);
  }finally{setBusy(false);}
 }
 async function setupBiometric(){try{
  const email=normalizeEmail(values.email);
  if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error("biometricEmailRequired");
  if(!window.isSecureContext||!window.PublicKeyCredential||!navigator.credentials?.create)throw new Error("biometricUnavailable");
  if(typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable==="function"&&!await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())throw new Error("biometricUnavailable");
  const options=await apiRequest<any>("/auth/webauthn/register/options",{method:"POST",body:JSON.stringify({email})});
  const publicKey:any={...options,challenge:base64UrlToBytes(options.challenge),user:{...options.user,id:base64UrlToBytes(options.user.id)}};
  if(Array.isArray(options.excludeCredentials))publicKey.excludeCredentials=options.excludeCredentials.map((item:any)=>({...item,id:base64UrlToBytes(item.id)}));
  const credential=await navigator.credentials.create({publicKey}) as PublicKeyCredential|null;
  if(!credential)throw new Error("biometricCancelled");
  const response=credential.response as AuthenticatorAttestationResponse;
  const transports=typeof response.getTransports==="function"?response.getTransports():[];
  setBiometricRegistration({id:credential.id,rawId:bytesToBase64Url(credential.rawId),type:credential.type,authenticatorAttachment:credential.authenticatorAttachment,response:{clientDataJSON:bytesToBase64Url(response.clientDataJSON),attestationObject:bytesToBase64Url(response.attestationObject),transports},clientExtensionResults:credential.getClientExtensionResults()});
  setNotice("");
 }catch(e){const name=e instanceof DOMException?e.name:"";const key=name==="NotAllowedError"?"biometricCancelled":name==="NotSupportedError"||name==="SecurityError"?"biometricUnavailable":"biometricFailed";setNotice(e instanceof Error&&["biometricUnavailable","biometricCancelled","biometricEmailRequired"].includes(e.message)?t(e.message):t(key));}}
 async function finish(){if(busy)return;setNotice("");if(!currency){setNotice(locale==="fa"?"ابتدا کشور را انتخاب کن تا ارز پیش‌فرض آن مشخص شود.":"Choose a country first so its default currency can be selected.");return;}if(lock==="pin"&&(pin.length<6||pin!==pinConfirm)){setNotice(pin!==pinConfirm?t("pinMismatch"):t("pinEnter"));return;}if(lock==="pattern"&&(pattern.split("-").length<4||pattern!==patternConfirm)){setNotice(pattern!==patternConfirm?t("patternMismatch"):t("patternDraw"));return;}if(mode==="business"&&!company.trim()){setNotice(t("companyRequired"));return;}setBusy(true);const email=normalizeEmail(values.email);let timer=0;const controller=new AbortController();timer=window.setTimeout(()=>controller.abort(),25000);
 try{const salt=createPasswordSalt();const passwordHash=await derivePasswordHash(values.password,salt);const lockSecret=lock==="pin"?pin:lock==="pattern"?pattern:"";const appLockHash=lock==="none"?null:await deriveAppLockHash(lockSecret,email);const data=await apiRequest<{token?:string;user?:User;verificationRequired?:boolean}>("/auth/register",{method:"POST",body:JSON.stringify({turnstileToken:captchaToken,email,name:values.firstName.trim()+" "+values.lastName.trim(),firstName:values.firstName.trim(),lastName:values.lastName.trim(),country:values.country,currency,language:locale,direction:rtl?"rtl":"ltr",accountType:mode,companyName:mode==="business"?company.trim():null,appLockType:lock,appLockHash,webauthnRegistration:lock!=="none"?biometricRegistration:null,salt,passwordHash}),signal:controller.signal});if(data.verificationRequired){setVerificationPending(true);setResendSeconds(60);setStep(5);setNotice(t("verificationSent"));return;}if(!data.token||!data.user)throw new Error(t("error"));setSession(data.token);localStorage.setItem("projectx-language",locale);localStorage.setItem("projectx-country",values.country);localStorage.setItem("projectx-account-type",mode);if(mode==="business")localStorage.setItem("novyra-business-name",company.trim());localStorage.setItem("novyra-finance-currency",currency);await saveDeviceLock(data.user.id,lock,lock==="none"?undefined:lockSecret);localStorage.setItem("projectx-app-lock-user",data.user.id);localStorage.setItem("projectx-app-lock-biometric",lock!=="none"&&biometricRegistration?"1":"0");if(lock!=="none"&&biometricRegistration)localStorage.setItem("projectx-app-lock-credential",biometricRegistration.id);else localStorage.removeItem("projectx-app-lock-credential");localStorage.setItem("projectx-account",JSON.stringify({name:data.user.displayName||values.firstName+" "+values.lastName,email}));localStorage.setItem("projectx-first-run-complete","1");setComplete(true);setStep(4);
 }catch(e){const message=e instanceof Error?e.message:"";if(/برای این ایمیل حسابی وجود دارد|account already exists|email already exists|already registered/i.test(message)){setLoginMode(true);setStep(1);setNotice(t("accountExists"));}else{setNotice(e instanceof DOMException&&e.name==="AbortError"?t("timeout"):message||t("error"));}}finally{clearTimeout(timer);setBusy(false);}}
 async function biometricLogin(){
  const email=normalizeEmail(values.email);
  if(!isValidEmail(email)){setNotice(t("emailInvalid"));return;}
  setBusy(true);setNotice("");
  try{
    if(!window.isSecureContext||!window.PublicKeyCredential||!navigator.credentials?.get)throw new Error("biometricUnavailable");
    const options=await apiRequest<any>("/auth/webauthn/authenticate/options",{method:"POST",body:JSON.stringify({email})});
    const publicKey:any={...options,challenge:base64UrlToBytes(options.challenge)};
    if(Array.isArray(options.allowCredentials))publicKey.allowCredentials=options.allowCredentials.map((item:any)=>({...item,id:base64UrlToBytes(item.id)}));
    const credential=await navigator.credentials.get({publicKey}) as PublicKeyCredential|null;
    if(!credential)throw new Error("biometricCancelled");
    const response=credential.response as AuthenticatorAssertionResponse;
    const serialized={id:credential.id,rawId:bytesToBase64Url(credential.rawId),type:credential.type,authenticatorAttachment:credential.authenticatorAttachment,response:{clientDataJSON:bytesToBase64Url(response.clientDataJSON),authenticatorData:bytesToBase64Url(response.authenticatorData),signature:bytesToBase64Url(response.signature),userHandle:response.userHandle?bytesToBase64Url(response.userHandle):null},clientExtensionResults:credential.getClientExtensionResults()};
    const data=await apiRequest<{token:string;user:User}>("/auth/webauthn/authenticate/verify",{method:"POST",body:JSON.stringify({email,credential:serialized})});
    setSession(data.token);localStorage.setItem("projectx-language",locale);onComplete(data.user,locale as any);
  }catch(e){const name=e instanceof DOMException?e.name:"";const key=name==="NotAllowedError"?"biometricCancelled":name==="NotSupportedError"||name==="SecurityError"?"biometricUnavailable":"biometricFailed";setNotice(e instanceof Error&&["biometricUnavailable","biometricCancelled"].includes(e.message)?t(e.message):e instanceof Error?e.message:t(key));}
  finally{setBusy(false);}
 }
 async function login(){
  if(busy)return;
  const email=normalizeEmail(values.email);
  if(!isValidEmail(email)||!values.password){setNotice(t("required"));return;}
  setBusy(true);setNotice("");setLoginErrorKind(null);setLoginRequestId("");
  try{
    const saltData=await apiRequest<{salt:string}>("/auth/password-salt?email="+encodeURIComponent(email),{method:"GET"});
    const passwordHash=await derivePasswordHash(values.password,saltData.salt);
    const data=await apiRequest<{token:string;user:User}>("/auth/login",{method:"POST",body:JSON.stringify({email,passwordHash})});
    setSession(data.token);
    localStorage.setItem("projectx-language",locale);
    localStorage.setItem("projectx-account",JSON.stringify({name:data.user.displayName,email:data.user.email}));
    onComplete(data.user,locale as any);
  }catch(e){
    setValue("password","");
    if(e instanceof ApiRequestError){
      setLoginRequestId(e.requestId||"");
      if(e.code==="NEEDS_RESET"){setLoginErrorKind("reset");setNotice(t(authErrorKey("NEEDS_RESET")));}
      else if(e.status===401){setLoginErrorKind("credentials");setNotice(t(authErrorKey(e.code,e.status)));}
      else if(e.status===403){setLoginErrorKind("unverified");setNotice(t(authErrorKey(e.code,e.status)));}
      else if(e.status===429){setLoginErrorKind("rate");setResendSeconds(Math.max(1,e.retryAfterSeconds||900));setNotice(t(authErrorKey(e.code,e.status)));}
      else if(e.status>=500){setLoginErrorKind("server");setNotice(t(authErrorKey(e.code,e.status)));}
      else {setLoginErrorKind("server");setNotice(t("loginServerProblem"));}
    }else{
      setLoginErrorKind("network");
      setNotice(t(authErrorKey("NETWORK")));
    }
  }finally{setBusy(false);}
 }
 const passwordStrengthText=strength<2?t("weak"):strength<4?t("fair"):t("strong");
 return <main className="nv-root" dir={rtl?"rtl":"ltr"} lang={locale}>
  <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={()=>setCaptchaReady(true)}/>
  <div className="nv-topbar"><div className="nv-brand"><span className="nv-logo">N</span><span className="nv-brand-copy"><b>NOVYRA</b><small>{t("slogan")}</small></span></div><label className="nv-language"><Globe size={16}/><select aria-label={t("language")} value={locale} onChange={e=>{const l=e.target.value as Locale;setLocale(l);document.documentElement.lang=l;document.documentElement.dir=localeMeta[l].dir;}}>{(Object.keys(localeMeta) as Locale[]).map(l=><option value={l} key={l}>{localeMeta[l].label}</option>)}</select></label></div>
  <div className="nv-layout"><div className="nv-showcase"><div className="nv-ai-orb"><Sparkles size={25}/></div><p className="nv-kicker">{t("financialClarity")}</p><h1>{t("welcome")}</h1><p>{t("welcomeSub")}</p><div className="nv-preview-phones"><div className="nv-phone nv-phone-back"><div className="nv-phone-notch"/><small>{t("business").toLocaleUpperCase(locale)}</small><strong>€24,850</strong><span className="nv-chart"/></div><div className="nv-phone nv-phone-front"><div className="nv-phone-notch"/><small>{t("personal").toLocaleUpperCase(locale)}</small><strong>$8,420</strong><span className="nv-chart nv-chart-two"/></div></div></div>
   <Card className="nv-flow-card">{notice&&!loginMode&&<div className="nv-toast" role="alert" aria-live="assertive">{notice}<button type="button" onClick={()=>setNotice("")} aria-label={t("dismiss")}>×</button></div>}<div className="nv-card-head"><div><div className="nv-eyebrow">NOVYRA / {loginMode?t("login"):t("getStarted")}</div><h2>{loginMode?(forgotMode?t("forgotPassword"):t("login")):step===0?t("welcome"):stepTitle}</h2></div>{step>0&&step!==4&&<button className="nv-back" type="button" onClick={()=>{if(loginMode&&forgotMode){setForgotMode(false);setNotice("");}else if(loginMode){setLoginMode(false);setNotice("");setLoginErrorKind(null);setLoginRequestId("");setValue("password","");setStep(0);}else setStep(step===1?0:step-1);}} aria-label={t("back")}>{rtl?<ArrowRight/>:<ArrowLeft/>}</button>}</div>
    {step>0&&!loginMode&&<StepProgress step={step} label={t("step")} locale={locale}/>}
    {step===0&&<div className="nv-step"><p className="nv-muted">{t("welcomeSub")}</p><Button onClick={()=>{setLoginMode(false);setStep(1);}}>{t("create")} <NextIcon size={17}/></Button><Button variant="secondary" onClick={()=>{setLoginMode(true);setStep(1);}}>{t("login")}</Button><button className="nv-google" type="button" onClick={()=>{window.location.href=API_BASE+"/auth/google/start?returnTo="+encodeURIComponent(window.location.pathname+window.location.search)}}><svg className="nv-google-mark" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11c-.5 2.5-2 4.6-4.2 6v5h6.8c4-3.7 6-9 6-14.7z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.8-5c-1.9 1.3-4.1 2-6.7 2-5.2 0-9.6-3.5-11.2-8.2H5.8v5.2C9.2 39.6 16 44 24 44z"/><path fill="#FBBC05" d="M12.8 28c-.4-1.2-.7-2.6-.7-4s.3-2.8.7-4v-5.2H5.8C4.4 17.5 3.5 20.6 3.5 24s.9 6.5 2.3 9.2l7-5.2z"/><path fill="#EA4335" d="M24 11.8c3 0 5.7 1 7.8 3.1l5.9-5.9C34.1 5.8 29.5 4 24 4 16 4 9.2 8.4 5.8 14.8l7 5.2c1.6-4.7 6-8.2 11.2-8.2z"/></svg>{t("google")}</button></div>}
    {step===1&&loginMode&&forgotMode&&(forgotSuccess?<div className="nv-step nv-success" role="status" aria-live="polite"><div className="nv-success-check"><Check size={36}/></div><h3>{t("forgotSuccessTitle")}</h3><p>{t("forgotSuccessBody")}</p><Button variant="secondary" disabled={busy||resendSeconds>0} onClick={()=>void forgotPassword()}>{resendSeconds>0?t("forgotResendWait").replace("{seconds}",String(resendSeconds)):t("forgotResend")}</Button><button type="button" className="nv-skip" onClick={()=>{setForgotSuccess(false);setForgotError("");setForgotEmail("");setResendSeconds(0);}}>{t("back")}</button></div>:<form className="nv-step" onSubmit={e=>{e.preventDefault();void forgotPassword();}} noValidate><p className="nv-muted">{t("forgotIntro")}</p><Input label={t("email")}><input type="email" autoComplete="email" inputMode="email" dir="ltr" value={forgotEmail} onChange={e=>{setForgotEmail(e.target.value);setForgotError("");}}/></Input>{forgotError&&<div className="nv-inline-error" role="alert" aria-live="polite">{forgotError}{forgotRequestId&&<small style={{display:"block",opacity:.75,marginTop:5}}>{t("loginErrorCode").replace("{id}",forgotRequestId)}</small>}<button type="button" disabled={busy} onClick={()=>void forgotPassword()}>{t("loginRetry")}</button></div>}<Button type="submit" disabled={busy}>{busy?(locale==="fa"?"در حال ارسال…":"Sending…"):t("forgotSend")}</Button></form>)}
    {step===1&&!forgotMode&&<form className="nv-step" onSubmit={loginMode?(e)=>{e.preventDefault();void login();}:handleSubmit(submitDetails)} noValidate>
     {!loginMode&&<div className="nv-two-col"><Input label={t("first")} error={errors.firstName?.message? t("required"):""}><input autoComplete="given-name" {...register("firstName")}/></Input><Input label={t("last")} error={errors.lastName?.message?t("required"):""}><input autoComplete="family-name" {...register("lastName")}/></Input></div>}
     <Input label={t("email")} error={emailAccountType==="password"?t("accountExists"):errors.email?.message?t("emailInvalid"):""}><input type="email" autoComplete="email" inputMode="email" dir="ltr" {...register("email")}/></Input>
     {!loginMode&&<CountrySelect value={values.country||""} onChange={v=>setValue("country",v,{shouldValidate:true})} locale={locale} label={t("country")} placeholder={t("chooseCountry")}/>}
     <Input label={t("password")} error={errors.password?.message?t("passwordShort"):""}><div className="nv-password"><input type={showPassword?"text":"password"} autoComplete={loginMode?"current-password":"new-password"} {...register("password")}/><button type="button" onClick={()=>setShowPassword(!showPassword)} aria-label={showPassword?t("hidePassword"):t("showPassword")}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></Input>
     {!loginMode&&<><div className="nv-strength"><span>{t("passwordHint")}</span><strong>{passwordStrengthText}</strong><i><b style={{width:`${strength*25}%`}}/></i></div><Input label={t("confirm")} error={touchedFields.confirmPassword&&values.password&&values.confirmPassword&&errors.confirmPassword?.message?t("passwordMismatch"):""}><div className="nv-password"><input type={showConfirm?"text":"password"} autoComplete="new-password" {...register("confirmPassword",{onBlur:()=>form.trigger("confirmPassword")})}/><button type="button" onClick={()=>setShowConfirm(!showConfirm)} aria-label={showConfirm?t("hidePassword"):t("showPassword")}>{showConfirm?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></Input></>}
     {loginMode&&<><button type="button" className="nv-skip" disabled={busy} onClick={()=>{setForgotEmail(values.email||"");setForgotError("");setForgotRequestId("");setForgotSuccess(false);setResendSeconds(0);setNotice("");setForgotMode(true);}}>{loginErrorKind==="reset"?(locale==="fa"?"بازیابی رمز عبور":"Reset password now"):t("forgotPassword")}</button>{notice&&<div className="nv-inline-error" role="alert" aria-live="polite">{notice}{loginRequestId&&loginErrorKind==="server"&&<small style={{display:"block",opacity:.75,marginTop:5}}>{t("loginErrorCode").replace("{id}",loginRequestId)}</small>}{loginErrorKind==="unverified"&&<button type="button" disabled={busy||resendSeconds>0} onClick={resendSignupCode}>{resendSeconds>0?`${t("resendCode")} (${resendSeconds}s)`:t("resendCode")}</button>}{(loginErrorKind==="network"||loginErrorKind==="server")&&<button type="button" disabled={busy||!values.password} onClick={()=>void login()}>{t("loginRetry")}</button>}{loginErrorKind==="rate"&&<small>{t("loginWaitSeconds").replace("{seconds}",String(resendSeconds))}</small>}</div>}</>}
     <Button type="submit" disabled={busy||(!loginMode&&captchaRequired&&!captchaToken)||(loginMode&&loginErrorKind==="rate"&&resendSeconds>0)}>{busy?(locale==="fa"?"در حال ورود…":"Logging in…"):loginMode?t("login"):t("continue")} <NextIcon size={17}/></Button>
     {loginMode&&<><button type="button" className="nv-google" onClick={()=>{window.location.href=API_BASE+"/auth/google/start?returnTo="+encodeURIComponent(window.location.pathname+window.location.search)}}><svg className="nv-google-mark" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11c-.5 2.5-2 4.6-4.2 6v5h6.8c4-3.7 6-9 6-14.7z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.8-5c-1.9 1.3-4.1 2-6.7 2-5.2 0-9.6-3.5-11.2-8.2H5.8v5.2C9.2 39.6 16 44 24 44z"/><path fill="#FBBC05" d="M12.8 28c-.4-1.2-.7-2.6-.7-4s.3-2.8.7-4v-5.2H5.8C4.4 17.5 3.5 20.6 3.5 24s.9 6.5 2.3 9.2l7-5.2z"/><path fill="#EA4335" d="M24 11.8c3 0 5.7 1 7.8 3.1l5.9-5.9C34.1 5.8 29.5 4 24 4 16 4 9.2 8.4 5.8 14.8l7 5.2c1.6-4.7 6-8.2 11.2-8.2z"/></svg>{t("google")}</button>{biometricLoginAvailable&&biometricSupported&&<button type="button" className="nv-skip" disabled={busy||!values.email.trim()} onClick={biometricLogin}>{t("biometricLogin")}</button>}<button type="button" className="nv-skip" disabled={busy} onClick={()=>{setLoginMode(false);setNotice("");setLoginErrorKind(null);setValue("password","");setStep(1);}}>{t("createAccount")}</button></>}
    </form>}
    {step===6&&<div className="nv-step"><p className="nv-muted">{t("resetPasswordTitle")}</p><Input label={t("password")}><input type="password" autoComplete="new-password" value={resetPassword} onChange={e=>setResetPassword(e.target.value)}/></Input><Input label={t("confirm")}><input type="password" autoComplete="new-password" value={resetConfirm} onChange={e=>setResetConfirm(e.target.value)}/></Input><Button disabled={busy} onClick={submitPasswordReset}>{busy?"…":t("resetPassword")}</Button></div>}
    {step===5&&<div className="nv-step"><p className="nv-muted">{t("verificationSent")}</p><Input label={t("verificationCode")}><input value={verificationCode} onChange={e=>setVerificationCode(e.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={6}/></Input><Button disabled={busy||verificationCode.length!==6} onClick={verifySignupCode}>{busy?"…":t("verifyCode")}</Button><button type="button" className="nv-skip" disabled={busy||resendSeconds>0} onClick={resendSignupCode}>{resendSeconds>0?`${t("resendCode")} (${new Intl.NumberFormat(locale).format(resendSeconds)}s)`:t("resendCode")}</button></div>}
    {step===2&&<div className="nv-step"><p className="nv-muted">{t("step2Title")}</p><div className="nv-lock-grid">{([{id:"none",icon:<ShieldCheck/>,label:t("noLock")},{id:"pin",icon:<LockKeyhole/>,label:t("pin")},{id:"pattern",icon:<Wallet/>,label:t("pattern")}] as const).map(item=><button type="button" key={item.id} className={lock===item.id?"selected":""} onClick={()=>{setLock(item.id);if(item.id==="none")setBiometricRegistration(null);setLockNotice("");setLockPhase("create");setPin("");setPinConfirm("");setPattern("");setPatternConfirm("");}}>{item.icon}<span>{item.label}</span></button>)}</div>{biometricSupported&&<label className="nv-biometric-toggle"><input type="checkbox" checked={!!biometricRegistration} disabled={lock==="none"} onChange={e=>e.target.checked?void setupBiometric():setBiometricRegistration(null)}/><Fingerprint size={18}/><span>{t("biometric")} / Face ID</span></label>}
     {lock==="pin"&&<><p className="nv-muted">{lockPhase==="create"?t("pinEnter"):t("pinConfirm")}</p><div className="nv-pin-progress" aria-live="polite">{Array.from({length:6},(_,i)=><span key={i} className={(lockPhase==="create"?pin:pinConfirm).length>i?"filled":""}/>)}</div><PinPad value={lockPhase==="create"?pin:pinConfirm} onChange={v=>lockPhase==="create"?setPin(v.slice(0,6)):setPinConfirm(v.slice(0,6))}/>{lockPhase==="create"?<Button variant="secondary" disabled={pin.length!==6} onClick={()=>{setPinConfirm("");setLockPhase("confirm");}}>{t("continue")}</Button>:<><Button variant="secondary" disabled={pinConfirm.length!==6} onClick={()=>{if(pin!==pinConfirm){setLockNotice(t("pinMismatch"));setPinConfirm("");return;}setLockNotice("");setStep(3);}}>{t("continue")}</Button><button type="button" className="nv-skip" onClick={()=>{setPinConfirm("");setLockPhase("create");}}>{t("back")}</button></>}</>}
     {lock==="pattern"&&<><p className="nv-muted">{lockPhase==="create"?t("patternDraw"):t("patternConfirm")}</p><PatternLock value={lockPhase==="create"?pattern:patternConfirm} onChange={v=>lockPhase==="create"?setPattern(v):setPatternConfirm(v)}/><Button variant="secondary" onClick={()=>setLockPhase(lockPhase==="create"?"confirm":"create")}>{lockPhase==="create"?t("continue"):t("back")}</Button></>}
     {lockNotice&&<div className="nv-inline-error" role="alert" aria-live="polite">{lockNotice}</div>}<Button onClick={()=>{if(lock==="pin"&&(pin.length<6||pin!==pinConfirm)){setLockNotice(pin!==pinConfirm?t("pinMismatch"):t("pinEnter"));return;}if(lock==="pattern"&&(pattern.split("-").length<4||pattern!==patternConfirm)){setLockNotice(pattern!==patternConfirm?t("patternMismatch"):t("patternDraw"));return;}setLockNotice("");setNotice("");setStep(3);}}>{t("continue")} <NextIcon size={17}/></Button><button className="nv-skip" onClick={()=>{setLock("none");setStep(3);}}>{t("skip")}</button></div>}
    {step===3&&<div className="nv-step"><div className="nv-mode-cards"><button type="button" className={mode==="personal"?"selected":""} onClick={()=>setMode("personal")}><Wallet size={25}/><strong>{t("personal")}</strong><span>{t("personalDesc")}</span></button><button type="button" className={mode==="business"?"selected":""} onClick={()=>setMode("business")}><BriefcaseBusiness size={25}/><strong>{t("business")}</strong><span>{t("businessDesc")}</span></button></div><p className="nv-switch-note">{t("switchNote")}</p>{mode==="business"&&<Input label={t("company")}><input value={company} onChange={e=>setCompany(e.target.value)} autoComplete="organization"/></Input>}<Input label={t("currency")}><select value={currency} disabled={!country} onChange={e=>setCurrency(e.target.value)}><option value="">{locale==="fa"?"ابتدا کشور را انتخاب کن":"Select a country first"}</option>{currencyList.map(code=><option key={code} value={code}>{code} — {localizedCurrency(code)}</option>)}</select></Input><Button disabled={busy||(captchaRequired&&!captchaToken)} onClick={finish}>{busy?"…":t("create")} <NextIcon size={17}/></Button></div>}
    {step===4&&<div className="nv-step nv-success"><div className="nv-success-check"><Check size={42}/></div><h3>{t("success")}</h3><p>{t("successSub")}</p><Button onClick={()=>onComplete(null,locale as any)}>{t("go")}</Button></div>}
    {!loginMode&&step>=1&&step<=3&&<div className="nv-turnstile-wrap" style={{display:"flex",justifyContent:"center",minHeight:66,margin:"12px 0"}}><div id="novyra-turnstile"/>{captchaLoadError&&<div className="nv-inline-error" role="alert">{locale==="fa"?"اتصال امنیتی برقرار نشد. دوباره تلاش کن.":"Security check could not load. Please try again."}<button type="button" onClick={()=>{setCaptchaToken("");setCaptchaLoadError(false);if(captchaWidget&&window.turnstile)window.turnstile.reset(captchaWidget);else{setCaptchaWidget(null);mountTurnstile();}}}>{locale==="fa"?"تلاش دوباره":"Try again"}</button></div>}</div>}

    
   </Card></div>
  <footer className="nv-footer">NOVYRA <span>•</span> {t("slogan")}</footer>
 </main>;
}
