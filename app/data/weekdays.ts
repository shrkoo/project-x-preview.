export type WeekStartCode="saturday"|"sunday"|"monday";
export const weekdays:{code:WeekStartCode;name:string;nativeName:string;isoDay:number}[]=[
 {code:"saturday",name:"Saturday",nativeName:"شنبه",isoDay:6},
 {code:"sunday",name:"Sunday",nativeName:"یکشنبه",isoDay:7},
 {code:"monday",name:"Monday",nativeName:"دوشنبه",isoDay:1}
];
export const weekStartCodes=new Set<string>(weekdays.map(item=>item.code));
