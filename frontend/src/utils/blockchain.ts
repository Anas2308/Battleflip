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

// IDL Interface - simplified
interface BattleflipIDL {
  version: string;
  name: string;
  instructions: any[];
  accounts: any[];
  types: any[];
}

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

  // Create a new game
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
      // Get platform data to get game count
      const platformData = await program.account.platform.fetch(PLATFORM_PDA);
      const gameCount = platformData.totalGames;

      // Calculate game PDA with a unique seed (adding timestamp for uniqueness)
      const uniqueSeed = Date.now().toString();
      const [gamePDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('game'),
          PLATFORM_PDA.toBuffer(),
          gameCount.toArrayLike(Buffer, 'le', 8),
          Buffer.from(uniqueSeed)
        ],
        PROGRAM_ID
      );

      const betAmountLamports = new BN(betAmountSol * LAMPORTS_PER_SOL);

      const tx = await program.methods
        .createGame(lobbyName, betAmountLamports)
        .accounts({
          game: gamePDA,
          platform: PLATFORM_PDA,
          creator: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('Game created:', tx);
      return { success: true, gameId: gamePDA.toString() };
    } catch (error: any) {
      console.error('Error creating game:', error);
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
      const tx = await program.methods
        .joinGame()
        .accounts({
          game: gamePDA,
          player: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('Joined game:', tx);
      return { success: true };
    } catch (error: any) {
      console.error('Error joining game:', error);
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

      const tx = await program.methods
        .flipCoin(playerChoice)
        .accounts({
          game: gamePDA,
          platform: PLATFORM_PDA,
          player: wallet.publicKey,
        })
        .rpc();

      console.log('Coin flipped:', tx);
      return { success: true };
    } catch (error: any) {
      console.error('Error flipping coin:', error);
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

      console.log('Winnings claimed:', tx);
      return { success: true };
    } catch (error: any) {
      console.error('Error claiming winnings:', error);
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

      console.log('Game deleted:', tx);
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting game:', error);
      return { success: false, error: error.message || 'Failed to delete game' };
    }
  }

  // Get all active games - simplified approach
  async getActiveGames(): Promise<GameLobby[]> {
    if (!this.program) return [];

    try {
      console.log('🔍 Fetching active games...');
      
      // Get ALL program accounts (not filtered by size)
      const allAccounts = await this.connection.getProgramAccounts(PROGRAM_ID);
      console.log(`📊 Found ${allAccounts.length} total program accounts`);

      const games: GameLobby[] = [];
      
      for (const account of allAccounts) {
        try {
          // Try to decode as game account
          const gameData = await this.program.account.game.fetch(account.pubkey);
          console.log('🎮 Found game:', {
            pubkey: account.pubkey.toString(),
            lobbyName: gameData.lobbyName,
            status: gameData.status,
            creator: gameData.creator.toString()
          });
          
          // Check if game is active (any status that's not finished)
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
            });
          }
        } catch (err) {
          // This account is not a game account (might be platform account)
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

  // Get finished games - simplified approach
  async getFinishedGames(): Promise<FinishedGame[]> {
    if (!this.program) return [];

    try {
      // For now, return empty array - finished games are claimed and closed
      // In a production app, you'd want to store this data elsewhere
      return [];
    } catch (error) {
      console.error('Error fetching finished games:', error);
      return [];
    }
  }

  // Get platform stats
  async getPlatformStats(): Promise<GameStats> {
    try {
      if (!this.program) {
        console.log('⚠️ No program initialized');
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
      console.error('Error fetching wallet balance:', error);
      return 0;
    }
  }

  // Request airdrop for devnet testing
  async requestAirdrop(publicKey: PublicKey, amount: number = 1): Promise<boolean> {
    try {
      const signature = await this.connection.requestAirdrop(
        publicKey,
        amount * LAMPORTS_PER_SOL
      );
      await this.connection.confirmTransaction(signature);
      return true;
    } catch (error) {
      console.error('Error requesting airdrop:', error);
      return false;
    }
  }

  // Get game data by PDA
  async getGameData(gamePDA: PublicKey): Promise<any> {
    try {
      if (!this.program) return null;
      return await this.program.account.game.fetch(gamePDA);
    } catch (error) {
      console.error('Error fetching game data:', error);
      return null;
    }
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();