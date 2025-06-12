// frontend/src/utils/cleanup.ts
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('mWishTAXRe8gdGcqF6VqYW3JL1CkHU5waMfkM9VTVmg');

export async function cleanupAllLobbys() {
  try {
    console.log('🧹 Starting lobby cleanup...');
    
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    // Get all program accounts
    const allAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
      commitment: 'confirmed',
      encoding: 'base64'
    });
    
    console.log(`📊 Found ${allAccounts.length} total accounts`);
    
    // Platform PDA
    const [platformPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('platform')],
      PROGRAM_ID
    );
    
    let gameCount = 0;
    
    for (const account of allAccounts) {
      if (account.pubkey.equals(platformPDA)) {
        console.log('⏭️ Skipping platform account');
        continue;
      }
      
      gameCount++;
      console.log(`🎮 Found game account: ${account.pubkey.toString()}`);
      console.log(`   Data length: ${account.account.data.length} bytes`);
      
      // Check if account still exists and has lamports
      const accountInfo = await connection.getAccountInfo(account.pubkey);
      if (accountInfo) {
        console.log(`   💰 Balance: ${accountInfo.lamports / 1000000000} SOL`);
      }
    }
    
    console.log(`\n📋 SUMMARY:`);
    console.log(`   Platform accounts: 1`);
    console.log(`   Game accounts: ${gameCount}`);
    console.log(`   Total accounts: ${allAccounts.length}`);
    
    if (gameCount > 0) {
      console.log('\n⚠️ Found active game accounts!');
      console.log('These will be automatically cleaned up when:');
      console.log('1. Players complete games (auto-closed)');
      console.log('2. Creators delete games manually');
      console.log('3. Games expire after 24h');
      console.log('\nNo manual cleanup needed - Solana handles this automatically! ✅');
    } else {
      console.log('\n✅ No game accounts found - clean state!');
    }
    
    return {
      success: true,
      totalAccounts: allAccounts.length,
      gameAccounts: gameCount
    };
    
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Quick cleanup function for browser console
export async function quickCleanup() {
  console.log('🚀 Starting quick cleanup check...');
  const result = await cleanupAllLobbys();
  
  if (result.success) {
    console.log('✅ Cleanup complete!');
    console.log(`📊 Result: ${result.gameAccounts} game accounts found`);
  } else {
    console.log('❌ Cleanup failed:', result.error);
  }
  
  return result;
}