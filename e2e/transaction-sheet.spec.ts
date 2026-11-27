import {test,expect} from "@playwright/test";

const cases=[
 {width:360,height:640,language:"fa",direction:"rtl"},
 {width:390,height:844,language:"fa",direction:"rtl"},
 {width:360,height:640,language:"en",direction:"ltr"},
 {width:390,height:844,language:"en",direction:"ltr"},
] as const;

for(const scenario of cases){
 test(`personal transaction sheet ${scenario.width}x${scenario.height} ${scenario.language}`,async({page})=>{
  await page.setViewportSize({width:scenario.width,height:scenario.height});
  await page.addInitScript(({language,direction})=>{
   localStorage.setItem("projectx-token","e2e-preview-token");
   localStorage.setItem("projectx-language",language);
   localStorage.setItem("novyra-text-direction",direction);
   localStorage.setItem("novyra-finance-currency","IRT");
   localStorage.setItem("novyra-preferences-v1",JSON.stringify({country:"IR",language,direction,currency:"IRT",calendar:language==="fa"?"persian":"gregory",dateFormat:"YYYY/MM/DD",numberSystem:language==="fa"?"arabext":"latn",digits:language==="fa"?"arabext":"latn",firstDay:"saturday"}));
   localStorage.removeItem("nv-tx-draft:IRT");
   localStorage.setItem("nv-personal-accounts:IRT",JSON.stringify(["Checking","Savings"]));
  },{language:scenario.language,direction:scenario.direction});
  let remoteItems:Array<any>=[];
  await page.route("**/*",async route=>{
   const request=route.request();
   const url=new URL(request.url());
   if(!url.hostname.includes("projectx-novyratam.workers.dev"))return route.continue();
   const path=url.pathname;
   if(path==="/auth/me")return route.fulfill({json:{user:{id:"tx-e2e-user",email:"tx-e2e@example.test",displayName:"Preview Test",profile:{accountType:"personal",appLockType:"none"}}}});
   if(path==="/workspaces")return route.fulfill({json:{workspaces:[{id:"tx-e2e-workspace",type:"personal",name:"Personal",currency:"IRT"}]}});
   if(path==="/finance/transactions"&&request.method()==="GET")return route.fulfill({json:{items:remoteItems}});
   if(path==="/finance/transactions"&&request.method()==="PUT"){
    const payload=request.postDataJSON();
    for(const item of payload.items||[]){const index=remoteItems.findIndex(row=>row.id===item.id);if(index>=0)remoteItems[index]=item;else remoteItems.push(item);}
    return route.fulfill({json:{ok:true,saved:(payload.items||[]).length}});
   }
   if(path.startsWith("/finance/transactions/")&&request.method()==="DELETE"){
    const id=decodeURIComponent(path.split("/").pop()||"");
    remoteItems=remoteItems.filter(item=>item.id!==id);
    return route.fulfill({json:{ok:true}});
   }
   return route.fulfill({json:{ok:true}});
  });
  await page.goto("/");
  await expect(page.locator(".nv-p-home")).toBeVisible({timeout:20000});
  const expense=page.getByRole("button",{name:scenario.language==="en"?/Add expense/:/ثبت هزینه/});
  await expense.click();
  const sheet=page.getByRole("dialog",{name:/New expense|هزینه جدید/});
  await expect(sheet).toBeVisible();
  await expect(page.locator("nav.nv-ref-dock")).toBeHidden();
  await expect(sheet.locator(".nv-tx-save")).toBeVisible();
  await sheet.locator(".nv-tx-date-chips button").nth(0).click();
  await expect(sheet.locator(".nv-tx-date-chips button").nth(0)).toHaveClass(/selected/);
  await sheet.locator(".nv-tx-date-chips button").nth(1).click();
  await expect(sheet.locator(".nv-tx-date-chips button").nth(1)).toHaveClass(/selected/);
  if(scenario.language==="fa"){await sheet.getByRole("button",{name:/انتخاب تاریخ/}).click();await expect(sheet.locator(".nv-tx-calendar")).toBeVisible();await sheet.locator(".nv-tx-calendar-grid:not(.nv-tx-weekdays) button:not(.outside):not(:disabled)").first().click();await expect(sheet.locator(".nv-tx-date-label")).toContainText(/۱۴۰[۰-۹]\/[۰-۹]{2}\/[۰-۹]{2}/);}
  const amount=sheet.locator("#nv-tx-amount");
  await amount.fill("1250000");
  if(scenario.language==="fa")await expect(amount).toHaveValue(/۱/);
  await sheet.locator(".nv-tx-field input").first().fill("E2E expense");
  await sheet.locator(".nv-tx-more-details summary").click();
  await sheet.locator(".nv-tx-note-toggle").click();
  await sheet.locator(".nv-tx-note").fill("saved note");
  const tagInput=sheet.locator(".nv-tx-tag-row input");
  await tagInput.fill("test-tag");
  await tagInput.press("Enter");
  await sheet.locator('.nv-tx-receipt input[type="file"]').setInputFiles({name:"receipt.png",mimeType:"image/png",buffer:Buffer.from("receipt")});
  await sheet.locator('.nv-tx-repeat-row input[type="checkbox"]').check();
  await amount.focus();
  await page.setViewportSize({width:scenario.width,height:Math.max(420,scenario.height-180)});
  const save=sheet.locator(".nv-tx-save");
  await expect(save).toBeVisible();
  const box=await save.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y+box!.height).toBeLessThanOrEqual(Math.max(420,scenario.height-180)+2);
  const dimensions=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport);
  await save.click();
  await expect(page.getByText("E2E expense")).toBeVisible();
  const expenseHomeRow=page.locator(".nv-p-tx").filter({hasText:"E2E expense"});
  await expect(expenseHomeRow).toContainText(scenario.language==="fa"?"۱٬۲۵۰٬۰۰۰":"1,250,000");
  await expect.poll(()=>remoteItems.some(item=>item.title==="E2E expense"&&item.note.includes("saved note")&&item.note.includes("test-tag")&&item.note.includes("receipt.png"))).toBe(true);
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem("novyra-recurring:tx-e2e-user")||"[]").length)).toBe(1);
  await expect(page.locator("nav.nv-ref-dock")).toBeVisible();

  await page.locator("nav.nv-ref-dock button").nth(2).click();
  await page.getByRole("button",{name:scenario.language==="en"?/^Income$/:/^درآمد$/}).click();
  const incomeSheet=page.getByRole("dialog",{name:/New income|درآمد جدید/});
  await expect(incomeSheet).toBeVisible();
  await incomeSheet.locator("#nv-tx-amount").fill("5000000");
  await incomeSheet.locator(".nv-tx-field input").first().fill("E2E income");
  await incomeSheet.locator(".nv-tx-save").click();
  await expect(page.getByText("E2E income")).toBeVisible();
  const incomeHomeRow=page.locator(".nv-p-tx").filter({hasText:"E2E income"});
  await expect(incomeHomeRow).toContainText(scenario.language==="fa"?"۵٬۰۰۰٬۰۰۰":"5,000,000");
  await page.locator(".nv-p-section-head button").first().click();
  await expect(page.getByText("E2E expense")).toBeVisible();
  await expect(page.getByText("E2E income")).toBeVisible();
  await expect(page.locator(".nf-transaction").filter({hasText:"E2E expense"})).toContainText(scenario.language==="fa"?"۱٬۲۵۰٬۰۰۰":"1,250,000");
  await expect(page.locator(".nf-transaction").filter({hasText:"E2E income"})).toContainText(scenario.language==="fa"?"۵٬۰۰۰٬۰۰۰":"5,000,000");
  await page.locator("nav.nv-ref-dock button").nth(2).click();
  await page.getByRole("button",{name:scenario.language==="en"?/Expense/:/هزینه/}).click();
  const transferSheet=page.getByRole("dialog");
  await expect(transferSheet).toBeVisible();
  await transferSheet.getByRole("button",{name:scenario.language==="en"?/Transfer/:/انتقال وجه/}).click();
  await expect(transferSheet.getByText("برای انتقال، دو حساب لازم است")).toHaveCount(0);
  await transferSheet.locator("#nv-tx-amount").fill("250000");
  await transferSheet.locator(".nv-tx-transfer select").nth(0).selectOption("Checking");
  await transferSheet.locator(".nv-tx-transfer select").nth(1).selectOption("Savings");
  await transferSheet.locator(".nv-tx-save").click();
  await expect(page.locator(".nf-toast")).toBeVisible();
  const transferRow=page.locator(".nf-transaction").filter({hasText:"انتقال از Checking به Savings"});
  await expect(transferRow).toBeVisible();
  await expect.poll(()=>remoteItems.some(item=>item.kind==="transfer"&&item.fromAccount==="Checking"&&item.toAccount==="Savings")).toBe(true);
  await page.locator(".nf-toast button").first().click();
  await expect(transferRow).toHaveCount(0);
  await expect.poll(()=>remoteItems.some(item=>item.kind==="transfer")).toBe(false);

  await page.locator("nav.nv-ref-dock button").nth(2).click();
  await page.getByRole("button",{name:scenario.language==="en"?/Expense/:/هزینه/}).click();
  const smsSheet=page.getByRole("dialog");
  await smsSheet.getByRole("button",{name:/تکمیل از پیامک بانکی|Complete from bank SMS/}).click();
  await expect(page.locator(".nv-tx-sub-sheet")).toBeVisible();
  await page.locator(".nv-tx-sub-sheet textarea").fill("پیام نامعتبر");
  await page.locator(".nv-tx-sub-sheet .nv-tx-sms-button").click();
  await expect(page.getByRole("alert")).toContainText("پیامک");
  await page.locator(".nv-tx-sub-sheet textarea").fill("واریز مبلغ ۱٬۲۵۰٬۰۰۰ ریال");
  await page.locator(".nv-tx-sub-sheet .nv-tx-sms-button").click();
  await expect(page.locator("#nv-tx-amount")).toHaveValue(/۱٬۲۵۰٬۰۰۰|1,250,000/);
  await expect(smsSheet.getByRole("button",{name:/Income|درآمد/})).toHaveAttribute("aria-pressed","true");
  await expect(page.locator("html")).toHaveAttribute("dir",scenario.direction);
 });
}
