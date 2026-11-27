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
  },{language:scenario.language,direction:scenario.direction});
  await page.route("**/*",async route=>{
   const url=new URL(route.request().url());
   if(!url.hostname.includes("projectx-novyratam.workers.dev"))return route.continue();
   const path=url.pathname;
   if(path==="/auth/me")return route.fulfill({json:{user:{id:"tx-e2e-user",email:"tx-e2e@example.test",displayName:"Preview Test",profile:{accountType:"personal",appLockType:"none"}}}});
   if(path==="/workspaces")return route.fulfill({json:{workspaces:[{id:"tx-e2e-workspace",type:"personal",name:"Personal",currency:"IRT"}]}});
   if(path==="/finance/transactions"&&route.request().method()==="GET")return route.fulfill({json:{items:[]}});
   if(path==="/finance/transactions"&&route.request().method()==="PUT")return route.fulfill({json:{ok:true}});
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
  const amount=sheet.locator("#nv-tx-amount");
  await amount.fill("1250000");
  if(scenario.language==="fa")await expect(amount).toHaveValue(/۱/);
  await sheet.locator(".nv-tx-field input").first().fill("E2E expense");
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
  await expect(page.locator("nav.nv-ref-dock")).toBeVisible();

  await page.getByRole("button",{name:scenario.language==="en"?"AI assistant":"دستیار هوشمند"}).click();
  await page.getByRole("button",{name:scenario.language==="en"?/^Income$/:/^درآمد$/}).click();
  const incomeSheet=page.getByRole("dialog",{name:/New income|درآمد جدید/});
  await expect(incomeSheet).toBeVisible();
  await incomeSheet.locator("#nv-tx-amount").fill("5000000");
  await incomeSheet.locator(".nv-tx-field input").first().fill("E2E income");
  await incomeSheet.locator(".nv-tx-save").click();
  await expect(page.getByText("E2E income")).toBeVisible();
  await page.locator(".nv-p-section-head button").first().click();
  await expect(page.getByText("E2E expense")).toBeVisible();
  await expect(page.getByText("E2E income")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir",scenario.direction);
 });
}
