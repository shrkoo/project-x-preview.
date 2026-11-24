export type NumberSystemCode="latn"|"arab"|"arabext"|"deva"|"beng"|"gujr"|"guru"|"orya"|"tamldec"|"telu"|"knda"|"mlym"|"thai"|"laoo"|"mymr"|"khmr";
export type NumberSystemOption={code:NumberSystemCode;name:string;nativeName:string;locale:string;digits:string};
export const numberSystems:NumberSystemOption[]=[
 {code:"latn",name:"Latin",nativeName:"لاتین",locale:"en-u-nu-latn",digits:"0123456789"},
 {code:"arab",name:"Arabic-Indic",nativeName:"عربی",locale:"ar-u-nu-arab",digits:"٠١٢٣٤٥٦٧٨٩"},
 {code:"arabext",name:"Persian",nativeName:"فارسی",locale:"fa-u-nu-arabext",digits:"۰۱۲۳۴۵۶۷۸۹"},
 {code:"deva",name:"Devanagari",nativeName:"देवनागरी",locale:"hi-u-nu-deva",digits:"०१२३४५६७८९"},
 {code:"beng",name:"Bengali",nativeName:"বাংলা",locale:"bn-u-nu-beng",digits:"০১২৩৪৫৬৭৮৯"},
 {code:"gujr",name:"Gujarati",nativeName:"ગુજરાતી",locale:"gu-u-nu-gujr",digits:"૦૧૨૩૪૫૬૭૮૯"},
 {code:"guru",name:"Gurmukhi",nativeName:"ਗੁਰਮੁਖੀ",locale:"pa-u-nu-guru",digits:"੦੧੨੩੪੫੬੭੮੯"},
 {code:"orya",name:"Odia",nativeName:"ଓଡ଼ିଆ",locale:"or-u-nu-orya",digits:"୦୧୨୩୪୫୬୭୮୯"},
 {code:"tamldec",name:"Tamil",nativeName:"தமிழ்",locale:"ta-u-nu-tamldec",digits:"௦௧௨௩௪௫௬௭௮௯"},
 {code:"telu",name:"Telugu",nativeName:"తెలుగు",locale:"te-u-nu-telu",digits:"౦౧౨౩౪౫౬౭౮౯"},
 {code:"knda",name:"Kannada",nativeName:"ಕನ್ನಡ",locale:"kn-u-nu-knda",digits:"೦೧೨೩೪೫೬೭೮೯"},
 {code:"mlym",name:"Malayalam",nativeName:"മലയാളം",locale:"ml-u-nu-mlym",digits:"൦൧൨൩൪൫൬൭൮൯"},
 {code:"thai",name:"Thai",nativeName:"ไทย",locale:"th-u-nu-thai",digits:"๐๑๒๓๔๕๖๗๘๙"},
 {code:"laoo",name:"Lao",nativeName:"ລາວ",locale:"lo-u-nu-laoo",digits:"໐໑໒໓໔໕໖໗໘໙"},
 {code:"mymr",name:"Myanmar",nativeName:"မြန်မာ",locale:"my-u-nu-mymr",digits:"၀၁၂၃၄၅၆၇၈၉"},
 {code:"khmr",name:"Khmer",nativeName:"ខ្មែរ",locale:"km-u-nu-khmr",digits:"០១២៣៤៥៦៧៨៩"}
];
export const numberSystemByCode=new Map(numberSystems.map(item=>[item.code,item]));
export function formatNumberSystem(value:number|bigint,system:NumberSystemCode,options:Intl.NumberFormatOptions={}):string{
 const item=numberSystemByCode.get(system);if(!item)throw new RangeError("Unknown numbering system");
 return new Intl.NumberFormat(item.locale,options).format(value);
}
export function localizeDigits(value:string,system:NumberSystemCode):string{
 const item=numberSystemByCode.get(system);if(!item)throw new RangeError("Unknown numbering system");
 const latin="0123456789";return value.replace(/[0-9]/g,d=>item.digits[latin.indexOf(d)]);
}
