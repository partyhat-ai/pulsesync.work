# Zapier Integration Debugging Guide

## How to Debug Zapier Integration

### 1. Browser Console Debugging

Open your browser's DevTools (F12) and check the Console tab when going through the checkout flow. Look for these log messages:

- `DEBUG: Zapier configuration on mount` - Shows initial configuration
- `DEBUG: Starting Zapier webhook trigger` - Shows when webhook is triggered
- `DEBUG: Zapier webhook payload` - Shows the exact data being sent
- `DEBUG: Zapier webhook response` - Shows the response from Zapier
- `MONITOR: Zapier webhook triggered successfully` - Confirms success
- `MONITOR: Zapier webhook failed` - Shows any errors

### 2. Debug Mode UI

Add `?debug=true` to your downloads page URL to enable debug mode:

```
https://yourdomain.com/downloads?session_id=YOUR_SESSION_ID&debug=true
```

In debug mode, you'll see:
- Current Zapier configuration status
- The webhook URL being used
- A "Test Webhook" button to manually trigger a test
- Detailed response information when webhooks are sent

### 3. Manual Testing with Node.js Script

Test your webhook directly using the provided script:

```bash
node test-zapier-webhook.js
```

This will:
- Send a test payload to your Zapier webhook
- Show the full response
- Help verify the webhook is working independently

### 4. Common Issues to Check

1. **Environment Variables**
   - Ensure `PUBLIC_ZAPIER_WEBHOOK_URL` is set in your `.env` file
   - The URL should look like: `https://hooks.zapier.com/hooks/catch/XXXXXX/XXXXXXX/`
   - Check there are no extra spaces or quotes

2. **Email Field**
   - The webhook only fires if an email is returned from the license API
   - Check the API response includes an email field

3. **Zapier Dashboard**
   - Log into Zapier and check your webhook's task history
   - Ensure the webhook is turned ON (not paused)
   - Check for any error messages in failed tasks

4. **Network Issues**
   - Check browser network tab for the webhook request
   - Look for CORS errors (though Zapier webhooks should handle CORS)
   - Verify the request is actually being sent

### 5. Testing Workflow

1. First, verify environment setup:
   - Check console logs on page load
   - Confirm webhook URL is loaded

2. Test with the manual script:
   ```bash
   node test-zapier-webhook.js
   ```

3. Test in debug mode:
   - Navigate to downloads page with `?debug=true`
   - Use the "Test Webhook" button

4. Test the full flow:
   - Complete a real checkout
   - Monitor console logs
   - Check Zapier dashboard

### 6. Response Expectations

A successful Zapier webhook typically returns:
- Status: 200 OK
- Body: `{"status": "success", "id": "XXXXXXXX"}`

Common error responses:
- 404: Wrong webhook URL
- 500: Zapier internal error
- 401: Authentication issue (rare for webhooks)

### 7. Debugging Checklist

- [ ] Environment variable `PUBLIC_ZAPIER_WEBHOOK_URL` is set correctly
- [ ] Webhook URL is valid and starts with `https://hooks.zapier.com/`
- [ ] Browser console shows webhook being triggered
- [ ] Test script successfully sends to webhook
- [ ] Zapier dashboard shows incoming webhooks
- [ ] Email field is present in license API response
- [ ] No CORS or network errors in browser