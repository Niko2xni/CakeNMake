# Cake AI integration handoff

Integrated from the local `cakenmake-capstone-AI` workspace on October 4, 2026.

## What is integrated

- Designer AI chat: `client/src/components/cake/AIChatPanel.jsx` now calls the backend, keeps Anthropic-format conversation context, executes cake tools, displays change chips, and caps tool loops at six requests.
- Bakery chat: a Cake AI switch uses the same AI panel while preserving this project's authenticated support chat and guest demo. Both modes stay mounted when switching.
- Designer desktop and mobile panels receive the current design and price quote.
- Client API uses `VITE_API_BASE_URL`, consistent with the final project's other API calls.
- Express exposes `POST /api/cake-ai/message` with OpenRouter, Gemini, and Anthropic provider branches. OpenRouter translates tool calls to the existing editor protocol.
- Ten cake tools cover structure, sponge, filling, finish, color, glaze, side treatment, placing/clearing decorations, and reading the current quote.
- `smoke-test-cake-ai.ps1` contains a manual backend request.

The standalone `/cake-ai` page already had the source project's prototype behavior. Its newer upload validation and layout were preserved. It still logs a payload locally rather than calling AI.

## Configuration

Install server dependencies with `npm install` in `server`. Set these in your local `server/.env`:

```dotenv
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=your-key
OPENROUTER_MODEL=provider/model-id
```

Replace `provider/model-id` with an exact OpenRouter model identifier supporting tool calling. The key belongs only in the server environment. Restart the server after changing the model or provider settings. The adapter uses Node's built-in fetch; no additional SDK is required. Gemini and Anthropic remain available through their existing provider settings.

`server/src/services/openRouterCakeAi.js` converts tool schemas, assistant tool calls, and user tool results between OpenRouter and the editor's existing message format. It preserves reasoning details for follow-up calls, returns provider model/usage metadata, enforces a 60-second request timeout, and rejects malformed or truncated responses before execution. It requests providers supporting all supplied parameters. No automatic paid retry or model fallback is configured.

The designer AI tab and bakery panel's Cake AI mode use this adapter. The standalone `/cake-ai` page remains a separate prototype. Missing key/model configuration returns HTTP 503; live requests cannot be verified until credentials are supplied.

Adapter tests use mocked HTTP responses and need no key:

```powershell
cd server
node --test test/openRouterCakeAi.test.js
```

Reference: https://openrouter.ai/docs/guides/features/tool-calling

## Generate backend catalogs

After changing the frontend cake configuration, flavors, or AI tool schemas, run from the repository root:

```powershell
node server/scripts/setup-cake-ai.js
```

This generates CommonJS modules in `server/lib` from the final project's frontend catalogs. It normalizes line endings before converting imports and exports.

## Known unfinished work carried over

1. Gemini currently supplies no function declarations and returns only text, so it cannot apply cake edits. Implement Gemini function calling and adapt responses to the frontend's `tool_use`/`tool_result` protocol.
2. The legacy Gemini branch still needs role/tool translation. OpenRouter now has its own adapter. Verify your selected OpenRouter model with live requests after configuring credentials.
3. Connect the standalone Cake AI page to a real conversation/generation workflow; attachments currently remain local.
4. Conversations exist only in React state and reset on unmount/reload. The two designer AI panel instances have separate histories.
5. Tool scope is whole-cake edits. Per-tier edits and additional designer controls are unfinished.
6. Placement now uses the actual top-tier radius, selectable item IDs, decoration limits, and existing footprint/boundary/edge collision helpers. Piping text collision bounds still need sharing with CakeScene. Repositioning/removing individual decorations through AI and per-tier targeting remain future work.
7. Quotes are snapshots captured when sending. An AI edit followed by a quote tool in that turn can read the preceding design's estimate.
8. Local tool arguments now validate types, required fields, enums, unknown fields, and side-treatment variants before mutating. Provider request limits and live AI end-to-end coverage remain unfinished; the endpoint still has only basic body checks.

Unused source snippets and duplicate backend catalogs under the client's library folder were omitted; the mounted Express route and generated server catalogs are the implementation to continue developing.

## Integration verification

- Client production build passed.
- Seven focused client tests passed, including sequential AI tool edits, API failure recovery, and existing bakery chat/page behavior.
- All 61 existing server tests passed.
- Backend HTTP checks passed for malformed request (400) and missing provider credentials (502).
- Both provider SDKs are installed and recorded in the server package manifest and lockfile.
- Live provider requests were not run; configure credentials and verify them during continued development.

## Offline cake-editing improvements

The editing executor now shares one tool schema catalog with the server generator. Whole-cake edits update tier flavor/style/color/treatment fields even in individual mode, keeping unrelated tier settings. Structure edits update real dimensions, enforce the small cake's one-tier limit, and synchronize tier state like the manual controls. Supplying a color activates color override by default; disabling filling remains respected when also changing filling layers.

Run offline tests from `client` with:

```powershell
npm test -- --run src/lib/aiCakeTools.test.js src/components/cake/AIChatPanel.test.jsx src/components/bakery/BakeryChatPanel.test.jsx
```

These 22 tests and the production build passed after the editing improvements. No API key is needed for these mocked/local checks. Natural-language editing now uses the implemented OpenRouter adapter when selected; provider credentials and a tool-capable model are still required for live requests.
