#!/usr/bin/env node

/**
 * Test PortOne Platform API Sync
 *
 * This script tests the sync endpoint by calling it and displaying the results
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testSync() {
  console.log('🔄 Testing PortOne Platform API Sync...\n');

  try {
    // Test GET endpoint first
    console.log('1️⃣ Testing GET /api/portone/sync (info endpoint)...');
    const infoResponse = await fetch(`${BASE_URL}/api/portone/sync`);
    const info = await infoResponse.json();
    console.log('✅ GET endpoint response:');
    console.log(JSON.stringify(info, null, 2));
    console.log('');

    // Test POST endpoint (actual sync)
    console.log('2️⃣ Testing POST /api/portone/sync (trigger sync)...');
    console.log('   This will call PortOne Platform API and sync data...\n');

    const syncResponse = await fetch(`${BASE_URL}/api/portone/sync`, {
      method: 'POST',
    });

    const result = await syncResponse.json();

    if (result.success) {
      console.log('✅ Sync completed successfully!\n');
      console.log('📊 Results:');
      console.log(`   Duration: ${result.duration}ms`);
      console.log('');
      console.log('   Settlements:');
      console.log(`   - Synced: ${result.settlements.synced}`);
      console.log(`   - Errors: ${result.settlements.errors}`);
      console.log('');
      console.log('   Payouts:');
      console.log(`   - Synced: ${result.payouts.synced}`);
      console.log(`   - Errors: ${result.payouts.errors}`);
      console.log('');

      if (result.settlements.synced > 0 || result.payouts.synced > 0) {
        console.log('💾 Check your database webhook_events table to see the synced data:');
        console.log('   - Settlement events: type = "settlement"');
        console.log('   - Payout events: type = "payout"');
      } else {
        console.log('ℹ️  No new data to sync (this is normal if no recent settlements/payouts)');
      }
    } else {
      console.log('❌ Sync failed!');
      console.log(`   Error: ${result.message}`);
      console.log('');

      if (result.message?.includes('API Secret')) {
        console.log('💡 Make sure you have set these environment variables:');
        console.log('   - PORTONE_API_SECRET');
        console.log('   - PORTONE_STORE_ID');
      }
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log('');
    console.log('💡 Troubleshooting:');
    console.log('   1. Make sure your dev server is running (npm run dev)');
    console.log('   2. Check that BASE_URL is correct:', BASE_URL);
    console.log('   3. Verify environment variables are set');
    process.exit(1);
  }
}

// Run test
testSync();
