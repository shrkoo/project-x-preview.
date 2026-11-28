const rawBase=String(process.env.PREVIEW_WORKER_URL||"");
const base=rawBase.endsWith("/")?rawBase.slice(0,-1):rawBase;
const token=String(process.env.PREVIEW_API_TOKEN||"");
const tokenB=String(process.env.PREVIEW_API_TOKEN_B||"");
if(!base||!token||!tokenB) throw new Error("PREVIEW_WORKER_URL, PREVIEW_API_TOKEN and PREVIEW_API_TOKEN_B are required");
const headers={"Content-Type":"application/json","Authorization":"Bearer "+token};
const headersB={"Content-Type":"application/json","Authorization":"Bearer "+tokenB};
async function requestWith(requestHeaders,path,method="GET",body) {
  const response=await fetch(base+path,{method,headers:requestHeaders,...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json().catch(()=>({}));
  return {status:response.status,data};
}
const request=(path,method="GET",body)=>requestWith(headers,path,method,body);
const workspaces=await request("/workspaces");
if(workspaces.status!==200) throw new Error("Could not read workspaces: "+JSON.stringify(workspaces.data));
let workspace=workspaces.data.workspaces?.find(item=>item.type==="personal");
if(!workspace) {
  const created=await request("/workspaces","POST",{type:"personal",name:"Personal transfer smoke",currency:"USD"});
  if(created.status!==201&&created.status!==200) throw new Error("Could not create personal workspace: "+JSON.stringify(created.data));
  workspace=created.data.workspace;
}
if(!workspace?.id) throw new Error("Personal workspace id missing");
const id=crypto.randomUUID();
const transfer={id,title:"Transfer smoke test",amount:123.45,kind:"transfer",category:"Transfer",date:"2026-11-27",note:"automated preview smoke",fromAccount:"Checking",toAccount:"Savings"};
const income={id:crypto.randomUUID(),title:"Account persistence smoke",amount:20,kind:"income",category:"Other",date:"2026-11-27",note:"account test",account:"Checking"};
const invalid=await request("/finance/transactions","PUT",{workspaceId:workspace.id,items:[{...transfer,id:crypto.randomUUID(),toAccount:"Checking"}]});
if(invalid.status!==400) throw new Error("Same-account transfer should be rejected, got "+invalid.status);
const saved=await request("/finance/transactions","PUT",{workspaceId:workspace.id,items:[transfer,income]});
if(saved.status!==200||saved.data.saved!==2) throw new Error("Transfer save failed: "+JSON.stringify(saved));
const listed=await request("/finance/transactions?workspaceId="+encodeURIComponent(workspace.id));
const found=listed.data.items?.find(item=>item.id===id);
const savedIncome=listed.data.items?.find(item=>item.id===income.id);
if(listed.status!==200||!found||found.kind!=="transfer"||found.fromAccount!=="Checking"||found.toAccount!=="Savings"||Number(found.amount)!==123.45||found.date!=="2026-11-27"||found.note!=="automated preview smoke"||savedIncome?.account!=="Checking") throw new Error("Transfer or account did not round-trip through D1: "+JSON.stringify(listed.data));

const accountId=crypto.randomUUID(),categoryId=crypto.randomUUID(),recurringId=crypto.randomUUID();
const accountSave=await request("/finance/accounts","PUT",{workspaceId:workspace.id,items:[{id:accountId,name:"Smoke Cash",currency:"USD"}]});
const categorySave=await request("/finance/categories","PUT",{workspaceId:workspace.id,items:[{id:categoryId,name:"Smoke Custom",kind:"both"}]});
const recurringSave=await request("/finance/recurring","PUT",{workspaceId:workspace.id,items:[{id:recurringId,title:"Smoke recurring",amount:10,kind:"expense",category:"Other",frequency:"monthly",createdAt:"2026-11-27",lastGenerated:"2026-11-27"}]});
if(accountSave.status!==200||categorySave.status!==200||recurringSave.status!==200) throw new Error("Finance collection save failed: "+JSON.stringify({accountSave,categorySave,recurringSave}));
const ownAccounts=await request("/finance/accounts?workspaceId="+encodeURIComponent(workspace.id));
const ownCategories=await request("/finance/categories?workspaceId="+encodeURIComponent(workspace.id));
const ownRecurring=await request("/finance/recurring?workspaceId="+encodeURIComponent(workspace.id));
if(!ownAccounts.data.items?.some(item=>item.id===accountId)||!ownCategories.data.items?.some(item=>item.id===categoryId)||!ownRecurring.data.items?.some(item=>item.id===recurringId)) throw new Error("Finance collection did not round-trip through D1.");
for(const resource of ["accounts","categories","recurring","transactions"]) {
  const denied=await requestWith(headersB,"/finance/"+resource+"?workspaceId="+encodeURIComponent(workspace.id));
  if(denied.status!==404) throw new Error("User B unexpectedly accessed user A "+resource+": "+JSON.stringify(denied));
}
const crossWrite=await requestWith(headersB,"/finance/accounts","PUT",{workspaceId:workspace.id,items:[{id:crypto.randomUUID(),name:"Intrusion",currency:"USD"}]});
if(crossWrite.status!==404) throw new Error("User B unexpectedly wrote to user A workspace: "+JSON.stringify(crossWrite));
const removed=await request("/finance/transactions/"+encodeURIComponent(id)+"?workspaceId="+encodeURIComponent(workspace.id),"DELETE");
if(removed.status!==200) throw new Error("Transfer delete/undo failed: "+JSON.stringify(removed.data));
const after=await request("/finance/transactions?workspaceId="+encodeURIComponent(workspace.id));
if(after.data.items?.some(item=>item.id===id)) throw new Error("Soft-deleted transfer is still in the active list");
const transactionTombstones=await request("/finance/transactions?workspaceId="+encodeURIComponent(workspace.id)+"&includeDeleted=1");
if(!transactionTombstones.data.items?.some(item=>item.id===id&&item.deletedAt)) throw new Error("Transfer soft-delete tombstone was not returned.");
for(const [resource,recordId] of [["accounts",accountId],["categories",categoryId],["recurring",recurringId]]) {
  const removed=await request("/finance/"+resource+"/"+encodeURIComponent(recordId)+"?workspaceId="+encodeURIComponent(workspace.id),"DELETE");
  if(removed.status!==200) throw new Error("Soft delete failed for "+resource+": "+JSON.stringify(removed));
  const active=await request("/finance/"+resource+"?workspaceId="+encodeURIComponent(workspace.id));
  const all=await request("/finance/"+resource+"?workspaceId="+encodeURIComponent(workspace.id)+"&includeDeleted=1");
  if(active.data.items?.some(item=>item.id===recordId)||!all.data.items?.some(item=>item.id===recordId&&item.deletedAt)) throw new Error("Soft-delete tombstone mismatch for "+resource);
}
console.log("PASS: finance collections are owner-isolated, upsertable, and soft-deletable; transactions and transfers expose tombstones.");
