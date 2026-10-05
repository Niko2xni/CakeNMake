# AI usage limits

Customers have 5 prompts per minute and 50 per Philippine calendar day. Guests have 3 per minute and 5 per day. Reference analysis has a separate daily quota: 10 for signed-in accounts, 2 for guests.

The client starts a server-issued turn and closes it when finished. Up to six editing calls and one image analysis can run within that turn. Only one turn per account or guest IP can be active; concurrent calls within a turn are also blocked. Abandoned turns expire after ten minutes. Guest turns are bound to a persistent browser session ID, while quotas and concurrency are enforced against both session and IP, so changing session IDs does not reset limits. People sharing a network also share guest quotas. Signed-in requests send a Firebase token; invalid tokens and inactive or restricted accounts cannot use signed-in access.

Set `REDIS_URL` on the backend for shared atomic limits across instances and restarts. Production fails closed if Redis is missing or unavailable. Development without Redis uses process-local memory only. All Redis limiter keys use a common hash tag for compatibility with clustered Redis.

Set `AI_DAILY_TOKEN_BUDGET` to the project's conservative daily token allowance (default 1,000,000). Each editing provider call reserves the serialized prompt/history/schema character count plus 1,024 output tokens. Image analysis reserves 4,096 units. Reservations remain charged after failures and provider-call counts are stored with the budget. This is a conservative usage allowance, **not measured token billing or a dollar spending guarantee**; image accounting and reasoning costs vary by model. Configure a provider spending cap as well. Limits reset at midnight Philippine time; minute limits use a rolling window from the first accepted turn.

Quota failures return HTTP 429, a `Retry-After` header, and a customer-facing explanation. Missing Redis returns 503. Manual editing remains accessible. Obvious local replies and malformed requests do not contact a model. An accepted turn consumes prompt quota even if a provider subsequently fails.

Deploy backend and client together because provider calls now require a server-issued turn ID. Restart the backend after configuring Redis or the budget. Tests cover quota, concurrency, session binding, budget, and development fallback; a production Redis integration check is still needed in the deployment environment.
