# Cake AI integration handoff

Integrated from the local `cakenmake-capstone-AI` workspace on October 4, 2026.

## What is integrated

- Designer AI chat: `client/src/components/cake/AIChatPanel.jsx` now calls the backend, keeps Anthropic-format conversation context, executes cake tools, displays change chips, and caps tool loops at six requests.
- Bakery chat: a Cake AI switch uses the same AI panel while preserving this project's authenticated support chat and guest demo. Both modes stay mounted when switching.
- Designer desktop and mobile panels receive the current design and price quote.
- Client API uses `VITE_API_BASE_URL`, consistent with the final project's other API calls.
- Express exposes `POST /api/cake-ai/message` with Gemini and Anthropic provider branches.
- Ten cake tools cover structure, sponge, filling, finish, color, glaze, side treatment, placing/clearing decorations, and reading the current quote.
- `smoke-test-cake-ai.ps1` contains a manual backend request.

The standalone `/cake-ai` page already had the source project's prototype behavior. Its newer upload validation and layout were preserved. It still logs a payload locally rather than calling AI.

## Configuration

Install server dependencies with `npm install` in `server`. Set these in your local `server/.env`:

```dotenv
AI_PROVIDER=gemini
GEMINI_API_KEY=your-key
ANTHROPIC_API_KEY=
```

For Anthropic, select `AI_PROVIDER=anthropic` and configure `ANTHROPIC_API_KEY` instead. Actual credentials were not copied from the source workspace. Restart the server after changing provider settings.

## Generate backend catalogs

After changing the frontend cake configuration, flavors, or AI tool schemas, run from the repository root:

```powershell
node server/scripts/setup-cake-ai.js
```

This generates CommonJS modules in `server/lib` from the final project's frontend catalogs. It normalizes line endings before converting imports and exports.

## Known unfinished work carried over

1. Gemini currently supplies no function declarations and returns only text, so it cannot apply cake edits. Implement Gemini function calling and adapt responses to the frontend's `tool_use`/`tool_result` protocol.
2. Translate assistant roles to Gemini's model role and preserve tool arguments/results when converting history. Verify the configured model identifier against the provider before live testing.
3. Connect the standalone Cake AI page to a real conversation/generation workflow; attachments currently remain local.
4. Conversations exist only in React state and reset on unmount/reload. The two designer AI panel instances have separate histories.
5. Tool scope is whole-cake edits. Per-tier edits and additional designer controls are unfinished.
6. Off-center placement uses a fixed radius. The imported placement executor does not assign the item identifiers used by the final designer's selection system; placement limits/collision handling also need alignment.
7. Quotes are snapshots captured when sending. An AI edit followed by a quote tool in that turn can read the preceding design's estimate.
8. Add tool argument validation, request limits, and AI-specific end-to-end coverage. The imported AI endpoint currently has only basic body checks.

Unused source snippets and duplicate backend catalogs under the client's library folder were omitted; the mounted Express route and generated server catalogs are the implementation to continue developing.

## Integration verification

- Client production build passed.
- Seven focused client tests passed, including sequential AI tool edits, API failure recovery, and existing bakery chat/page behavior.
- All 61 existing server tests passed.
- Backend HTTP checks passed for malformed request (400) and missing provider credentials (502).
- Both provider SDKs are installed and recorded in the server package manifest and lockfile.
- Live provider requests were not run; configure credentials and verify them during continued development.
