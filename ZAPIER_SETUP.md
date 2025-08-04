# Zapier Email Integration Setup

This document explains how to set up and test the Zapier webhook integration for sending welcome emails after Stripe checkout.

## Prerequisites

1. A Zapier account
2. Access to your email service (Gmail, SendGrid, etc.)
3. The backend API must return the customer's email in the `/api/fetch-license` response

## Setup Steps

### 1. Create Zapier Webhook

1. Log in to Zapier and create a new Zap
2. Choose "Webhooks by Zapier" as the trigger
3. Select "Catch Hook" as the trigger event
4. Copy the webhook URL provided by Zapier

### 2. Configure Environment Variable

Create a `.env` file in the project root:

```
PUBLIC_ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/YOUR_WEBHOOK_ID/
```

### 3. Configure Email Action in Zapier

1. Add an action step in your Zap
2. Choose your email service (e.g., Gmail, SendGrid)
3. Map the webhook data to your email template:
   - **To**: Use the `email` field from the webhook
   - **Subject**: "Welcome to VaultSync - Your License Key"
   - **Body**: Include the following data:
     - License Token: `{{licenseToken}}`
     - Download URLs: `{{downloadUrls.mac}}` and `{{downloadUrls.windows}}`
     - Session ID: `{{sessionId}}` (for reference)

### 4. Email Template Example

```
Hi there!

Thank you for purchasing VaultSync! Here's your license information:

License Token: {{licenseToken}}

Download VaultSync:
- macOS: {{downloadUrls.mac}}
- Windows: {{downloadUrls.windows}}

Installation Instructions:
1. Download VaultSync for your platform
2. Install the application
3. When prompted, paste your license token

If you have any questions, please don't hesitate to reach out.

Best regards,
The VaultSync Team
```

## Testing

### Local Testing

1. Set up your `.env` file with the Zapier webhook URL
2. Start the development server: `npm run dev`
3. Complete a test Stripe checkout
4. Verify on the downloads page:
   - "Sending welcome email..." message appears
   - "Welcome email sent!" confirmation shows
5. Check Zapier dashboard for webhook receipt
6. Verify email delivery

### Test Webhook Payload

The webhook sends the following data:

```json
{
  "sessionId": "cs_test_...",
  "licenseToken": "XXXX-XXXX-XXXX-XXXX",
  "email": "customer@example.com",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "platform": "mac",
  "downloadUrls": {
    "mac": "https://...",
    "windows": "https://..."
  }
}
```

### Production Deployment

1. Add `PUBLIC_ZAPIER_WEBHOOK_URL` to your Vercel environment variables
2. Turn on your Zap in Zapier
3. Test with a real purchase

## Backend Requirements

⚠️ **Important**: The backend API at `/api/fetch-license` must be updated to return the customer's email address:

```json
{
  "licenseToken": "XXXX-XXXX-XXXX-XXXX",
  "email": "customer@example.com"
}
```

Without the email in the response, the webhook won't trigger.

## Troubleshooting

- **Email not sending**: Check browser console for webhook errors
- **No email field**: Ensure backend returns email in the response
- **Webhook failing**: Verify the webhook URL is correct and Zap is turned on
- **Email not received**: Check spam folder and Zapier task history

## Security Notes

- The webhook URL is exposed to the client (PUBLIC_ prefix)
- Ensure your Zapier webhook validates data if needed
- Consider rate limiting on the Zapier side to prevent abuse