# Customer chat moderation

## Where to find it

Bakery staff open **Chats → Overview** to review held messages, manage customer restrictions, and respond to appeals or existing-order requests. **Chats → Messages** keeps the regular conversation interface.

Customers open **Account → Orders & Support**. A restricted customer also sees a notice linking to this page.

## Staff workflow

1. Read a held message and enter a review reason.
2. Choose **Dismiss flag & release** for a false flag, or **Confirm abuse** for an abusive message.
3. Open the customer account, inspect the evidence, choose the reviewed message, and acknowledge reviewing it.
4. Enter an account-action reason and choose **Suspend** or **Ban indefinitely**.
5. Use **Restore access** with a reason to remove a restriction.

Staff can also flag a previously delivered customer message from the account review panel. Its message text remains preserved. Message review history records automatic flags, manual flags, releases, and confirmed abuse. Account history records staff actions, reasons, dates, evidence, and suspension expiry.

Only customer accounts can be moderated. Staff must have a bakery assignment. A stale account-action form is rejected if another staff member has changed the restriction.

## Suspension and ban

Both block normal chat sending and new bakery submissions. Customers can still log in, read messages, view existing reservations and payment information, access available blueprints, and use the limited support forms. Neither action cancels existing orders.

- **Suspension:** 1, 3, 7, or 30 days, or a custom future expiry. Expiry is entered/displayed in Philippine time. The server allows actions automatically once the expiry passes.
- **Ban:** indefinite; staff must restore access.

These restrictions are separate from the older account-availability status. An account already disabled through that older mechanism remains unavailable.

## Spam rules

- The third and subsequent identical messages within a rolling 60-second window are held. Comparison ignores case and extra whitespace.
- Customers can send up to 10 messages in 60 seconds. The next attempt is rejected and starts a 60-second cooldown.
- The rules apply across HTTP, Socket.IO, browser tabs, and server processes using one atomic MongoDB gate per customer.
- Retrying an existing message identity does not create another message or count as another submission.
- A link alone does not trigger a flag. The detector does not identify hackers, prove fraud, or automatically suspend or ban accounts.

Held messages show **Message held for review** to their sender. They are excluded from the bakery's normal message results, previews, unread counts, and normal message broadcasts. Confirmed abusive messages remain filtered. Releasing a false flag delivers the message without creating a duplicate.

## Appeals and existing-order contact

Plain-text requests and replies allow up to 2,000 characters.

- One pending appeal per restriction.
- One open contact request per existing order.
- Order ownership is checked on the server. During a restriction, only orders created before it began are eligible.
- Customers can send a follow-up after staff replies.
- Staff can reply or reply and resolve. Resolving an appeal does not automatically restore access.
- Each thread has a 100-message limit to bound storage and abuse; resolved threads remain visible to the customer.

The staff Overview and customer support page refresh every 30 seconds and have manual refresh controls. Moderation changes also notify connected clients.

## Checkout and existing data

The current checkout is simulated and submits a blueprint; it does not create a real payment or a new Reservation record. Submission now requires a signed-in customer so restrictions can be enforced on the server. New blueprints record the authenticated customer as owner. Staff can still view older guest demo records, but those records cannot safely be assigned to a customer based on a matching name.

Existing users are unrestricted by default, and older messages are treated as approved. No existing order, message, or payment record is deleted by moderation.

## Verification and rollout

Server and client tests cover permissions, restriction expiry, existing-session enforcement, filtered broadcasts, evidence requirements, concurrent action conflicts, request ownership, appeal limits, and staff/customer workflows.

The MongoDB integration test is `server/test/moderationMongo.test.js`. Set `TEST_MONGO_URI` to a dedicated test MongoDB instance and run it with `node --test test/moderationMongo.test.js` from the server directory. It creates and removes an isolated test database, checking real pipeline behavior, thresholds, cooldowns, and concurrent retries. It skips when the test URI is absent.

Before rollout, complete that integration test and a live desktop/mobile check with both a customer and a staff account. The local environment used for implementation had no local MongoDB, and its browser automation service could not start.
