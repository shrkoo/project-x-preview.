/**
 * Canonical money boundary.
 * Stored values are integer minor units: IRR uses rial, IRT-display uses rial
 * internally and toman only for presentation, USD uses cents, etc.
 */
export type MoneyOptions = { hidden?: boolean };
const HIDDEN = "••••";
const IRAN_CODES = new Set(["IRR", "IRT", "IRT-DISPLAY", "TOMAN"]);
const ZERO_DECIMAL = new Set(["BIF","CLP","DJF","GNF","ISK","JPY","KRW","PYG","RWF","UGX","VND","VUV","XAF","XOF","XPF"]);
const THREE_DECIMAL = new Set(["BHD","IQD","JOD","KWD","LYD","OMR","TND"]);
const DIGITS: Record<string,string> = {"۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9","٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9"};
const codeOf=(currency:string)=>String(currency||"USD").toUpperCase();
export function minorDigits(currency:string):number {
  const code=codeOf(currency);
  if(IRAN_CODES.has(code)||ZERO_DECIMAL.has(code))return 0;
  if(THREE_DECIMAL.has(code))return 3;
  try{return new Intl.NumberFormat("en",{style:"currency",currency:code}).resolvedOptions().maximumFractionDigits;}
  catch{return 2;}
}
function safeMinor(value:number):bigint {
  if(!Number.isSafeInteger(value))throw new RangeError("Money must be an integer in minor units");
  return BigInt(value);
}
function grouped(value:bigint,locale:string):string {
  return new Intl.NumberFormat(locale,{maximumFractionDigits:0,useGrouping:true}).format(value);
}
export function formatMoney(amountMinor:number,currency:string,locale:string,options:MoneyOptions={}):string {
  if(options.hidden)return HIDDEN;
  const code=codeOf(currency), amount=safeMinor(amountMinor);
  if(code==="IRT"||code==="IRT-DISPLAY"||code==="TOMAN") {
    const abs=amount<0n?-amount:amount, rounded=(abs+5n)/10n, toman=amount<0n?-rounded:rounded;
    return grouped(toman,locale)+(locale.startsWith("fa")?" تومان":" Toman");
  }
  if(code==="IRR"&&locale.startsWith("fa"))return grouped(amount,locale)+" ریال";
  const digits=minorDigits(code), negative=amount<0n, abs=negative?-amount:amount, scale=10n**BigInt(digits);
  const whole=abs/scale, fraction=abs%scale;
  const numeric=new Intl.NumberFormat(locale,{maximumFractionDigits:0,useGrouping:true}).format(whole);
  const fractional=digits?new Intl.NumberFormat(locale,{useGrouping:false,minimumIntegerDigits:digits,maximumFractionDigits:0}).format(fraction):"";
  const template=new Intl.NumberFormat(locale,{style:"currency",currency:code,minimumFractionDigits:digits,maximumFractionDigits:digits}).formatToParts(negative?-1:1);
  let numberInserted=false;
  return template.map(part=>{
    if(part.type==="integer"||part.type==="group"){if(numberInserted)return "";numberInserted=true;return numeric;}
    if(part.type==="fraction")return fractional;
    if(part.type==="decimal"&&digits===0)return "";
    if(part.type==="minusSign")return negative?part.value:"";
    return part.value;
  }).join("");
}
/** Parse a major-unit amount as typed by the user into integer minor units. */
export function parseMoney(input:string,currency:string):number {
  const code=codeOf(currency),digits=minorDigits(code);
  let raw=String(input??"").replace(/[۰-۹٠-٩]/g,d=>DIGITS[d]||d).replace(/[\u00a0\u202f\s']/g,"").replace(/[٬،]/g,"");
  if(!raw||!/^[-+]?([0-9.,٫]+)$/.test(raw))throw new TypeError("Invalid money amount");
  const decimalSeparators=[".", "٫", ","];
  const present=decimalSeparators.filter(sep=>raw.includes(sep));
  let decimalAt=-1, decimalSeparator="";
  if(digits>0&&present.length) {
    const candidate=present.length>1
      ? Math.max(...present.map(sep=>raw.lastIndexOf(sep)))
      : raw.lastIndexOf(present[0]);
    const sep=raw[candidate];
    const trailing=raw.length-candidate-1;
    const repeated=raw.indexOf(sep)!==candidate;
    const isDecimal=sep==="٫" || (present.length>1) || (!repeated&&(trailing<=digits||trailing>3));
    if(isDecimal){decimalAt=candidate;decimalSeparator=sep;}
  }
  let wholeText:string, fractionText="";
  if(decimalAt>=0){wholeText=raw.slice(0,decimalAt).replace(/[.,٫]/g,"");fractionText=raw.slice(decimalAt+1).replace(/[.,٫]/g,"");}
  else wholeText=raw.replace(/[.,٫]/g,"");
  const negative=wholeText.startsWith("-")||raw.startsWith("-");wholeText=wholeText.replace(/^[-+]/,"");
  if(!wholeText)wholeText="0";
  if(!/^\\d+$/.test(wholeText)||!/^\\d*$/.test(fractionText))throw new TypeError("Invalid money amount");
  const scale=10n**BigInt(digits);
  const kept=fractionText.padEnd(digits,"0").slice(0,digits);
  let minor=BigInt(wholeText)*scale+BigInt(kept||"0");
  if(fractionText.length>digits&&Number(fractionText[digits])>=5)minor+=1n;
  // Toman is only an input/display denomination; the stored base unit is Rial.
  if(code==="IRT"||code==="IRT-DISPLAY"||code==="TOMAN")minor*=10n;
  if(negative)minor=-minor;
  const result=Number(minor);
  if(!Number.isSafeInteger(result))throw new RangeError("Money amount exceeds the safe integer range");
  return result;
}
export const MONEY_HIDDEN_TEXT=HIDDEN;

/** Compatibility formatter for pre-schema records that still store display-unit numbers. */
export function formatLegacyMoney(amountMajor:number,currency:string,locale:string,options:MoneyOptions={}):string {
  if(options.hidden)return HIDDEN;
  if(!Number.isFinite(amountMajor))return formatMoney(0,currency,locale);
  const minor=parseMoney(String(amountMajor),currency);
  return formatMoney(minor,currency,locale,options);
}
/** Group a major-unit input without adding a currency symbol. */
export function formatMoneyInput(amountMajor:number,locale:string):string {
  if(!Number.isFinite(amountMajor))return "";
  return new Intl.NumberFormat(locale,{maximumFractionDigits:0,useGrouping:true}).format(amountMajor);
}
