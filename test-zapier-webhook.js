#!/usr/bin/env node

// Test script to manually trigger the Zapier webhook
// Usage: node test-zapier-webhook.js

const WEBHOOK_URL = 'https://hooks.zapier.com/hooks/catch/16104307/uudv8ka/';

async function testWebhook() {
  console.log('Testing Zapier webhook...');
  console.log('Webhook URL:', WEBHOOK_URL);
  
  const testPayload = {
    sessionId: 'test_session_' + Date.now(),
    licenseToken: 'TEST-1234-5678-9012',
    email: 'test@example.com',
    timestamp: new Date().toISOString(),
    platform: 'mac',
    downloadUrls: {
      mac: 'https://partyhat-vaultsync-bucket.s3.us-east-1.amazonaws.com/VaultSync-1.0.2-arm64-mac.zip',
      windows: 'https://partyhat-vaultsync-bucket.s3.us-east-1.amazonaws.com/VaultSync.zip'
    },
    plan: 'test_plan',
    status: 'active',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
  };
  
  console.log('\nSending payload:', JSON.stringify(testPayload, null, 2));
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });
    
    console.log('\nResponse status:', response.status, response.statusText);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.ok) {
      console.log('\n✅ Webhook test successful!');
      console.log('Check your Zapier dashboard to see if the webhook was received.');
    } else {
      console.log('\n❌ Webhook test failed!');
      console.log('Status:', response.status);
      console.log('Response:', responseText);
    }
  } catch (error) {
    console.error('\n❌ Error testing webhook:', error);
    console.error('Error details - ', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testWebhook();