import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {mergeBusinessRecordPayload} from "../workers/api/business-sync.js";

const multiDevice=mergeBusinessRecordPayload(
 {invoices:[{id:"inv-1",amount:100}],customers:["legacy customer"],settings:{currency:"USD",tax:"5"}},
 {invoices:[{id:"inv-2",amount:200}],customers:[{id:"cus-1",name:"A"}],settings:{tax:"9"}}
);
assert.deepEqual(new Set(multiDevice.invoices.map(x=>x.id)),new Set(["inv-1","inv-2"]));
assert(multiDevice.customers.includes("legacy customer"));
assert(multiDevice.customers.some(x=>x.id==="cus-1"));
assert.equal(multiDevice.settings.currency,"USD");
assert.equal(multiDevice.settings.tax,"9");

const update=mergeBusinessRecordPayload(
 {products:[{id:"p-1",name:"Old",stock:1}]},
 {products:[{id:"p-1",name:"Updated",stock:8}]}
);
assert.equal(update.products.length,1);
assert.equal(update.products[0].stock,8);

const deleted=mergeBusinessRecordPayload(
 {products:[{id:"p-1",name:"Item"},{id:"p-2",name:"Keep"}],trash:[]},
 {products:[{id:"p-2",name:"Keep"}],trash:[{id:"p-1",source:"products"}]}
);
assert.deepEqual(deleted.products.map(x=>x.id),["p-2"]);

const restored=mergeBusinessRecordPayload(
 {products:[],trash:[{id:"p-1",source:"products"}]},
 {products:[{id:"p-1",name:"Restored"}],trash:[]}
);
assert.equal(restored.products[0].name,"Restored");
assert.equal(restored.trash.length,0);

const worker=await readFile(new URL("../workers/api/index.js",import.meta.url),"utf8");
const migration=await readFile(new URL("../workers/api/migrations-preview/0004_business_collaboration_ledger_reminders.sql",import.meta.url),"utf8");
const workerConfig=await readFile(new URL("../workers/api/wrangler.preview.toml",import.meta.url),"utf8");
for(const route of ["/business/team","/business/team/invitations","/business/team/accept","/business/journal","/business/audit","/business/reminders"]) assert(worker.includes(route),`Missing server route: ${route}`);
for(const table of ["workspace_members","business_invitations","business_audit_log","business_journal_entries","business_journal_lines","business_reminders","business_record_versions"]) assert(migration.includes(`CREATE TABLE IF NOT EXISTS ${table}`),`Missing preview schema: ${table}`);
assert(worker.includes("deliverBusinessReminders(env,env.DB)"),"Scheduled reminder handler missing");
assert(worker.includes("INSERT OR IGNORE INTO notifications"),"Scheduled in-app reminder notifications missing");
assert(worker.includes("emailSent,inviteUrl"),"Secure invitation link response missing");
assert(worker.includes('businessCan(access,"records:write")'),"Server-side role enforcement missing");
assert(workerConfig.includes('crons = ["*/15 * * * *"]'),"Preview reminder cron is missing");
console.log("Business preview schema, permissions, reminders and multi-device merge checks passed.");
