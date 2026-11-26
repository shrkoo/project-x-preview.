export function mergeBusinessRecordPayload(previous,incoming) {
 const out={...previous};
 const arrayKeys=["invoices","payables","customers","suppliers","products","transactions","cheques","loans","team","activity","trash","bankImports"];
 for(const key of arrayKeys) {
  if(!Array.isArray(incoming[key])) continue;
  const merged=new Map();
  const rowKey=row=>row&&typeof row==="object"&&row.id?String(row.id):"legacy:"+JSON.stringify(row);
  for(const row of Array.isArray(previous[key])?previous[key]:[]) merged.set(rowKey(row),row);
  for(const row of incoming[key]) merged.set(rowKey(row),row);
  out[key]=Array.from(merged.values());
 }
 if(incoming.settings&&typeof incoming.settings==="object"&&!Array.isArray(incoming.settings)) out.settings={...(previous.settings||{}),...incoming.settings};
 const trash=Array.isArray(out.trash)?out.trash:[];
 for(const item of trash) {
  const source=String(item?.source||""),id=String(item?.id||"");
  if(!source||!id||!arrayKeys.includes(source)||source==="trash") continue;
  if((Array.isArray(incoming[source])?incoming[source]:[]).some(row=>String(row?.id||"")===id)) {
   out.trash=out.trash.filter(row=>!(String(row?.source||"")===source&&String(row?.id||"")===id));
  }
 }
 for(const item of (out.trash||[])) {
  const source=String(item?.source||""),id=String(item?.id||"");
  if(source&&id&&arrayKeys.includes(source)&&source!=="trash") out[source]=(out[source]||[]).filter(row=>String(row?.id||"")!==id);
 }
 return out;
}
