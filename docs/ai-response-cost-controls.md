# AI response cost controls

The message route validates requests before contacting a provider. Obvious off-topic questions, common keyboard gibberish, greetings, and acknowledgments receive a short local response with no model call. Conservative matching preserves cake themes, lettering, short design follow-ups, image-description content blocks, and tool-result continuations.

Ambiguous requests still reach the model. The system prompt asks for a fixed short redirect for unrelated input, a single short question for unclear cake requests, and at most 40 words after edits. These word limits are instructions, not guaranteed enforcement. Keyword rules cannot identify every unrelated or malicious prompt.

Vercel and OpenRouter output limits are 1,024 tokens per call (previously 2,048); Anthropic remains at 1,024, and Gemini now has the same limit and uses its system-instruction field. The token limit includes tool arguments and, depending on the model, reasoning. Complex requests can exhaust it; truncated gateway responses are rejected rather than applying incomplete edits. Multiple tool rounds, input history, schemas, and image analysis have separate costs. Live model evaluations are still required to assess instruction adherence and token use.
