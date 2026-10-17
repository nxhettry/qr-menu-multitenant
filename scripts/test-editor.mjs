import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { parsePrice, priceInputValue, editorMutation } from "../src/lib/editor/schemas.ts";
import { prepareImage, MAX_IMAGE_BYTES } from "../src/lib/cloudinary/prepare-image.ts";
import sharp from "sharp";

test("currency input converts decimal rupees to integer paisa without rounding", () => {
  for (const [value, expected] of [["180",18000],["180.05",18005],["0.01",1],["0",0],["10000000.00",1000000000]]) assert.equal(parsePrice(value),expected);
  for (const value of ["-1","1.005","1e3","1,000","Infinity","","10000000.01"]) assert.throws(()=>parsePrice(value));
  assert.equal(priceInputValue(18005),"180.05");
  assert.equal(editorMutation.safeParse({operation:"reorder",payload:{kind:"category",ids:[randomUUID(),"invalid"]}}).success,false);
});

test("image processing validates bytes, bounds dimensions and strips embedded metadata", async () => {
  const original = await sharp({ create:{width:2000,height:1000,channels:3,background:"red"} }).jpeg().withMetadata().toBuffer();
  const output = await prepareImage(original,"image/jpeg");
  const metadata = await sharp(output.bytes).metadata();
  assert.equal(metadata.format,"webp");
  assert.equal(metadata.width,1600);
  assert.equal(metadata.height,800);
  assert.equal(metadata.exif,undefined);
  await assert.rejects(prepareImage(original,"image/png"));
  await assert.rejects(prepareImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>'),"image/svg+xml"));
  await assert.rejects(prepareImage(Buffer.alloc(MAX_IMAGE_BYTES+1),"image/jpeg"));
  await assert.rejects(prepareImage(Buffer.from("not an image"),"image/jpeg"));
});

test("owner editor transactions, publication, roles and asset isolation", async t => {
  const db = new PGlite();
  t.after(()=>db.close());
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated;`);
  for (const file of ["202610160001_foundation.sql","202610160002_owner_editor.sql","202610160003_featured_menu.sql","202610170001_bulk_menu.sql"]) await db.exec(await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),"utf8"));
  const ownerA=randomUUID(), ownerB=randomUUID(), editor=randomUUID();
  for (const id of [ownerA,ownerB,editor]) await db.query("insert into auth.users values($1,now())",[id]);
  async function asUser(id,fn) {
    await db.exec(`set role ${id?"authenticated":"anon"}`);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id??""]);
    try {return await fn();} finally {await db.exec("reset role");await db.query("select set_config('request.jwt.claim.sub',$1,false)",[""]);}
  }
  async function scalar(sql,args=[]) {return Object.values((await db.query(sql,args)).rows[0])[0];}
  const tenantA=await asUser(ownerA,()=>scalar("select public.create_restaurant('Kitchen A','editor-alpha')"));
  const tenantB=await asUser(ownerB,()=>scalar("select public.create_restaurant('Kitchen B','editor-beta')"));
  await db.query("insert into public.memberships values($1,$2,'EDITOR',now())",[editor,tenantA]);
  const mutate=(user,tenant,operation,payload)=>asUser(user,()=>scalar("select public.mutate_menu($1,$2,$3::jsonb)",[tenant,operation,JSON.stringify(payload)]));
  const category=(name,id)=>({id,name,name_ne:null,is_visible:true});
  const catA=(await mutate(ownerA,tenantA,"saveCategory",category("Momo"))).id;
  const catB=(await mutate(ownerB,tenantB,"saveCategory",category("Lunch"))).id;
  const input=(parent,id)=>({id,category_id:parent,name:"Momo",name_ne:"म:म:",description:null,description_ne:null,price_minor:18005,is_available:true,diet:"VEG",spice_level:1,confirm_prices:false,variants:[]});
  const itemA=(await mutate(ownerA,tenantA,"saveItem",input(catA))).id;
  const itemB=(await mutate(ownerB,tenantB,"saveItem",input(catB))).id;
  const denied=error=>error.code==="42501";
  const missing=error=>error.code==="P0002";
  const invalid=error=>error.code==="23514";

  await t.test("anonymous callers cannot read private snapshots or mutate menus",async()=>{
    await asUser(null,()=>assert.rejects(db.query("select public.get_editor_menu($1)",[tenantA]),denied));
    await assert.rejects(mutate(null,tenantA,"saveCategory",category("Bad")),denied);
  });
  await t.test("every editor operation rejects another tenant's IDs",async()=>{
    assert.equal(await asUser(ownerA,()=>scalar("select public.get_editor_menu($1)",[tenantB])),null);
    await assert.rejects(mutate(ownerA,tenantB,"settings",{}),missing);
    for (const [op,payload] of [
      ["saveCategory",category("Stolen",catB)],["saveItem",input(catA,itemB)],["saveItem",input(catB,itemA)],
      ["delete",{kind:"item",id:itemB}],["delete",{kind:"category",id:catB}],["availability",{id:itemB,available:false}],
      ["reserveUpload",{kind:"item",item_id:itemB}],["removeImage",{kind:"item",item_id:itemB}],
    ]) await assert.rejects(mutate(ownerA,tenantA,op,payload),missing,op);
    await assert.rejects(mutate(ownerA,tenantA,"reorder",{kind:"category",ids:[catB]}),invalid);
    await assert.rejects(mutate(ownerA,tenantA,"reorder",{kind:"item",category_id:catA,ids:[itemB]}),invalid);
  });
  await t.test("item and variant changes commit together; invalid variants roll back the entire save",async()=>{
    const variants=[{name:"Veg",name_ne:null,price_minor:15000,is_available:true},{name:"Buff",name_ne:null,price_minor:18000,is_available:false}];
    await mutate(ownerA,tenantA,"saveItem",{...input(catA,itemA),price_minor:null,variants});
    assert.equal(await scalar("select count(*)::int from public.menu_item_variants where item_id=$1",[itemA]),2);
    await assert.rejects(mutate(ownerA,tenantA,"saveItem",{...input(catA,itemA),name:"Should roll back",price_minor:null,variants:[{...variants[0],price_minor:-1}]}),invalid);
    assert.equal(await scalar("select name from public.menu_items where id=$1",[itemA]),"Momo");
    assert.equal(await scalar("select count(*)::int from public.menu_item_variants where item_id=$1",[itemA]),2);
    await mutate(ownerA,tenantA,"saveItem",input(catA,itemA));
    assert.equal(await scalar("select count(*)::int from public.menu_item_variants where item_id=$1",[itemA]),0);
  });
  await t.test("reorder batches require the full current tenant-scoped set",async()=>{
    const second=(await mutate(ownerA,tenantA,"saveCategory",category("Tea"))).id;
    await assert.rejects(mutate(ownerA,tenantA,"reorder",{kind:"category",ids:[catA]}),invalid);
    await assert.rejects(mutate(ownerA,tenantA,"reorder",{kind:"category",ids:[catA,catA]}),invalid);
    await mutate(ownerA,tenantA,"reorder",{kind:"category",ids:[second,catA]});
    assert.equal(await scalar("select sort_order from public.menu_categories where id=$1",[second]),0);
    const another=(await mutate(ownerA,tenantA,"saveItem",{...input(catA),name:"Tea"})).id;
    await mutate(ownerA,tenantA,"reorder",{kind:"item",category_id:catA,ids:[another,itemA]});
    assert.equal(await scalar("select sort_order from public.menu_items where id=$1",[another]),0);
  });
  await t.test("editors can edit menu content but cannot change settings, publish, or upload branding",async()=>{
    await mutate(editor,tenantA,"availability",{id:itemA,available:false});
    for (const [op,payload] of [["settings",{}],["visibility",{published:true}],["reserveUpload",{kind:"logo"}],["removeImage",{kind:"cover"}]]) await assert.rejects(mutate(editor,tenantA,op,payload),denied);
    await mutate(editor,tenantA,"reserveUpload",{kind:"item",item_id:itemA});
  });
  await t.test("specials are saved atomically, tenant scoped, bounded and projected only through visible categories", async () => {
    await mutate(ownerA,tenantA,"saveItem",{...input(catA,itemA),is_featured:true});
    assert.equal(await scalar("select is_featured from public.menu_items where id=$1",[itemA]),true);
    await assert.rejects(mutate(ownerA,tenantA,"saveItem",{...input(catA,itemB),is_featured:true}),missing);
    const extras=[];
    for(let i=0;i<5;i++)extras.push((await mutate(ownerA,tenantA,"saveItem",{...input(catA),name:`Special ${i}`,is_featured:true})).id);
    await assert.rejects(mutate(ownerA,tenantA,"saveItem",{...input(catA),name:"Seventh",is_featured:true}),invalid);
    assert.equal(await scalar("select count(*)::int from public.menu_items where restaurant_id=$1 and is_featured",[tenantA]),6);
    await db.query("update public.restaurants set status='PUBLISHED' where id=$1",[tenantA]);
    const menu=await asUser(null,()=>scalar("select public.get_public_menu('editor-alpha')"));
    assert.equal(menu.categories.flatMap(category=>category.items).filter(item=>item.isFeatured).length,6);
    await mutate(ownerA,tenantA,"saveCategory",{...category("Momo",catA),is_visible:false});
    assert.equal((await asUser(null,()=>scalar("select public.get_public_menu('editor-alpha')"))).categories.flatMap(category=>category.items).filter(item=>item.isFeatured).length,0);
    await mutate(ownerA,tenantA,"saveCategory",category("Momo",catA));
    for(const id of extras)await mutate(ownerA,tenantA,"delete",{kind:"item",id});
    await mutate(ownerA,tenantA,"saveItem",{...input(catA,itemA),is_featured:false});
    await db.query("update public.restaurants set status='DRAFT' where id=$1",[tenantA]);
  });
  await t.test("publication checks visible content and every example price atomically",async()=>{
    const empty=await asUser(ownerA,()=>scalar("select public.create_restaurant('Empty','empty-editor')"));
    await assert.rejects(mutate(ownerA,empty,"visibility",{published:true}),invalid);
    await db.query("update public.menu_items set is_example_price=true where id=$1",[itemA]);
    await assert.rejects(mutate(ownerA,tenantA,"visibility",{published:true}),invalid);
    await assert.rejects(mutate(ownerA,tenantA,"saveItem",input(catA,itemA)),invalid);
    await mutate(ownerA,tenantA,"saveItem",{...input(catA,itemA),confirm_prices:true});
    await mutate(ownerA,tenantA,"visibility",{published:true});
    assert.equal((await asUser(null,()=>scalar("select public.get_public_menu('editor-alpha')"))).status,"PUBLISHED");
    const firstPublished=await scalar("select published_at from public.restaurants where id=$1",[tenantA]);
    await mutate(ownerA,tenantA,"visibility",{published:false});
    assert.deepEqual(await asUser(null,()=>scalar("select public.get_public_menu('editor-alpha')")),{status:"UNAVAILABLE"});
    await mutate(ownerA,tenantA,"visibility",{published:true});
    assert.equal((await scalar("select published_at from public.restaurants where id=$1",[tenantA])).toISOString(),firstPublished.toISOString());
    await assert.rejects(db.query("update public.menu_items set is_example_price=true where id=$1",[itemA]),invalid);
  });
  await t.test("settings preserve QR codes and audit identity while reserving old addresses",async()=>{
    const code=await scalar("select short_code from public.restaurants where id=$1",[tenantA]);
    const settings={name:"Renamed",slug:"editor-renamed",name_ne:null,description:null,phone:null,address:null,map_url:null,theme_color:"#ffffff",opening_hours:{Monday:"09:00–21:00"},prices_include_vat:true,vat_percent:13,service_charge_percent:0,status:"SUSPENDED",actor_id:ownerB};
    const receipt=await mutate(ownerA,tenantA,"settings",settings);
    assert.equal(receipt.previousSlug,"editor-alpha");
    assert.equal(await scalar("select status from public.restaurants where id=$1",[tenantA]),"PUBLISHED");
    assert.equal(await asUser(null,()=>scalar("select public.resolve_menu_code($1)",[code])),"editor-renamed");
    assert.equal(await asUser(null,()=>scalar("select public.resolve_old_slug('editor-alpha')")),"editor-renamed");
    assert.equal(await scalar("select actor_id from public.audit_events where restaurant_id=$1 and action='menu.settings' order by created_at desc limit 1",[tenantA]),ownerA);
    await assert.rejects(mutate(ownerA,tenantA,"settings",{...settings,slug:"dashboard"}),invalid);
  });
  await t.test("asset reservations prevent cross-tenant attachment and enforce role and expiry",async()=>{
    const reserved=await mutate(ownerA,tenantA,"reserveUpload",{kind:"logo"});
    await assert.rejects(mutate(ownerB,tenantB,"attachImage",{upload_id:reserved.uploadId,version:123}),missing);
    await mutate(ownerA,tenantA,"attachImage",{upload_id:reserved.uploadId,version:123});
    assert.equal(await scalar("select logo_public_id from public.restaurants where id=$1",[tenantA]),reserved.publicId);
    await assert.rejects(mutate(ownerA,tenantA,"attachImage",{upload_id:reserved.uploadId,version:123}),missing);
    await assert.rejects(db.query("update public.menu_items set image_public_id=$1 where id=$2",[`qrmenu/${tenantB}/${randomUUID()}`,itemA]),invalid);
    const expired=await mutate(ownerA,tenantA,"reserveUpload",{kind:"item",item_id:itemA});
    await db.query("update private.menu_uploads set created_at=now()-interval '11 minutes' where id=$1",[expired.uploadId]);
    await assert.rejects(mutate(ownerA,tenantA,"attachImage",{upload_id:expired.uploadId,version:123}),missing);
    await mutate(ownerA,tenantA,"removeImage",{kind:"logo"});
    assert.equal(await scalar("select logo_public_id from public.restaurants where id=$1",[tenantA]),null);
  });
  await t.test("upload quotas are shared across all sessions for the restaurant",async()=>{
    const used=await scalar("select count(*)::int from private.menu_uploads where restaurant_id=$1",[tenantA]);
    for(let i=used;i<20;i++) await mutate(ownerA,tenantA,"reserveUpload",{kind:"item",item_id:itemA});
    await assert.rejects(mutate(editor,tenantA,"reserveUpload",{kind:"item",item_id:itemA}),invalid);
    await asUser(ownerA,()=>assert.rejects(db.query("select * from private.menu_uploads"),denied));
  });
  await t.test("soft deletion requires empty categories and removes content from the private snapshot",async()=>{
    await assert.rejects(mutate(ownerA,tenantA,"delete",{kind:"category",id:catA}),invalid);
    await mutate(ownerA,tenantA,"delete",{kind:"item",id:itemA});
    const snapshot=await asUser(ownerA,()=>scalar("select public.get_editor_menu($1)",[tenantA]));
    assert(!snapshot.categories.flatMap(category=>category.items).some(item=>item.id===itemA));
  });
  await t.test("suspension and editing locks block every mutation while leaving reads available",async()=>{
    for (const mode of ["lock","suspend"]) {
      if(mode==="lock") await db.query("update public.subscriptions set editing_locked_at=now()-interval '1 minute' where restaurant_id=$1",[tenantA]);
      else {await db.query("update public.subscriptions set editing_locked_at=null where restaurant_id=$1",[tenantA]);await db.query("update public.restaurants set status='SUSPENDED' where id=$1",[tenantA]);}
      for(const [op,payload] of [["saveCategory",category("Blocked")],["visibility",{published:false}],["reserveUpload",{kind:"logo"}],["availability",{id:itemA,available:true}]]) await assert.rejects(mutate(ownerA,tenantA,op,payload),denied);
      assert(await asUser(ownerA,()=>scalar("select public.get_editor_menu($1)",[tenantA])));
    }
  });
});
