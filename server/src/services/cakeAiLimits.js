const { randomUUID, createHash } = require('node:crypto');
const Redis = require('ioredis');
const failure = (code, message, retryAfter = 60, status = 429) => Object.assign(new Error(message), { code, status, retryAfter });
const DAY = 86400000;
class CakeAiLimits {
  constructor({ redisUrl = process.env.REDIS_URL, production = process.env.NODE_ENV === 'production', now = Date.now, dailyBudget = Number(process.env.AI_DAILY_TOKEN_BUDGET || 1000000) } = {}) {
    this.now = now; this.budget = dailyBudget; this.production = production; this.memory = new Map();
    this.redis = redisUrl
      ? new Redis(redisUrl, {
          lazyConnect: true,
          enableOfflineQueue: true,
          maxRetriesPerRequest: 3,
          keepAlive: 15000,
          retryStrategy: (times) => Math.min(times * 100, 2000),
          reconnectOnError: (err) => [/READONLY/, /ETIMEDOUT/, /ECONNRESET/, /ECONNREFUSED/].some((pattern) => pattern.test(err.message)),
        })
      : null;
    this.redis?.on('error', () => {});
  }
  async ensureConnected() {
    if (!this.redis) return;
    const { status } = this.redis;
    if (status === 'wait') {
      await this.redis.connect();
    } else if (status === 'close' || status === 'end') {
      try {
        await this.redis.connect();
      } catch (_) {}
    }
  }
  async atomic(key, operation, args) {
    const keys = Array.isArray(key) ? key : [key];
    const script = `local a = cjson.decode(ARGV[1]); local now = a.now; local result = {}; local states = {}
for i, key in ipairs(KEYS) do
 local state = cjson.decode(redis.call('GET', key) or '{}')
${operation}
 if result.error then return cjson.encode(result) end
 states[i] = state
end
for i, key in ipairs(KEYS) do redis.call('SET', key, cjson.encode(states[i]), 'PX', 86400000) end
return cjson.encode(result)`;
    try {
      if (this.redis) {
        await this.ensureConnected();
        return JSON.parse(await this.redis.eval(script, keys.length, ...keys, JSON.stringify({ ...args, now: this.now() })));
      }
      if (this.production) throw new Error('Redis required');
      const before = keys.map(key => this.memory.has(key) ? { ...this.memory.get(key) } : null);
      let result;
      for (const key of keys) {
        result = this.memoryOperation(key, args);
        if (result.error) {
          keys.forEach((key, index) => before[index] ? this.memory.set(key, before[index]) : this.memory.delete(key));
          break;
        }
      }
      return result;
    } catch { throw failure('AI_LIMITS_UNAVAILABLE', 'AI is temporarily unavailable. You can still edit your cake manually.', 60, 503); }
  }
  memoryOperation(key, a) {
    const now = this.now(); const s = this.memory.get(key) || {}; let r;
    if (a.action === 'begin') {
      if (s.until > now) r = { error: 'busy', retry: Math.ceil((s.until-now)/1000) };
      else if (s.minuteUntil > now && s.minute >= a.minute) r = { error: 'minute', retry: Math.ceil((s.minuteUntil-now)/1000) };
      else if (s.day === a.day && s.turns >= a.daily) r = { error: 'day', retry: a.retry };
      else { if (s.day !== a.day) { s.day=a.day; s.turns=0; s.images=0; } if (!(s.minuteUntil > now)) { s.minute=0; s.minuteUntil=now+60000; } s.minute++; s.turns++; s.id=a.id; s.session=a.session; s.until=now+600000; s.rounds=0; s.busy=false; s.image=false; r={ id:a.id }; }
    } else if (a.action === 'call') {
      if (s.id !== a.id || s.session !== a.session || !(s.until > now)) r={error:'turn'};
      else if (s.busy) r={error:'busy',retry:60};
      else if (a.image && (s.image || s.images >= a.images)) r={error:'image',retry:a.retry};
      else if (!a.image && s.rounds >= 6) r={error:'rounds'};
      else { s.busy=true; if (a.image) {s.image=true; s.images++;} else s.rounds++; r={ok:true}; }
    } else if (a.action === 'release') { if (s.id === a.id && s.session === a.session) s.busy=false; r={ok:true}; }
    else if (a.action === 'end') { if (s.id === a.id && s.session === a.session && !s.busy) { s.until=0; } r={ok:true}; }
    else if (a.action === 'budget') { if (s.day !== a.day) {s.day=a.day;s.tokens=0;s.calls=0;} if (s.tokens+a.tokens > a.limit) r={error:'budget',retry:a.retry}; else {s.tokens+=a.tokens;s.calls++;r={ok:true};} }
    this.memory.set(key,s); return r;
  }
  identity(req) {
    const hash = value => createHash('sha256').update(value).digest('hex');
    const prefix = 'cakenmake:ai:{limits}:';
    if (req.user) return [prefix + hash(`user:${req.user._id}`)];
    return [prefix + hash(`guest-ip:${req.ip}`), prefix + hash(`guest-session:${req.get?.('x-ai-guest-session') || ''}`)];
  }
  args(req, action, extra={}) {
    const now=this.now(); const day=Math.floor((now+28800000)/DAY); const retry=Math.ceil(((day+1)*DAY-28800000-now)/1000);
    return {action,day,retry,session:req.user ? '' : (req.get?.('x-ai-guest-session') || ''),minute:req.user?5:3,daily:req.user?50:5,images:req.user?10:2,...extra};
  }
  check(r) {
    if (!r.error) return r;
    const messages={busy:'Another AI request is active. Please wait before trying again.',minute:'You have reached the AI limit for this minute. Please try again shortly.',day:'Your daily AI prompt limit has been reached. Try again after midnight Philippine time.',image:'Your reference image limit has been reached. Try again after midnight Philippine time.',turn:'This AI turn expired. Please send a new request.',rounds:'This request reached its editing limit. Send another prompt to continue.',budget:'The project’s daily AI budget has been reached. Try again after midnight Philippine time.'};
    throw failure(`AI_${r.error.toUpperCase()}_LIMIT`,messages[r.error],r.retry||60);
  }
  async begin(req) {
    const a=this.args(req,'begin',{id:randomUUID()});
    const r=await this.atomic(this.identity(req), `
if (state.untilAt or 0) > now then result={error='busy',retry=math.ceil((state.untilAt-now)/1000)}
elseif (state.minuteUntil or 0)>now and (state.minute or 0)>=a.minute then result={error='minute',retry=math.ceil((state.minuteUntil-now)/1000)}
elseif state.day==a.day and (state.turns or 0)>=a.daily then result={error='day',retry=a.retry}
else
 if state.day~=a.day then state.day=a.day;state.turns=0;state.images=0 end
 if (state.minuteUntil or 0)<=now then state.minute=0;state.minuteUntil=now+60000 end
 state.minute=(state.minute or 0)+1;state.turns=(state.turns or 0)+1;state.id=a.id;state.session=a.session;state.untilAt=now+600000;state.rounds=0;state.busy=false;state.image=false;result={id=a.id}
end`,a); return this.check(r).id;
  }
  async call(req, id, image=false) {
    const a=this.args(req,'call',{id,image});
    this.check(await this.atomic(this.identity(req), `
if state.id~=a.id or state.session~=a.session or (state.untilAt or 0)<=now then result={error='turn'}
elseif state.busy then result={error='busy',retry=60}
elseif a.image and (state.image or (state.images or 0)>=a.images) then result={error='image',retry=a.retry}
elseif not a.image and (state.rounds or 0)>=6 then result={error='rounds'}
else state.busy=true;if a.image then state.image=true;state.images=(state.images or 0)+1 else state.rounds=(state.rounds or 0)+1 end;result={ok=true} end`,a));
  }
  async finish(req,id,end=false) {
    const a=this.args(req,end?'end':'release',{id});
    return this.atomic(this.identity(req), `if state.id==a.id and state.session==a.session then if a.action=='end' then if not state.busy then state.untilAt=0 end else state.busy=false end end;result={ok=true}`,a);
  }
  async reserve(req,tokens) {
    const a=this.args(req,'budget',{tokens,limit:this.budget});
    if (!Number.isFinite(a.limit)||a.limit<=0) throw failure('AI_LIMITS_UNAVAILABLE','AI budget is not configured correctly.',60,503);
    this.check(await this.atomic('cakenmake:ai:{limits}:budget', `if state.day~=a.day then state.day=a.day;state.tokens=0;state.calls=0 end
if (state.tokens or 0)+a.tokens>a.limit then result={error='budget',retry=a.retry} else state.tokens=(state.tokens or 0)+a.tokens;state.calls=(state.calls or 0)+1;result={ok=true} end`,a));
  }
}
module.exports={CakeAiLimits,limits:new CakeAiLimits()};
