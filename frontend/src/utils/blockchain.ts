import { Connection, PublicKey, SystemProgram, LAMPORTS_PER_SOL, clusterApiUrl } from '@solana/web3.js';
import { Program, AnchorProvider, BN, setProvider } from '@coral-xyz/anchor';
import type{ WalletContextState } from '@solana/wallet-adapter-react';
import type { GameLobby, FinishedGame, GameStats } from '../types';

// Program ID from deployment
export const PROGRAM_ID = new PublicKey('mWishTAXRe8gdGcqF6VqYW3JL1CkHU5waMfkM9VTVmg');

// Fee wallet (replace with your actual fee wallet)
export const FEE_WALLET = new PublicKey('HQre2z3L5eLdt9MCjLdkdo7pjqozrbD8epqJ6k7RNGxT');

// Platform PDA
export const [PLATFORM_PDA] = PublicKey.findProgramAddressSync(
  [Buffer.from('platform')],
  PROGRAM_ID
);

export class BlockchainService {
  private connection: Connection;
  private program: any = null;

  constructor() {
    // Devnet connection
    this.connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  }

  // Initialize program with wallet
  async initializeProgram(wallet: WalletContextState): Promise<any> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      return null;
    }

    try {
      // Import IDL dynamically to avoid type issues
      const { default: IDL } = await import('../idl/battleflip.json');
      
      const provider = new AnchorProvider(
        this.connection,
        wallet as any,
        { preflightCommitment: 'confirmed' }
      );

      setProvider(provider);
      this.program = new Program(IDL as any, provider);
      return this.program;
    } catch (error) {
      console.error('Error initializing program:', error);
      return null;
    }
  }

  // Check if platform is initialized
  async isPlatformInitialized(): Promise<boolean> {
    try {
      const platformAccount = await this.connection.getAccountInfo(PLATFORM_PDA);
      return platformAccount !== null;
    } catch (error) {
      console.error('Error checking platform initialization:', error);
      return false;
    }
  }

  // Initialize platform (only needed once)
  async initializePlatform(wallet: WalletContextState): Promise<boolean> {
    const program = await this.initializeProgram(wallet);
    if (!program || !wallet.publicKey) return false;

    try {
      const tx = await program.methods
        .initializePlatform()
        .accounts({
          platform: PLATFORM_PDA,
          authority: wallet.publicKey,
          feeWallet: FEE_WALLET,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('Platform initialized:', tx);
      return true;
    } catch (error) {
      console.error('Error initializing platform:', error);
      return false;
    }
  }

  // CRITICAL FIX: Use actual totalGames + activeGames to calculate correct PDA
  async createGame(
    wallet: WalletContextState,
    lobbyName: string,
    betAmountSol: number
  ): Promise<{ success: boolean; gameId?: string; error?: string }> {
    const program = await this.initializeProgram(wallet);
    if (!program || !wallet.publicKey) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      // Get current platform data
      const platformData = await program.account.platform.fetch(PLATFORM_PDA);
      
      // CRITICAL FIX: The issue is totalGames = 0 but activeGames = 1
      // This means the backend totalGames counter is broken
      // Use totalGames as the NEXT game number to create
      let actualTotalGames = platformData.totalGames.toNumber();
      const activeGames = platformData.activeGames.toNumber();
      
      console.log('🚨 PLATFORM STATE ANALYSIS:');
      console.log('  Platform totalGames:', actualTotalGames);
      console.log('  Platform activeGames:', activeGames);
      
      // WORKAROUND: If totalGames < activeGames, sync them
      // This happens when the first game was created with the old buggy code
      if (actualTotalGames < activeGames) {
        console.log('🔧 DETECTED SYNC ISSUE: totalGames < activeGames');
        console.log('   Using activeGames as totalGames for PDA calculation');
        actualTotalGames = activeGames;
      }

      console.log('🔍 DEBUG PDA calculation:');
      console.log('  Platform PDA:', PLATFORM_PDA.toString());
      console.log('  Using Total Games:', actualTotalGames);
      console.log('  Creator:', wallet.publicKey.toString());
      console.log('  Lobby Name:', lobbyName);

      // Calculate PDA with corrected totalGames
      const seeds = [
        Buffer.from('game'),
        PLATFORM_PDA.toBuffer(),
        new BN(actualTotalGames).toArrayLike(Buffer, 'le', 8),
        wallet.publicKey.toBuffer(),
        Buffer.from(lobbyName)
      ];

      console.log('🔧 Seeds breakdown:');
      console.log('  1. "game":', Buffer.from('game').toString('hex'));
      console.log('  2. platform:', PLATFORM_PDA.toBuffer().toString('hex'));
      console.log('  3. total_games:', new BN(actualTotalGames).toArrayLike(Buffer, 'le', 8).toString('hex'));
      console.log('  4. creator:', wallet.publicKey.toBuffer().toString('hex'));
      console.log('  5. lobby_name:', Buffer.from(lobbyName).toString('hex'));

      const [gamePDA] = PublicKey.findProgramAddressSync(seeds, PROGRAM_ID);

      const betAmountLamports = new BN(betAmountSol * LAMPORTS_PER_SOL);

      console.log('🎮 Creating game with PDA:', gamePDA.toString());
      console.log('📝 Lobby name:', lobbyName);
      console.log('💰 Bet amount:', betAmountSol, 'SOL');
      console.log('🔢 Game number:', actualTotalGames);

      const tx = await program.methods
        .createGame(lobbyName, betAmountLamports)
        .accounts({
          game: gamePDA,
          platform: PLATFORM_PDA,
          creator: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('✅ Game created! TX:', tx);
      console.log('🆔 Game PDA:', gamePDA.toString());
      return { success: true, gameId: gamePDA.toString() };
    } catch (error: any) {
      console.error('❌ Error creating game:', error);
      
      // If we still get ConstraintSeeds error, try with totalGames + 1
      if (error.message.includes('ConstraintSeeds')) {
        console.log('🔄 Retrying with totalGames + 1...');
        
        try {
          const platformData = await program.account.platform.fetch(PLATFORM_PDA);
          const nextGameNumber = platformData.totalGames.toNumber() + 1;
          
          const retrySeeds = [
            Buffer.from('game'),
            PLATFORM_PDA.toBuffer(),
            new BN(nextGameNumber).toArrayLike(Buffer, 'le', 8),
            wallet.publicKey.toBuffer(),
            Buffer.from(lobbyName)
          ];
          
          const [retryGamePDA] = PublicKey.findProgramAddressSync(retrySeeds, PROGRAM_ID);
          
          console.log('🔄 Retry PDA:', retryGamePDA.toString(), 'with game number:', nextGameNumber);
          
          const retryTx = await program.methods
            .createGame(lobbyName, new BN(betAmountSol * LAMPORTS_PER_SOL))
            .accounts({
              game: retryGamePDA,
              platform: PLATFORM_PDA,
              creator: wallet.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .rpc();
          
          console.log('✅ Retry successful! TX:', retryTx);
          return { success: true, gameId: retryGamePDA.toString() };
          
        } catch (retryError: any) {
          console.error('❌ Retry also failed:', retryError);
          return { success: false, error: retryError.message || 'Failed to create game after retry' };
        }
      }
      
      return { success: false, error: error.message || 'Failed to create game' };
    }
  }

  // Join a game
  async joinGame(
    wallet: WalletContextState,
    gamePDA: PublicKey
  ): Promise<{ success: boolean; error?: string }> {
    const program = await this.initializeProgram(wallet);
    if (!program || !wallet.publicKey) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      console.log('👤 Joining game:', gamePDA.toString());

      const tx = await program.methods
        .joinGame()
        .accounts({
          game: gamePDA,
          player: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('✅ Joined game! TX:', tx);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Error joining game:', error);
      return { success: false, error: error.message || 'Failed to join game' };
    }
  }

  // Flip coin
  async flipCoin(
    wallet: WalletContextState,
    gamePDA: PublicKey,
    choice: 'heads' | 'tails'
  ): Promise<{ success: boolean; error?: string }> {
    const program = await this.initializeProgram(wallet);
    if (!program || !wallet.publicKey) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      const playerChoice = choice === 'heads' ? { heads: {} } : { tails: {} };

      console.log('🪙 Flipping coin with choice:', choice);

      const tx = await program.methods
        .flipCoin(playerChoice)
        .accounts({
          game: gamePDA,
          platform: PLATFORM_PDA,
          player: wallet.publicKey,
        })
        .rpc();

      console.log('✅ Coin flipped! TX:', tx);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Error flipping coin:', error);
      return { success: false, error: error.message || 'Failed to flip coin' };
    }
  }

  // Claim winnings
  async claimWinnings(
    wallet: WalletContextState,
    gamePDA: PublicKey
  ): Promise<{ success: boolean; error?: string }> {
    const program = await this.initializeProgram(wallet);
    if (!program || !wallet.publicKey) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      console.log('💰 Claiming winnings for game:', gamePDA.toString());

      const tx = await program.methods
        .claimWinnings()
        .accounts({
          game: gamePDA,
          winner: wallet.publicKey,
          feeWallet: FEE_WALLET,
          platform: PLATFORM_PDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('✅ Winnings claimed! TX:', tx);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Error claiming winnings:', error);
      return { success: false, error: error.message || 'Failed to claim winnings' };
    }
  }

  // Delete game
  async deleteGame(
    wallet: WalletContextState,
    gamePDA: PublicKey
  ): Promise<{ success: boolean; error?: string }> {
    const program = await this.initializeProgram(wallet);
    if (!program || !wallet.publicKey) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      console.log('🗑️ Deleting game:', gamePDA.toString());

      const tx = await program.methods
        .deleteGame()
        .accounts({
          game: gamePDA,
          platform: PLATFORM_PDA,
          creator: wallet.publicKey,
          feeWallet: FEE_WALLET,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('✅ Game deleted! TX:', tx);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Error deleting game:', error);
      return { success: false, error: error.message || 'Failed to delete game' };
    }
  }

  // FIXED: Correct platform vs game account detection
  async getActiveGames(): Promise<GameLobby[]> {
    if (!this.program) return [];

    try {
      console.log('🔍 Fetching active games...');
      
      // Get ALL program accounts
      const allAccounts = await this.connection.getProgramAccounts(PROGRAM_ID, {
        commitment: 'confirmed',
        encoding: 'base64'
      });
      console.log(`📊 Found ${allAccounts.length} total program accounts`);

      const games: GameLobby[] = [];
      
      for (const account of allAccounts) {
        try {
          console.log(`🔍 Checking account: ${account.pubkey.toString()}`);
          console.log(`   Data length: ${account.account.data.length}`);
          
          // Skip platform account by comparing PDA
          if (account.pubkey.equals(PLATFORM_PDA)) {
            console.log('⏭️ Skipping platform account:', account.pubkey.toString());
            continue;
          }

          // Try to decode as game account
          console.log('🎮 Trying to decode as game account...');
          const gameData = await this.program.account.game.fetch(account.pubkey);
          
          console.log('🎮 Successfully decoded game:', {
            pubkey: account.pubkey.toString(),
            lobbyName: gameData.lobbyName,
            status: gameData.status,
            creator: gameData.creator.toString(),
            betAmount: gameData.betAmount.toNumber() / LAMPORTS_PER_SOL,
            createdAt: gameData.createdAt.toNumber()
          });
          
          // Check if game is active or in progress
          if (gameData.status.active !== undefined || gameData.status.inProgress !== undefined) {
            const status = gameData.status.active !== undefined ? 'active' : 'in_progress';
            
            games.push({
              id: account.pubkey.toString(),
              creator: gameData.creator.toString(),
              lobbyName: gameData.lobbyName,
              betAmount: gameData.betAmount.toNumber() / LAMPORTS_PER_SOL,
              betAmountEur: 0, // Will be calculated in frontend
              createdAt: new Date(gameData.createdAt.toNumber() * 1000),
              status: status,
              player: gameData.player?.toString(),
              winner: gameData.winner?.toString(),
              result: gameData.result ? (gameData.result.heads ? 'heads' : 'tails') : undefined,
              choice: gameData.playerChoice ? (gameData.playerChoice.heads ? 'heads' : 'tails') : undefined,
            });
          } else {
            console.log('⚠️ Game has finished/unknown status:', gameData.status);
          }
        } catch (err) {
          // This account is not a game account
          console.log('⚠️ Could not decode account as game:', account.pubkey.toString());
          continue;
        }
      }

      console.log(`✅ Found ${games.length} active games`);
      return games.sort((a, b) => b.betAmount - a.betAmount);
    } catch (error) {
      console.error('❌ Error fetching active games:', error);
      return [];
    }
  }

  // Get finished games - TODO: implement proper storage/indexing
  async getFinishedGames(): Promise<FinishedGame[]> {
    if (!this.program) return [];

    try {
      // For now, return empty array since finished games are claimed and accounts closed
      console.log('📜 Finished games: Using empty array for now (accounts are closed)');
      return [];
    } catch (error) {
      console.error('❌ Error fetching finished games:', error);
      return [];
    }
  }

  // Get platform stats with better error handling
  async getPlatformStats(): Promise<GameStats> {
    try {
      if (!this.program) {
        console.log('⚠️ No program initialized for stats');
        return {
          activeGames: 0,
          totalVolume: 0,
          totalVolumeEur: 0,
          gamesPlayed: 0
        };
      }

      const platformData = await this.program.account.platform.fetch(PLATFORM_PDA);
      console.log('📊 Platform stats:', {
        totalGames: platformData.totalGames.toNumber(),
        activeGames: platformData.activeGames.toNumber(),
        totalVolume: platformData.totalVolume.toNumber() / LAMPORTS_PER_SOL
      });
      
      return {
        activeGames: platformData.activeGames.toNumber(),
        totalVolume: platformData.totalVolume.toNumber() / LAMPORTS_PER_SOL,
        totalVolumeEur: 0, // Will be calculated in frontend
        gamesPlayed: platformData.totalGames.toNumber()
      };
    } catch (error) {
      console.error('❌ Error fetching platform stats:', error);
      return {
        activeGames: 0,
        totalVolume: 0,
        totalVolumeEur: 0,
        gamesPlayed: 0
      };
    }
  }

  // Get wallet balance
  async getWalletBalance(publicKey: PublicKey): Promise<number> {
    try {
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('❌ Error fetching wallet balance:', error);
      return 0;
    }
  }

  // Request airdrop for devnet testing
  async requestAirdrop(publicKey: PublicKey, amount: number = 1): Promise<boolean> {
    try {
      console.log(`💧 Requesting ${amount} SOL airdrop for:`, publicKey.toString());
      
      const signature = await this.connection.requestAirdrop(
        publicKey,
        amount * LAMPORTS_PER_SOL
      );
      
      console.log('⏳ Waiting for airdrop confirmation...');
      await this.connection.confirmTransaction(signature, 'confirmed');
      
      console.log('✅ Airdrop confirmed!');
      return true;
    } catch (error) {
      console.error('❌ Error requesting airdrop:', error);
      return false;
    }
  }

  // Get game data by PDA
  async getGameData(gamePDA: PublicKey): Promise<any> {
    try {
      if (!this.program) return null;
      const gameData = await this.program.account.game.fetch(gamePDA);
      console.log('🎮 Game data:', gameData);
      return gameData;
    } catch (error) {
      console.error('❌ Error fetching game data:', error);
      return null;
    }
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();