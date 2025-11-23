# Stripe Setup Guide

This guide will help you set up Stripe for subscription billing in the Crypto Signals platform.

## Step 1: Create a Stripe Account

1. Go to [https://stripe.com](https://stripe.com)
2. Click **"Sign up"** or **"Start now"**
3. Create your account (you can use test mode initially)
4. Complete the account setup process

## Step 2: Get Your API Keys

### Test Mode (Development)

1. Log in to your Stripe Dashboard: [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Make sure you're in **Test mode** (toggle in the top right)
3. Go to **Developers** → **API keys**
4. You'll see:
   - **Publishable key** (starts with `pk_test_...`) - Not needed for backend
   - **Secret key** (starts with `sk_test_...`) - This is your `STRIPE_SECRET_KEY`

**Copy the Secret key** - this is what you'll use for `STRIPE_SECRET_KEY`

### Production Mode

1. Switch to **Live mode** (toggle in top right)
2. Go to **Developers** → **API keys**
3. Copy the **Secret key** (starts with `sk_live_...`)
4. Use this for production environment

⚠️ **Important**: Never commit live keys to version control!

## Step 3: Create a Product and Price

### Create a Product

1. In Stripe Dashboard, go to **Products** → **Add product**
2. Fill in:
   - **Name**: "Pro Plan" (or your plan name)
   - **Description**: "Access to premium accumulation signals and alerts"
   - **Pricing model**: Select **"Recurring"**
   - **Price**: Enter your monthly/yearly price (e.g., $29/month or $299/year)
   - **Billing period**: Monthly or Yearly
   - **Currency**: USD (or your preferred currency)
3. Click **"Save product"**

### Get the Price ID

1. After creating the product, you'll see the product details
2. Under **Pricing**, you'll see the price you created
3. Click on the price to see details
4. The **Price ID** is shown (starts with `price_...`)
5. **Copy this Price ID** - this is your `STRIPE_PRICE_ID_PRO`

**Example**: If you created a $29/month plan, the Price ID might look like:
```
price_1ABC123xyz789
```

## Step 4: Set Up Webhooks

### Create a Webhook Endpoint

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **"Add endpoint"**
3. Fill in:
   - **Endpoint URL**: 
     - For local development: `http://localhost:3001/api/billing/webhook`
     - For production: `https://yourdomain.com/api/billing/webhook`
   - **Description**: "Crypto Signals Platform - Subscription Events"
   - **Events to send**: Select these events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
4. Click **"Add endpoint"**

### Get Webhook Secret

1. After creating the webhook endpoint, click on it
2. You'll see the **Signing secret** (starts with `whsec_...`)
3. Click **"Reveal"** to see the full secret
4. **Copy this secret** - this is your `STRIPE_WEBHOOK_SECRET`

⚠️ **Important**: Keep this secret secure! It's used to verify webhook requests are from Stripe.

### Testing Webhooks Locally

For local development, you can use **Stripe CLI** to forward webhooks:

1. Install Stripe CLI: [https://stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to localhost:3001/api/billing/webhook`
4. The CLI will show a webhook signing secret - use this for local testing

## Step 5: Add to Environment Variables

Add these to your `backend/.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_51ABC123...your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_ABC123...your_webhook_secret_here
STRIPE_PRICE_ID_PRO=price_1ABC123...your_price_id_here
```

### Example `.env` entries:

```env
# Stripe Configuration (Test Mode)
STRIPE_SECRET_KEY=sk_test_51AbCdEf1234567890GhIjKlMnOpQrStUvWxYz
STRIPE_WEBHOOK_SECRET=whsec_AbCdEf1234567890GhIjKlMnOpQrStUvWxYz
STRIPE_PRICE_ID_PRO=price_1AbCdEf1234567890GhIjKlMnOpQrStUvWxYz
```

## Step 6: Verify Setup

1. Restart your backend server
2. Check logs for any Stripe initialization errors
3. Test the checkout endpoint:
   ```bash
   curl -X POST http://localhost:3001/api/billing/checkout \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"plan": "PRO"}'
   ```

## Security Best Practices

1. ✅ **Never commit API keys to Git**
   - Add `.env` to `.gitignore`
   - Use environment variables in production

2. ✅ **Use different keys for test and production**
   - Test keys: `sk_test_...` and `whsec_...` (test mode)
   - Live keys: `sk_live_...` and `whsec_...` (live mode)

3. ✅ **Rotate keys regularly**
   - If a key is compromised, regenerate it in Stripe Dashboard

4. ✅ **Use webhook signature verification**
   - Always verify webhook signatures to ensure requests are from Stripe

5. ✅ **Monitor webhook events**
   - Check Stripe Dashboard → Webhooks for delivery status
   - Set up alerts for failed webhook deliveries

## Troubleshooting

### "Invalid API Key"
- Make sure you're using the correct key (test vs live)
- Check for extra spaces or characters
- Verify the key is complete

### "Webhook signature verification failed"
- Ensure `STRIPE_WEBHOOK_SECRET` matches the webhook endpoint secret
- If using Stripe CLI locally, use the secret shown by `stripe listen`
- Check that raw body is being sent (configured in `main.ts`)

### "Price ID not found"
- Verify the Price ID exists in your Stripe account
- Check that you're using the correct Stripe mode (test vs live)
- Ensure the price is active

## Additional Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)

## Quick Reference

| Environment Variable | Where to Find | Example |
|---------------------|---------------|---------|
| `STRIPE_SECRET_KEY` | Dashboard → Developers → API keys → Secret key | `sk_test_51...` |
| `STRIPE_WEBHOOK_SECRET` | Dashboard → Developers → Webhooks → Endpoint → Signing secret | `whsec_...` |
| `STRIPE_PRICE_ID_PRO` | Dashboard → Products → [Your Product] → Price ID | `price_1...` |

