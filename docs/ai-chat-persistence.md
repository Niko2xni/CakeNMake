# Designer AI chat

Signed-in customers have a private conversation saved on each design. Reopening that design restores it. New designs and duplicated designs start with a fresh conversation. Existing designs need no migration; missing chat data starts empty.

Guest conversations use sessionStorage and are associated with the browser history entry for the designer. Returning to that entry in the same tab restores the conversation; opening a new designer entry starts fresh. Closing the browser session removes guest history. This stores chat only, not the guest cake configuration.

Clear chat clears conversation context and messages without changing the cake. Completed responses save automatically. Leaving during an AI request discards its pending response; wait for the response to finish before leaving if you want to keep it.

Storage keeps up to 60 displayed messages within a size budget. The model receives the last four complete user exchanges plus the current request; older tool results are removed together with their corresponding calls. Current cake configuration is still sent with every request.

Authenticated GET and PUT `/api/designs/:id/ai-chat` endpoints enforce the existing design ownership checks. Chat is excluded from ordinary design queries and public design data. Save failures are shown in the AI panel.
