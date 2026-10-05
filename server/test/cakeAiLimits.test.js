const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CakeAiLimits } = require('../src/services/cakeAiLimits');
const guest = { ip: '127.0.0.1', get: () => 'session' };
const customer = { ...guest, user: { _id: 'customer' } };
test('guest quota counts turns once while six editing calls can complete', async () => {
  let now = 1000000;
  const limits = new CakeAiLimits({ now: () => now });
  const id = await limits.begin(guest);
  for (let i=0;i<6;i++) { await limits.call(guest,id); await limits.finish(guest,id); }
  await assert.rejects(limits.call(guest,id), { code:'AI_ROUNDS_LIMIT' });
  await limits.finish(guest,id,true);
  for (let i=1;i<5;i++) { now+=61000; const next=await limits.begin(guest);await limits.finish(guest,next,true); }
  now+=61000;
  await assert.rejects(limits.begin(guest), { code:'AI_DAY_LIMIT' });
});
test('concurrency cannot be bypassed by ending an in-flight turn', async () => {
  const limits = new CakeAiLimits(); const id=await limits.begin(customer);
  await limits.call(customer,id);
  await assert.rejects(limits.call(customer,id), {code:'AI_BUSY_LIMIT'});
  await limits.finish(customer,id,true);
  await assert.rejects(limits.begin(customer), {code:'AI_BUSY_LIMIT'});
  await limits.finish(customer,id); await limits.finish(customer,id,true);
  assert.ok(await limits.begin(customer));
});
test('guest IP quota survives guest session changes and image quota is separate', async () => {
  let now=1000000;const limits=new CakeAiLimits({now:()=>now});
  for(let i=0;i<2;i++){const id=await limits.begin(guest);await limits.call(guest,id,true);await limits.finish(guest,id);await limits.finish(guest,id,true);now+=61000;}
  const id=await limits.begin(guest);
  await assert.rejects(limits.call(guest,id,true),{code:'AI_IMAGE_LIMIT'});
  await limits.call(guest,id);await limits.finish(guest,id);await limits.finish(guest,id,true);
  const next=await limits.begin({...guest,get:()=> 'changed'});
  await assert.rejects(limits.call(guest,next),{code:'AI_TURN_LIMIT'});
});
test('daily global budget is shared and production fails closed without Redis', async () => {
  const limits=new CakeAiLimits({dailyBudget:100});await limits.reserve(guest,60);
  await assert.rejects(limits.reserve(customer,41),{code:'AI_BUDGET_LIMIT'});
  await assert.rejects(new CakeAiLimits({production:true,redisUrl:''}).begin(guest),{code:'AI_LIMITS_UNAVAILABLE'});
});
test('customer rate limit allows five turns per minute and guest allows three', async () => {
  const limits=new CakeAiLimits();
  for(const [req,count] of [[guest,3],[customer,5]]) {
    for(let i=0;i<count;i++){const id=await limits.begin(req);await limits.finish(req,id,true);}
    await assert.rejects(limits.begin(req),{code:'AI_MINUTE_LIMIT'});
  }
});
test('customer daily quotas enforce fifty prompts and ten images, then reset at midnight', async () => {
  let now=Date.parse('2026-10-05T01:00:00Z');
  const limits=new CakeAiLimits({now:()=>now});
  for(let i=0;i<50;i++) {
    const id=await limits.begin(customer);
    if(i<10){await limits.call(customer,id,true);await limits.finish(customer,id);}
    if(i===10)await assert.rejects(limits.call(customer,id,true),{code:'AI_IMAGE_LIMIT'});
    await limits.finish(customer,id,true);now+=61000;
  }
  await assert.rejects(limits.begin(customer),{code:'AI_DAY_LIMIT'});
  now=Date.parse('2026-10-05T16:00:00Z');
  const id=await limits.begin(customer);await limits.call(customer,id,true);
});
test('a guest session cannot reset quotas by changing IP addresses', async () => {
  const limits=new CakeAiLimits();
  for(let i=0;i<3;i++){const req={...guest,ip:`network-${i}`};const id=await limits.begin(req);await limits.finish(req,id,true);}
  await assert.rejects(limits.begin({...guest,ip:'new-network'}),{code:'AI_MINUTE_LIMIT'});
});
