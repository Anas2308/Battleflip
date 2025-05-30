import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from '@solana/web3.js';

// Quick script to check platform state and find issues
async function checkPlatformState() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const programId = new PublicKey('mWishTAXRe8gdGcqF6VqYW3JL1CkHU5waMfkM9VTVmg');
  
  // Platform PDA
  const [platformPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('platform')],
    programId
  );

  try {
    console.log('🔍 Checking platform state...');
    console.log('Platform PDA:', platformPDA.toString());
    console.log('Program ID:', programId.toString());

    // Get platform account info
    const platformAccountInfo = await provider.connection.getAccountInfo(platformPDA);
    
    if (!platformAccountInfo) {
      console.log('❌ Platform account does not exist!');
      return;
    }

    console.log('✅ Platform account exists');
    console.log('  Data length:', platformAccountInfo.data.length);
    console.log('  Owner:', platformAccountInfo.owner.toString());

    // Try to use the program from workspace (like in tests)
    const program = anchor.workspace.Battleflip;
    
    if (program) {
      console.log('\n📊 Reading platform data...');
      
      try {
        const platformData = await program.account.platform.fetch(platformPDA);
        console.log('Platform Data:');
        console.log('  Authority:', platformData.authority.toString());
        console.log('  Fee Wallet:', platformData.feeWallet.toString());
        console.log('  Total Games:', platformData.totalGames.toNumber());
        console.log('  Active Games:', platformData.activeGames.toNumber());
        console.log('  Total Volume:', platformData.totalVolume.toNumber() / anchor.web3.LAMPORTS_PER_SOL, 'SOL');

        // Check for sync issues
        if (platformData.totalGames.toNumber() !== platformData.activeGames.toNumber()) {
          console.log('\n🚨 DETECTED SYNC ISSUE:');
          console.log('  totalGames:', platformData.totalGames.toNumber());
          console.log('  activeGames:', platformData.activeGames.toNumber());
          console.log('  ❌ These should be equal for PDA calculation!');
        } else {
          console.log('\n✅ totalGames and activeGames are in sync');
        }

        // Calculate what the next game PDA should be
        const nextGameNumber = platformData.totalGames.toNumber();
        console.log('\n🎯 Next game PDA calculation:');
        console.log('  Next game number:', nextGameNumber);

        // Test PDA calculation with frontend wallet
        const frontendWallet = new PublicKey('J2MGRmSnpPHzkgwzDviieuAmUuzFtxVwPn6zgrHzbzLc');
        const testLobbyName = 'asd';
        
        const [expectedPDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from('game'),
            platformPDA.toBuffer(),
            new anchor.BN(nextGameNumber).toArrayLike(Buffer, 'le', 8),
            frontendWallet.toBuffer(),
            Buffer.from(testLobbyName)
          ],
          programId
        );

        console.log('  Expected PDA for frontend wallet:', expectedPDA.toString());
        console.log('  Frontend wallet:', frontendWallet.toString());
        console.log('  Test lobby name:', testLobbyName);

      } catch (fetchError) {
        console.error('❌ Error reading platform data:', fetchError);
      }
    }

    // Get all program accounts
    console.log('\n🔍 Checking all program accounts...');
    const allAccounts = await provider.connection.getProgramAccounts(programId);
    console.log(`Found ${allAccounts.length} program accounts:`);
    
    for (const account of allAccounts) {
      console.log(`\n📋 Account: ${account.pubkey.toString()}`);
      console.log(`   Data length: ${account.account.data.length} bytes`);
      console.log(`   Owner: ${account.account.owner.toString()}`);
      
      if (account.pubkey.equals(platformPDA)) {
        console.log('   📍 This is the PLATFORM account');
      } else {
        console.log('   🎮 This looks like a GAME account');
        
        // Try to decode as game account if program is available
        if (program) {
          try {
            const gameData = await program.account.game.fetch(account.pubkey);
            console.log(`     Lobby: ${gameData.lobbyName}`);
            console.log(`     Creator: ${gameData.creator.toString()}`);
            console.log(`     Status: ${JSON.stringify(gameData.status)}`);
            console.log(`     Bet Amount: ${gameData.betAmount.toNumber() / anchor.web3.LAMPORTS_PER_SOL} SOL`);
          } catch (err) {
            console.log('     ❌ Could not decode as game account');
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Error during check:', error);
  }
}

checkPlatformState().catch(console.error);