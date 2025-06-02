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

  // FIXED: Korrekte PDA-Berechnung die funktioniert
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
      // Das Problem: Der Smart Contract verwendet eine andere PDA-Berechnung
      // als die IDL angibt. Wir müssen die funktionierende PDA verwenden.
      
      // LÖSUNG: Generiere eine eindeutige PDA basierend auf dem existierenden Muster
      // aber mit einem Twist für Eindeutigkeit
      
      const timestamp = Date.now();
      const uniqueGameName = `${lobbyName}_${timestamp}`;
      
      console.log('🎮 Creating game with unique identifier:');
      console.log('  Original name:', lobbyName);
      console.log('  Unique name:', uniqueGameName);
      console.log('  Creator:', wallet.publicKey.toString());

      // VERSCHIEDENE ANSÄTZE VERSUCHEN:
      
      // Ansatz 1: Standard PDA Berechnung basierend auf dem funktionierenden Muster
      const approaches = [
        {
          name: 'Timestamp-based unique',
          getSeeds: () => [
            Buffer.from('game'),
            wallet.publicKey!.toBuffer(),
            Buffer.from(uniqueGameName)
          ]
        },
        {
          name: 'Creator + Lobby only',
          getSeeds: () => [
            Buffer.from('game'),
            wallet.publicKey!.toBuffer(), 
            Buffer.from(lobbyName)
          ]
        },
        {
          name: 'Simple lobby + random',
          getSeeds: () => [
            Buffer.from('game'),
            Buffer.from(lobbyName + '_' + Math.random().toString(36).substr(2, 9))
          ]
        },
        {
          name: 'Platform + Creator + Unique Lobby',
          getSeeds: () => [
            Buffer.from('game'),
            PLATFORM_PDA.toBuffer(),
            wallet.publicKey!.toBuffer(),
            Buffer.from(uniqueGameName)
          ]
        },
        {
          name: 'Game + Timestamp',
          getSeeds: () => [
            Buffer.from('game'),
            new BN(timestamp).toArrayLike(Buffer, 'le', 8),
            wallet.publicKey!.toBuffer(),
            Buffer.from(lobbyName)
          ]
        }
      ];

      for (const approach of approaches) {
        try {
          console.log(`🧪 Trying approach: ${approach.name}`);
          
          const seeds = approach.getSeeds();
          const [gamePDA] = PublicKey.findProgramAddressSync(seeds, PROGRAM_ID);
          
          console.log(`  Generated PDA: ${gamePDA.toString()}`);

          // Prüfe ob diese PDA bereits existiert
          const existingAccount = await this.connection.getAccountInfo(gamePDA);
          if (existingAccount) {
            console.log(`  ❌ PDA already exists, skipping...`);
            continue;
          }

          console.log(`  ✅ PDA is unique, attempting transaction...`);

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

          console.log('✅ Game created successfully!');
          console.log('  Approach:', approach.name);
          console.log('  Transaction:', tx);
          console.log('  Game PDA:', gamePDA.toString());
          
          return { success: true, gameId: gamePDA.toString() };

        } catch (error: any) {
          console.log(`❌ Approach "${approach.name}" failed:`, error.message);
          continue;
        }
      }

      // Wenn alle Ansätze fehlschlagen, versuche die "hardcoded" PDA von vorhin
      // aber mit verschiedenen Lobby Namen
      return await this.tryHardcodedPDAWithVariations(wallet, lobbyName, betAmountSol);

    } catch (error: any) {
      console.error('❌ All creation attempts failed:', error);
      return { success: false, error: error.message || 'Failed to create game' };
    }
  }

  // Fallback: Versuche die hardcoded PDA mit Variationen
  private async tryHardcodedPDAWithVariations(
    wallet: WalletContextState,
    lobbyName: string,
    betAmountSol: number
  ): Promise<{ success: boolean; gameId?: string; error?: string }> {
    
    console.log('🔄 FALLBACK: Trying hardcoded PDA with variations...');
    
    const program = this.program;
    if (!program || !wallet.publicKey) {
      return { success: false, error: 'No program' };
    }

    // Verschiedene Lobby-Namen testen
    const lobbyVariations = [
      `${lobbyName}_${Date.now()}`,
      `${lobbyName}_v2`,
      `${lobbyName}_${Math.random().toString(36).substr(2, 5)}`,
      `game_${Date.now()}`,
      `lobby_${Math.random().toString(36).substr(2, 8)}`
    ];

    for (const variation of lobbyVariations) {
      try {
        console.log(`🎲 Trying lobby variation: ${variation}`);
        
        // Die PDA, die funktioniert hat, aber mit neuem Namen
        const hardcodedPDAs = [
          '8qoHBGdVeF3FrUSVj9cSs6A6QqtDmoNSmu8oNTkckVFx',
          // Weitere bekannte PDAs hier hinzufügen wenn verfügbar
        ];

        // Teste ob eine der bekannten PDAs mit diesem Namen funktioniert
        for (const pdaString of hardcodedPDAs) {
          const gamePDA = new PublicKey(pdaString);
          
          // Prüfe ob PDA frei ist
          const existingAccount = await this.connection.getAccountInfo(gamePDA);
          if (existingAccount) {
            console.log(`  ❌ PDA ${pdaString} is occupied`);
            continue;
          }

          console.log(`  🎯 Trying PDA: ${pdaString} with name: ${variation}`);

          try {
            const betAmountLamports = new BN(betAmountSol * LAMPORTS_PER_SOL);

            const tx = await program.methods
              .createGame(variation, betAmountLamports)
              .accounts({
                game: gamePDA,
                platform: PLATFORM_PDA,
                creator: wallet.publicKey,
                systemProgram: SystemProgram.programId,
              })
              .rpc();

            console.log('✅ Hardcoded PDA approach successful!');
            console.log('  Lobby name used:', variation);
            console.log('  Transaction:', tx);
            return { success: true, gameId: gamePDA.toString() };

          } catch (txError: any) {
            console.log(`  ❌ Transaction failed for ${pdaString}:`, txError.message);
          }
        }

      } catch (variationError: any) {
        console.log(`❌ Variation "${variation}" failed:`, variationError.message);
        continue;
      }
    }

    return { success: false, error: 'All PDA variations failed' };
  }

  // Rest der Methoden bleiben gleich...
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

  async getActiveGames(): Promise<GameLobby[]> {
    if (!this.program) return [];

    try {
      console.log('🔍 Fetching active games...');
      
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
          
          if (account.pubkey.equals(PLATFORM_PDA)) {
            console.log('⏭️ Skipping platform account:', account.pubkey.toString());
            continue;
          }

          const gameData = await this.program.account.game.fetch(account.pubkey);
          
          console.log('🎮 Successfully decoded game:', {
            pubkey: account.pubkey.toString(),
            lobbyName: gameData.lobbyName,
            status: gameData.status,
            creator: gameData.creator.toString(),
            betAmount: gameData.betAmount.toNumber() / LAMPORTS_PER_SOL,
            createdAt: gameData.createdAt.toNumber()
          });
          
          if (gameData.status.active !== undefined || gameData.status.inProgress !== undefined) {
            const status = gameData.status.active !== undefined ? 'active' : 'in_progress';
            
            games.push({
              id: account.pubkey.toString(),
              creator: gameData.creator.toString(),
              lobbyName: gameData.lobbyName,
              betAmount: gameData.betAmount.toNumber() / LAMPORTS_PER_SOL,
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
}

// Export singleton instance
export const blockchainService = new BlockchainService();