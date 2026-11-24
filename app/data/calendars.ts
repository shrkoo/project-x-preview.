export type CalendarCode = "gregory"|"persian"|"islamic"|"hebrew"|"buddhist"|"chinese"|"japanese"|"indian"|"ethiopic"|"coptic";
export type CalendarOption = {code:CalendarCode;name:string;nativeName:string;intlCalendar:string};
export const calendars:CalendarOption[]=[
 {code:"gregory",name:"Gregorian",nativeName:"میلادی",intlCalendar:"gregory"},
 {code:"persian",name:"Persian (Jalali)",nativeName:"هجری شمسی",intlCalendar:"persian"},
 {code:"islamic",name:"Hijri (Islamic)",nativeName:"هجری قمری",intlCalendar:"islamic"},
 {code:"hebrew",name:"Hebrew",nativeName:"عبری",intlCalendar:"hebrew"},
 {code:"buddhist",name:"Buddhist",nativeName:"بودایی",intlCalendar:"buddhist"},
 {code:"chinese",name:"Chinese",nativeName:"چینی",intlCalendar:"chinese"},
 {code:"japanese",name:"Japanese",nativeName:"ژاپنی",intlCalendar:"japanese"},
 {code:"indian",name:"Indian National (Saka)",nativeName:"ملی هند (ساکا)",intlCalendar:"indian"},
 {code:"ethiopic",name:"Ethiopian",nativeName:"اتیوپیایی",intlCalendar:"ethiopic"},
 {code:"coptic",name:"Coptic",nativeName:"قبطی",intlCalendar:"coptic"}
];
export const calendarCodes=new Set<string>(calendars.map(item=>item.code));
export type CalendarDateParts={era?:string;year?:string;month?:string;day?:string;weekday?:string};
export function convertGregorianDate(date:Date|string|number,calendar:CalendarCode,locale="en-US"):CalendarDateParts{
 const value=date instanceof Date?date:new Date(date);
 if(Number.isNaN(value.getTime())) throw new RangeError("Invalid date");
 const formatter=new Intl.DateTimeFormat(locale+"-u-ca-"+calendar,{calendar,year:"numeric",month:"long",day:"numeric",weekday:"long",era:"short"});
 const parts=formatter.formatToParts(value);
 const result:CalendarDateParts={};
 for(const part of parts){if(part.type==="era")result.era=part.value;if(part.type==="year")result.year=part.value;if(part.type==="month")result.month=part.value;if(part.type==="day")result.day=part.value;if(part.type==="weekday")result.weekday=part.value;}
 return result;
}
export function formatCalendarDate(date:Date|string|number,calendar:CalendarCode,locale="en-US"):string{
 const value=date instanceof Date?date:new Date(date);
 if(Number.isNaN(value.getTime())) throw new RangeError("Invalid date");
 return new Intl.DateTimeFormat(locale,{calendar,year:"numeric",month:"long",day:"numeric"}).format(value);
}
