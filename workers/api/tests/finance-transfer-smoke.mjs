const rawBase=String(process.env.PREVIEW_WORKER_URL||"");
const base=rawBase.endsWith("/")?rawBase.slice(0,-1):rawBase;
const token=String(process.env.PREVIEW_API_TOKEN||"");
if(!base||!token) throw new Error("PREVIEW_WORKER_URL and PREVIEW_API_TOKEN are required");
const headers={"Content-Type":"application/json","Authorization":"Bearer "+token};
async function request(path,method="GET",body) {
  const response=await fetch(base+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json().catch(()=>({}));
  return {status:response.status,data};
}
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
const removed=await request("/finance/transactions/"+encodeURIComponent(id)+"?workspaceId="+encodeURIComponent(workspace.id),"DELETE");
if(removed.status!==200) throw new Error("Transfer delete/undo failed: "+JSON.stringify(removed.data));
const after=await request("/finance/transactions?workspaceId="+encodeURIComponent(workspace.id));
if(after.data.items?.some(item=>item.id===id)) throw new Error("Deleted transfer still exists");
console.log("PASS: personal transfer rejected invalid accounts, saved to D1, read back, and deleted for undo.");
