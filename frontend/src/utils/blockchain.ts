import { Connection, PublicKey, SystemProgram, LAMPORTS_PER_SOL, clusterApiUrl } from '@solana/web3.js';
import { Program, AnchorProvider, BN, setProvider } from '@coral-xyz/anchor';
import type{ WalletContextState } from '@solana/wallet-adapter-react';
import type { GameLobby, FinishedGame, GameStats } from '../types';

// Program ID from deployment
export const PROGRAM_ID = new PublicKey('4CY8DBf7XJ1ffFfV1aNBpgZnGvRuuGDQtJACsgMqWoh8');

// Fee wallet 
export const FEE_WALLET = new PublicKey('HQre2z3L5eLdt9MCjLdkdo7pjqozrbD8epqJ6k7RNGxT');

// Platform PDA
export const [PLATFORM_PDA] = PublicKey.findProgramAddressSync(
  [Buffer.from('platform')],
  PROGRAM_ID
);

// Fee calculation constants (for reference - fee now deducted at claim time)
export const FEE_PERCENTAGE = 2.5;  // 2.5% goes to platform (deducted when claiming)

export class BlockchainService {
  private connection: Connection;
  private program: any = null;

  constructor() {
    this.connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  }

  async initializeProgram(wallet: WalletContextState): Promise<any> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      return null;
    }

    try {
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

  async isPlatformInitialized(): Promise<boolean> {
    try {
      const platformAccount = await this.connection.getAccountInfo(PLATFORM_PDA);
      return platformAccount !== null;
    } catch (error) {
      console.error('Error checking platform initialization:', error);
      return false;
    }
  }

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

  // ✅ FIXED: createGame - Only 1 transfer, no fee split
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
      const betAmountLamports = betAmountSol * LAMPORTS_PER_SOL;
      
      console.log('🎮 Creating game:');
      console.log(`  User pays: ${betAmountSol} SOL`);
      console.log(`  (Fee will be deducted when winner claims)`);
      
      const platformData = await program.account.platform.fetch(PLATFORM_PDA);
      const currentTotalGames = platformData.totalGames;
      
      const [gamePDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('game'),
          PLATFORM_PDA.toBuffer(),
          currentTotalGames.toArrayLike(Buffer, 'le', 8),
          wallet.publicKey.toBuffer(),
          Buffer.from(lobbyName)
        ],
        PROGRAM_ID
      );
      
      const existingAccount = await this.connection.getAccountInfo(gamePDA);
      if (existingAccount) {
        return { 
          success: false, 
          error: 'Game with this name already exists. Try a different name.' 
        };
      }
      
      const betAmountLamportsBN = new BN(betAmountLamports);
      
      // ✅ REMOVED: feeWallet from accounts
      const tx = await program.methods
        .createGame(lobbyName, betAmountLamportsBN)
        .accounts({
          game: gamePDA,
          platform: PLATFORM_PDA,
          creator: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc({
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          commitment: 'confirmed',
        });

      console.log('✅ Transaction sent:', tx);
      await this.connection.confirmTransaction(tx, 'confirmed');
      console.log('✅ Game created successfully!');
      console.log('  Transaction:', tx);
      console.log('  Game PDA:', gamePDA.toString());
      
      return { success: true, gameId: gamePDA.toString() };

    } catch (error: any) {
      console.error('❌ Error creating game:', error);
      
      let errorMessage = 'Failed to create game';
      if (error.message?.includes('User rejected')) {
        errorMessage = 'Transaction was rejected by user';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient SOL balance';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    }
  }

  // ✅ FIXED: joinGame - Only 1 transfer, no fee split
  async joinGame(
    wallet: WalletContextState,
    gamePDA: PublicKey
  ): Promise<{ success: boolean; error?: string }> {
    const program = await this.initializeProgram(wallet);
    if (!program || !wallet.publicKey) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      const gameData = await program.account.game.fetch(gamePDA);
      const betAmountLamports = gameData.betAmount.toNumber();
      const betAmountSol = betAmountLamports / LAMPORTS_PER_SOL;
      
      console.log('👤 Joining game:');
      console.log(`  User pays: ${betAmountSol} SOL`);
      console.log(`  (Fee will be deducted when winner claims)`);

      // ✅ REMOVED: platform and feeWallet from accounts
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

  // ✅ FIXED: claimWinnings - Added platform and feeWallet (fee deducted here)
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

      // ✅ ADDED: platform and feeWallet accounts
      const tx = await program.methods
        .claimWinnings()
        .accounts({
          game: gamePDA,
          winner: wallet.publicKey,
          platform: PLATFORM_PDA,
          feeWallet: FEE_WALLET,
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

  async getActiveGames(): Promise<GameLobby[]> {
    if (!this.program) return [];

    try {
      console.log('🔍 Fetching active games...');
      
      const allAccounts = await this.connection.getProgramAccounts(PROGRAM_ID, {
        commitment: 'confirmed',
        encoding: 'base64'
      });

      const games: GameLobby[] = [];
      
      for (const account of allAccounts) {
        try {
          if (account.pubkey.equals(PLATFORM_PDA)) {
            continue;
          }

          const gameData = await this.program.account.game.fetch(account.pubkey);
          
          if (gameData.status.active !== undefined || gameData.status.inProgress !== undefined) {
            const status = gameData.status.active !== undefined ? 'active' : 'in_progress';
            
            // ✅ SIMPLIFIED: bet_amount is now the full amount each player pays
            const singleBetSol = gameData.betAmount.toNumber() / LAMPORTS_PER_SOL;
            const totalPot = singleBetSol * 2; // Total from both players
            const winnerPayout = totalPot * (1 - FEE_PERCENTAGE / 100); // After fee deduction
            
            games.push({
              id: account.pubkey.toString(),
              creator: gameData.creator.toString(),
              lobbyName: gameData.lobbyName,
              betAmount: singleBetSol,
              potAmount: singleBetSol, // Each player's contribution
              totalPot: winnerPayout, // What winner actually gets (after 2.5% fee)
              betAmountEur: 0,
              createdAt: new Date(gameData.createdAt.toNumber() * 1000),
              status: status,
              player: gameData.player?.toString(),
              winner: gameData.winner?.toString(),
              result: gameData.result ? (gameData.result.heads ? 'heads' : 'tails') : undefined,
              choice: gameData.playerChoice ? (gameData.playerChoice.heads ? 'heads' : 'tails') : undefined,
            });
          }
        } catch (err) {
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

  async getFinishedGames(): Promise<FinishedGame[]> {
    if (!this.program) return [];

    try {
      console.log('📜 Finished games: Using empty array for now (accounts are closed)');
      return [];
    } catch (error) {
      console.error('❌ Error fetching finished games:', error);
      return [];
    }
  }

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
        totalVolumeEur: 0,
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

  async getWalletBalance(publicKey: PublicKey): Promise<number> {
    try {
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('❌ Error fetching wallet balance:', error);
      return 0;
    }
  }

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

  // ✅ UPDATED: Simplified total pot calculation
  calculateTotalPot(betAmountSol: number): number {
    const totalFromBothPlayers = betAmountSol * 2;
    return totalFromBothPlayers * (1 - FEE_PERCENTAGE / 100); // After fee
  }

  // ✅ UPDATED: Winner payout is total pot after fee
  calculateWinnerPayout(betAmountSol: number): number {
    return this.calculateTotalPot(betAmountSol);
  }

  // Debug function for fee calculations
  debugFeeCalculation(betAmountSol: number): void {
    const totalPot = betAmountSol * 2;
    const fee = totalPot * (FEE_PERCENTAGE / 100);
    const winnerGets = totalPot - fee;
    
    console.log('💰 Fee Calculation Debug (NEW SYSTEM):');
    console.log(`  Each player pays: ${betAmountSol} SOL`);
    console.log(`  Total pot: ${totalPot} SOL`);
    console.log(`  Platform fee (${FEE_PERCENTAGE}%): ${fee.toFixed(6)} SOL`);
    console.log(`  Winner gets: ${winnerGets.toFixed(6)} SOL`);
  }

  // Debug function
  async debugPlatformState(): Promise<void> {
    try {
      if (!this.program) {
        console.log('⚠️ No program initialized');
        return;
      }

      console.log('🔍 DEBUG: Platform State Analysis');
      console.log('Platform PDA:', PLATFORM_PDA.toString());
      console.log('Program ID:', PROGRAM_ID.toString());

      const platformAccount = await this.connection.getAccountInfo(PLATFORM_PDA);
      
      if (!platformAccount) {
        console.log('❌ Platform account does not exist!');
        return;
      }

      const platformData = await this.program.account.platform.fetch(PLATFORM_PDA);
      console.log('✅ Platform Data:');
      console.log('  Authority:', platformData.authority.toString());
      console.log('  Fee Wallet:', platformData.feeWallet.toString());
      console.log('  Total Games:', platformData.totalGames.toNumber());
      console.log('  Active Games:', platformData.activeGames.toNumber());
      console.log('  Total Volume:', platformData.totalVolume.toNumber() / LAMPORTS_PER_SOL, 'SOL');

    } catch (error) {
      console.error('❌ Error in debug:', error);
    }
  }

  // Additional debug function for game creation
  async debugGameCreation(lobbyName: string, wallet: WalletContextState): Promise<void> {
    if (!this.program || !wallet.publicKey) return;
    
    try {
      console.log('🔍 DEBUG: Game Creation Analysis');
      console.log('=====================================');
      
      const platformData = await this.program.account.platform.fetch(PLATFORM_PDA);
      console.log('📊 Platform State:');
      console.log('  Authority:', platformData.authority.toString());
      console.log('  Fee Wallet:', platformData.feeWallet.toString());
      console.log('  Total Games:', platformData.totalGames.toString());
      console.log('  Active Games:', platformData.activeGames.toString());
      
      const [calculatedPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('game'),
          PLATFORM_PDA.toBuffer(),
          platformData.totalGames.toArrayLike(Buffer, 'le', 8),
          wallet.publicKey.toBuffer(),
          Buffer.from(lobbyName)
        ],
        PROGRAM_ID
      );
      
      console.log('🎯 PDA Calculation:');
      console.log('  Expected PDA:', calculatedPDA.toString());
      console.log('  Seeds:');
      console.log('    - game: "game"');
      console.log('    - platform:', PLATFORM_PDA.toString());
      console.log('    - total_games:', platformData.totalGames.toString());
      console.log('    - creator:', wallet.publicKey.toString());
      console.log('    - lobby_name:', lobbyName);
      
      const accountInfo = await this.connection.getAccountInfo(calculatedPDA);
      console.log('📁 Account Status:');
      console.log('  Exists:', accountInfo !== null);
      if (accountInfo) {
        console.log('  Data length:', accountInfo.data.length);
        console.log('  Owner:', accountInfo.owner.toString());
      }
      
    } catch (error) {
      console.error('❌ Debug error:', error);
    }
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();