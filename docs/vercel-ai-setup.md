# Cake AI with Vercel AI Gateway

Create an AI Gateway API key in your Vercel team dashboard. This is an AI
Gateway key, not a Vercel deployment/access token. Your backend can run locally
or on another host; it does not need to be deployed to Vercel.

Add these entries to `server/.env`, preserving the other application settings:

```env
AI_PROVIDER=vercel
AI_GATEWAY_API_KEY=your_gateway_key
AI_GATEWAY_MODEL=alibaba/qwen3.8-omni-flash
```

Keep the key server-side. Never add it to a `VITE_` variable or commit it.
Restart the backend (`cd server`, then `npm run dev`). In the cake designer's
AI chat, try "Make the cake pink" and then "Make it sporty, but keep it pink".
Check both the rendered design and the reported changes.

No additional SDK is required. The adapter calls Vercel's Chat Completions
endpoint using native fetch and the existing cake tool protocol. Prompt
validation applies before the provider is called. Each completed user message
can make multiple billable requests as the tool loop continues.

Select a tool-capable model with its exact Vercel model ID. Free-credit model
eligibility and rate limits can change; check your team's dashboard and the
catalog before switching. An HTTP 401 indicates authentication trouble, 402
usually indicates a credit/budget issue, and 429 indicates rate limiting.
The application intentionally hides raw provider errors from customers.

To return to OpenRouter, set `AI_PROVIDER=openrouter`, configure
`OPENROUTER_API_KEY` and `OPENROUTER_MODEL`, then restart the backend.

Official references:
- https://vercel.com/docs/ai-gateway/sdks-and-apis/openai-chat-completions
- https://vercel.com/docs/ai-gateway/pricing
- https://vercel.com/docs/ai-gateway/rate-limits
