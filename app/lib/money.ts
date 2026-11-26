/** Money display/input helpers. Stored values remain exactly in the selected major unit. */
export type MoneyOptions = { hidden?: boolean };
export const MONEY_HIDDEN_TEXT = "••••";
const ZERO_DECIMAL = new Set(["IRR","IRT","TOMAN","BIF","CLP","DJF","GNF","ISK","JPY","KRW","PYG","RWF","UGX","VND","VUV","XAF","XOF","XPF"]);
const DIGITS: Record<string,string> = {"۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9","٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9"};
const codeOf=(currency:string)=>String(currency||"USD").toUpperCase();
export function currencyDigits(currency:string):number {
  const code=codeOf(currency);
  if(ZERO_DECIMAL.has(code))return 0;
  try{return new Intl.NumberFormat("en",{style:"currency",currency:code}).resolvedOptions().maximumFractionDigits ?? 2;}catch{return 2;}
}
export function formatMoney(amount:number,currency:string,locale:string,options:MoneyOptions={}):string {
  if(options.hidden)return MONEY_HIDDEN_TEXT;
  const value=Number(amount);
  if(!Number.isFinite(value))return "—";
  const code=codeOf(currency), digits=currencyDigits(code);
  if(code==="IRT"||code==="TOMAN") {
    const n=new Intl.NumberFormat(locale,{maximumFractionDigits:0,useGrouping:true}).format(value);
    return locale.startsWith("fa")?n+" تومان":n+" Toman";
  }
  if(code==="IRR"&&locale.startsWith("fa"))return new Intl.NumberFormat(locale,{maximumFractionDigits:0,useGrouping:true}).format(value)+" ریال";
  return new Intl.NumberFormat(locale,{style:"currency",currency:code,minimumFractionDigits:digits,maximumFractionDigits:digits}).format(value);
}
/** Parse user-entered major units; no currency conversion or scaling is performed. */
export function parseMoney(input:string,currency:string):number {
  const digits=currencyDigits(currency);
  let raw=String(input??"").replace(/[۰-۹٠-٩]/g,d=>DIGITS[d]||d).replace(/[\u00a0\u202f\s']/g,"").replace(/[٬،]/g,",");
  if(!raw||!/^[-+]?([0-9.,٫]+)$/.test(raw))throw new TypeError("Invalid money amount");
  raw=raw.replace(/٫/g,".");
  const comma=raw.lastIndexOf(","), dot=raw.lastIndexOf(".");
  let decimalAt=-1;
  if(digits>0&&comma>=0&&dot>=0)decimalAt=Math.max(comma,dot);
  else if(digits>0&&(comma>=0||dot>=0)){
    const at=Math.max(comma,dot), sep=raw[at], trailing=raw.length-at-1;
    const repeated=raw.split(sep).length>2;
    if(!repeated&&trailing>0&&trailing<=digits)decimalAt=at;
  }
  let whole=decimalAt>=0?raw.slice(0,decimalAt):raw;
  let fraction=decimalAt>=0?raw.slice(decimalAt+1):"";
  whole=whole.replace(/[.,]/g,"");fraction=fraction.replace(/[.,]/g,"");
  const negative=whole.startsWith("-")||raw.startsWith("-");
  whole=whole.replace(/^[-+]/,"");
  if(!whole)whole="0";
  if(!/^\d+$/.test(whole)||!/^\d*$/.test(fraction))throw new TypeError("Invalid money amount");
  if(digits===0&&fraction)throw new TypeError("This currency does not support decimal amounts");
  const normalized=whole+(fraction?"."+fraction:"");
  const value=Number(normalized)*(negative?-1:1);
  if(!Number.isFinite(value))throw new RangeError("Money amount is out of range");
  return value;
}
/** Backwards-compatible name; values are major units, not minor units. */
export const formatLegacyMoney = formatMoney;
export function formatMoneyInput(amount:number,locale:string):string {
  if(!Number.isFinite(amount))return "";
  return new Intl.NumberFormat(locale,{maximumFractionDigits:currencyDigits("USD"),useGrouping:true}).format(amount);
}
