# Orders workflow

Authenticated customer checkout submits a private blueprint and creates one reservation for that submission. The server recalculates the cake price from the active bakery price book and preserves the pricing snapshot. A stale quote must be refreshed before checkout. Retry uses the same submission and does not duplicate orders or reset an existing payment.

Checkout remains a simulation: it does not charge GCash or PayMongo. New orders appear under **Awaiting Payment**, with the existing 50% down-payment policy rounded up to a whole peso. Simulated checkout contributes to order value, but not collected payments.

Staff open a reservation and use **Record down payment** after verifying receipt outside the website. Choose GCash, Cash, Bank transfer, or Other, and enter a receipt/reference. The server records the required amount, method, reference, timestamp, and staff account. Recording a payment confirms an order awaiting payment and refreshes Reservations, Payment History, and summary cards. Duplicate recording is rejected. This is a single down-payment record, not installment accounting, balance collection, or refunds.

**Open chat with customer** opens or creates the customer's conversation for this bakery and selects it in Messages. Existing chats are reused; closed chats remain closed until staff choose Reopen chat. It does not automatically send a message.

**View blueprint PDF** requests a temporary authorized link to the private checkout blueprint. Legacy reservations with existing PDF URLs continue to use those links.

This applies to new checkouts and retried ready submissions owned by customers. Existing guest demo blueprints are not turned into orders, and historical submissions are not automatically migrated. Restart the backend after updating. No live payment-provider integration is enabled.
