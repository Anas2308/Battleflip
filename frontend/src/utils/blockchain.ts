import { Connection, PublicKey, SystemProgram, LAMPORTS_PER_SOL, clusterApiUrl } from '@solana/web3.js';
import { Program, AnchorProvider, BN, setProvider } from '@coral-xyz/anchor';
import type{ WalletContextState } from '@solana/wallet-adapter-react';
import type { GameLobby, FinishedGame, GameStats } from '../types';

// Program ID from deployment
export const PROGRAM_ID = new PublicKey('FdMcUSR2SwzBGEGrxMYvRx56iHn3GprjkdLCDzD9engk');

// Fee wallet 
export const FEE_WALLET = new PublicKey('HQre2z3L5eLdt9MCjLdkdo7pjqozrbD8epqJ6k7RNGxT');

// Platform PDA
export const [PLATFORM_PDA] = PublicKey.findProgramAddressSync(
  [Buffer.from('platform')],
  PROGRAM_ID
);

// Fee calculation constants
export const POT_PERCENTAGE = 97.5; // 97.5% goes to pot
export const FEE_PERCENTAGE = 2.5;  // 2.5% goes to platform

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

  // Calculate pot and fee amounts
  private calculateAmounts(betAmountSol: number) {
    const betAmountLamports = betAmountSol * LAMPORTS_PER_SOL;
    const potAmountLamports = Math.floor(betAmountLamports * POT_PERCENTAGE / 100);
    const feeAmountLamports = betAmountLamports - potAmountLamports; // Remainder to avoid rounding issues
    
    return {
      betAmountLamports,
      potAmountLamports,
      feeAmountLamports,
      potAmountSol: potAmountLamports / LAMPORTS_PER_SOL,
      feeAmountSol: feeAmountLamports / LAMPORTS_PER_SOL
    };
  }

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
      const amounts = this.calculateAmounts(betAmountSol);
      
      console.log('🎮 Creating game with fee split:');
      console.log(`  User pays: ${betAmountSol} SOL`);
      console.log(`  Pot gets: ${amounts.potAmountSol.toFixed(6)} SOL (${POT_PERCENTAGE}%)`);
      console.log(`  Fee wallet: ${amounts.feeAmountSol.toFixed(6)} SOL (${FEE_PERCENTAGE}%)`);
      
      // Get platform state for PDA calculation
      const platformData = await program.account.platform.fetch(PLATFORM_PDA);
      const currentTotalGames = platformData.totalGames;
      
      // Calculate game PDA
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
      
      // Check for race condition
      const existingAccount = await this.connection.getAccountInfo(gamePDA);
      if (existingAccount) {
        return { 
          success: false, 
          error: 'Game with this name already exists. Try a different name.' 
        };
      }
      
      const betAmountLamportsBN = new BN(amounts.betAmountLamports);
      
      const tx = await program.methods
        .createGame(lobbyName, betAmountLamportsBN)
        .accounts({
          game: gamePDA,
          platform: PLATFORM_PDA,
          creator: wallet.publicKey,
          feeWallet: FEE_WALLET,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ commitment: 'confirmed' });

      console.log('✅ Game created successfully!');
      console.log('  Transaction:', tx);
      console.log('  Game PDA:', gamePDA.toString());
      
      return { success: true, gameId: gamePDA.toString() };

    } catch (error: any) {
      console.error('❌ Error creating game:', error);
      return { success: false, error: error.message || 'Failed to create game' };
    }
  }

  async joinGame(
    wallet: WalletContextState,
    gamePDA: PublicKey
  ): Promise<{ success: boolean; error?: string }> {
    const program = await this.initializeProgram(wallet);
    if (!program || !wallet.publicKey) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      // Get game data to know the bet amount
      const gameData = await program.account.game.fetch(gamePDA);
      const betAmountLamports = gameData.betAmount.toNumber();
      const amounts = this.calculateAmounts(betAmountLamports / LAMPORTS_PER_SOL);
      
      console.log('👤 Joining game with fee split:');
      console.log(`  User pays: ${betAmountLamports / LAMPORTS_PER_SOL} SOL`);
      console.log(`  Pot gets: ${amounts.potAmountSol.toFixed(6)} SOL (${POT_PERCENTAGE}%)`);
      console.log(`  Fee wallet: ${amounts.feeAmountSol.toFixed(6)} SOL (${FEE_PERCENTAGE}%)`);

      const tx = await program.methods
        .joinGame()
        .accounts({
          game: gamePDA,
          player: wallet.publicKey,
          platform: PLATFORM_PDA,
          feeWallet: FEE_WALLET,
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
            
            // Calculate amounts
            const singleBetSol = gameData.betAmount.toNumber() / LAMPORTS_PER_SOL;
            const amounts = this.calculateAmounts(singleBetSol);
            
            games.push({
              id: account.pubkey.toString(),
              creator: gameData.creator.toString(),
              lobbyName: gameData.lobbyName,
              betAmount: singleBetSol, // Original bet amount for display
              potAmount: amounts.potAmountSol, // Actual pot amount per player
              totalPot: amounts.potAmountSol * 2, // ✅ FIXED: Always total pot from both players
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

  // ✅ FIXED: Calculate total pot correctly
  calculateTotalPot(betAmountSol: number): number {
    const amounts = this.calculateAmounts(betAmountSol);
    return amounts.potAmountSol * 2; // Both players' pot contributions
  }

  // ✅ FIXED: Winner gets the full pot (no additional fee)
  calculateWinnerPayout(betAmountSol: number): number {
    return this.calculateTotalPot(betAmountSol); // Winner gets the entire pot
  }

  // Debug function for fee calculations
  debugFeeCalculation(betAmountSol: number): void {
    const amounts = this.calculateAmounts(betAmountSol);
    console.log('💰 Fee Calculation Debug:');
    console.log(`  Input: ${betAmountSol} SOL`);
    console.log(`  Pot: ${amounts.potAmountSol.toFixed(6)} SOL (${POT_PERCENTAGE}%)`);
    console.log(`  Fee: ${amounts.feeAmountSol.toFixed(6)} SOL (${FEE_PERCENTAGE}%)`);
    console.log(`  Total Pot (2 players): ${(amounts.potAmountSol * 2).toFixed(6)} SOL`);
    console.log(`  Winner gets: ${(amounts.potAmountSol * 2).toFixed(6)} SOL`);
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
      
      // 1. Platform State
      const platformData = await this.program.account.platform.fetch(PLATFORM_PDA);
      console.log('📊 Platform State:');
      console.log('  Authority:', platformData.authority.toString());
      console.log('  Fee Wallet:', platformData.feeWallet.toString());
      console.log('  Total Games:', platformData.totalGames.toString());
      console.log('  Active Games:', platformData.activeGames.toString());
      
      // 2. PDA Calculation
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
      
      // 3. Account Check
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