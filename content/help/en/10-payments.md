# Payments

> Available only to **owners and managers**. Teachers don't see the Payments tab.

Two types of payments:

- **One-time Payments** — books, extra fees, anything that doesn't repeat.
- **Recurring Payments** — fixed monthly tuition or any ongoing charge.

If your academy's tuition amount varies month to month, we recommend using **One-time Payments only** so each invoice can carry the correct amount.

## The Payments dashboard

```mockup
payments-list
```

The Payments tab has stat cards for total revenue, pending amount, active templates, and MRR — plus the invoice table with sorting, filters, and a row-level 3-dots menu (Edit / Delete). The tabs at the top let you switch between **One-time Payments** and **Recurring Payments**.

## Step 1 — Create a Payment Plan (for recurring billing)

A "Payment Plan" is a reusable template — e.g. *"Monthly Tuition – ₩400,000."* Set it up once, then assign students to it.

```mockup
add-payment-plan
```

1. Go to **Payment Plans**.
2. Click **Add Payment Plan** next to the search bar.
   - ⚠️ This is different from the **Add Payment** button. Don't mix them up.
3. Enter the **Plan Name** (e.g. *Monthly Tuition*).
4. Enter the **Amount** and pick **Recurrence Type** (Weekly or Monthly).
5. Set the **Payment Day of Month** (e.g. the 25th).
   - On this day each cycle, the system auto-creates a bill request and notifies the student/parent via KakaoTalk (and in-app, in a future release).
6. Choose a **Start Date** — for record-keeping. **End Date** is optional.
7. Click **Add Payment Plan**.

## Step 2 — Assign students to the plan

```mockup
assign-recurring-payment
```

Once you have at least one plan:

1. Go to **Recurring**.
2. Click **Add Payment** in the top-right corner.
3. Select **Recurring** as the payment type.
4. Choose the **Payment Plan** you created — the amount and next billing date appear in a blue helper card.
5. Pick which students this applies to — use **Select All** if it's the same tuition for everyone.
6. Click **Add Payment**.

Every selected student is now on the recurring billing schedule. You can edit, view, or remove individual entries from the Recurring page later.

## Step 3 — Create a One-time Payment

```mockup
add-one-time-payment
```

For one-off charges (books, supplies, late fees, etc.):

1. Click **Add Payment** in the top-right corner.
2. Select **One-time** as the payment type.
3. Enter the **Invoice Name**.
4. Pick the **student** to bill.
5. Enter the **Amount** and any **Discounts** (with a reason if relevant).
6. Set the **Payment Due Date** — *required*. Once this date passes, the payment link is automatically cancelled and the student/parent can't pay through it anymore.
7. Optionally pick a **Payment Method** and set the **Payment Status** (use this to record cash or in-person payments).
8. Click **Add Payment**.

After creation, you can open the invoice from the list to view or edit details.

## What parents and students see

When you create a payment, the recipient gets a notification with a payment link. They can pay via:

- Credit card
- KakaoPay
- NaverPay
- Toss

The transaction is recorded automatically and the invoice status flips to Paid.
