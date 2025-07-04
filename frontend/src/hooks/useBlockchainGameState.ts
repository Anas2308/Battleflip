import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import type { GameLobby, FinishedGame, GameStats, CoinSide } from '../types';
import { blockchainService } from '../utils/blockchain';
import { 
  getSolToEurRate, 
  getMinimumBetInSol, 
  validateBetAmount, 
  validateLobbyName,
  solToEur
} from '../utils';
import { 
  loadFinishedGames, 
  saveActiveGamesSnapshot,
  loadActiveGamesSnapshot,
  detectFinishedGames,
  processDetectedFinishedGames,
  addFinishedGame, 
  cleanupOldGames,
  createFinishedGameFromResult 
} from '../utils/gameHistory';

export const useBlockchainGameState = () => {
  const wallet = useWallet();
  
  // State
  const [activeGames, setActiveGames] = useState<GameLobby[]>([]);
  const [finishedGames, setFinishedGames] = useState<FinishedGame[]>([]);
  const [gameStats, setGameStats] = useState<GameStats>({
    activeGames: 0,
    totalVolume: 0,
    totalVolumeEur: 0,
    gamesPlayed: 0
  });
  
  const [solEurRate, setSolEurRate] = useState<number>(180);
  const [minBetSol, setMinBetSol] = useState<number>(0.003);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [platformInitialized, setPlatformInitialized] = useState<boolean>(false);

  // Load finished games from localStorage on mount
  useEffect(() => {
    const loadLocalFinishedGames = () => {
      try {
        const localGames = cleanupOldGames(); // This also loads and cleans
        
        // Add EUR conversion
        const gamesWithEur = localGames.map(game => ({
          ...game,
          betAmountEur: solToEur(game.betAmount, solEurRate)
        }));
        
        setFinishedGames(gamesWithEur);
        console.log(`📜 Loaded ${localGames.length} finished games from localStorage`);
      } catch (error) {
        console.error('Error loading local finished games:', error);
      }
    };

    loadLocalFinishedGames();
  }, [solEurRate]);

  // Initialize when wallet connects
  useEffect(() => {
    const initializeBlockchain = async () => {
      if (wallet.connected && wallet.publicKey) {
        try {
          setLoading(true);
          
          // Initialize program
          await blockchainService.initializeProgram(wallet);
          
          // Check if platform is initialized
          const isInitialized = await blockchainService.isPlatformInitialized();
          setPlatformInitialized(isInitialized);
          
          // Get wallet balance
          const balance = await blockchainService.getWalletBalance(wallet.publicKey);
          setWalletBalance(balance);
          
          // Load initial data
          await Promise.all([
            loadActiveGames(),
            loadGameStats()
          ]);
          
        } catch (err) {
          console.error('Error initializing blockchain:', err);
          setError('Failed to connect to blockchain');
        } finally {
          setLoading(false);
        }
      } else {
        // Reset state when wallet disconnects
        setActiveGames([]);
        setGameStats({
          activeGames: 0,
          totalVolume: 0,
          totalVolumeEur: 0,
          gamesPlayed: 0
        });
        setWalletBalance(0);
        setPlatformInitialized(false);
      }
    };

    initializeBlockchain();
  }, [wallet.connected, wallet.publicKey]);

  // Initialize exchange rate and minimum bet
  useEffect(() => {
    const initializeRates = async () => {
      try {
        const rate = await getSolToEurRate();
        const minBet = await getMinimumBetInSol();
        setSolEurRate(rate);
        setMinBetSol(minBet);
      } catch (err) {
        console.error('Failed to fetch exchange rates:', err);
        setError('Failed to fetch exchange rates');
      }
    };

    initializeRates();
    
    // Update rates every 5 minutes
    const interval = setInterval(initializeRates, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Load active games from blockchain and detect finished games
  const loadActiveGames = useCallback(async () => {
    try {
      console.log('🔍 Loading active games and detecting finished games...');
      
      // Get previous snapshot
      const previousSnapshot = loadActiveGamesSnapshot();
      
      // Get current active games
      const games = await blockchainService.getActiveGames();
      
      // Add EUR conversion
      const gamesWithEur = games.map(game => ({
        ...game,
        betAmountEur: solToEur(game.betAmount, solEurRate)
      }));
      
      // Detect newly finished games
      const detectedFinishedGames = detectFinishedGames(gamesWithEur, previousSnapshot);
      
      // Process detected finished games
      if (detectedFinishedGames.length > 0) {
        console.log(`🎯 Processing ${detectedFinishedGames.length} newly finished games`);
        const updatedFinishedGames = processDetectedFinishedGames(detectedFinishedGames, solEurRate);
        
        // Update finished games state
        const gamesWithEurFinished = updatedFinishedGames.map(game => ({
          ...game,
          betAmountEur: solToEur(game.betAmount, solEurRate)
        }));
        setFinishedGames(gamesWithEurFinished);
      }
      
      // Save current games as new snapshot
      saveActiveGamesSnapshot(gamesWithEur);
      
      // Update active games state
      setActiveGames(gamesWithEur);
      
      console.log(`✅ Loaded ${gamesWithEur.length} active games, detected ${detectedFinishedGames.length} finished games`);
      
    } catch (err) {
      console.error('Error loading active games:', err);
    }
  }, [solEurRate]);

  // Load platform stats
  const loadGameStats = useCallback(async () => {
    try {
      const stats = await blockchainService.getPlatformStats();
      
      const statsWithEur = {
        ...stats,
        totalVolumeEur: solToEur(stats.totalVolume, solEurRate)
      };
      
      setGameStats(statsWithEur);
    } catch (err) {
      console.error('Error loading game stats:', err);
    }
  }, [solEurRate]);

  // Initialize platform (one-time setup)
  const initializePlatform = useCallback(async (): Promise<boolean> => {
    if (!wallet.connected || !wallet.publicKey) {
      setError('Wallet not connected');
      return false;
    }

    try {
      setLoading(true);
      const success = await blockchainService.initializePlatform(wallet);
      
      if (success) {
        setPlatformInitialized(true);
        await loadGameStats();
      } else {
        setError('Failed to initialize platform');
      }
      
      return success;
    } catch (err: any) {
      setError(err.message || 'Failed to initialize platform');
      return false;
    } finally {
      setLoading(false);
    }
  }, [wallet, loadGameStats]);

  // Create new game lobby
  const createGame = useCallback(async (lobbyName: string, betAmount: number): Promise<boolean> => {
    if (!wallet.connected || !wallet.publicKey) {
      setError('Wallet not connected');
      return false;
    }

    if (!validateLobbyName(lobbyName)) {
      setError('Invalid lobby name. Only letters and numbers allowed (max 20 characters)');
      return false;
    }

    if (!validateBetAmount(betAmount, minBetSol)) {
      setError(`Minimum bet is ${minBetSol.toFixed(4)} SOL (0.50€)`);
      return false;
    }

    if (betAmount > walletBalance) {
      setError(`Insufficient balance. You have ${walletBalance.toFixed(4)} SOL`);
      return false;
    }

    try {
      setLoading(true);
      
      const result = await blockchainService.createGame(wallet, lobbyName, betAmount);
      
      if (result.success) {
        // Refresh data
        await Promise.all([
          loadActiveGames(),
          loadGameStats()
        ]);
        
        // Update wallet balance
        const newBalance = await blockchainService.getWalletBalance(wallet.publicKey);
        setWalletBalance(newBalance);
        
        return true;
      } else {
        setError(result.error || 'Failed to create game');
        return false;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create game');
      return false;
    } finally {
      setLoading(false);
    }
  }, [wallet, minBetSol, walletBalance, loadActiveGames, loadGameStats]);

  // Join existing game
  const joinGame = useCallback(async (gameId: string): Promise<boolean> => {
    if (!wallet.connected || !wallet.publicKey) {
      setError('Wallet not connected');
      return false;
    }

    const game = activeGames.find(g => g.id === gameId);
    if (!game) {
      setError('Game not found');
      return false;
    }

    if (game.betAmount > walletBalance) {
      setError(`Insufficient balance. You need ${game.betAmount.toFixed(4)} SOL`);
      return false;
    }

    try {
      setLoading(true);
      
      const gamePDA = new PublicKey(gameId);
      const result = await blockchainService.joinGame(wallet, gamePDA);
      
      if (result.success) {
        // Refresh data
        await loadActiveGames();
        
        // Update wallet balance
        const newBalance = await blockchainService.getWalletBalance(wallet.publicKey);
        setWalletBalance(newBalance);
        
        return true;
      } else {
        setError(result.error || 'Failed to join game');
        return false;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to join game');
      return false;
    } finally {
      setLoading(false);
    }
  }, [wallet, activeGames, walletBalance, loadActiveGames]);

  // Perform coin flip
  const performCoinFlip = useCallback(async (gameId: string, choice: CoinSide): Promise<boolean> => {
    if (!wallet.connected || !wallet.publicKey) {
      setError('Wallet not connected');
      return false;
    }

    // Find the game data before it gets deleted
    const game = activeGames.find(g => g.id === gameId);
    if (!game) {
      setError('Game not found');
      return false;
    }

    try {
      setLoading(true);
      
      const gamePDA = new PublicKey(gameId);
      const result = await blockchainService.flipCoin(wallet, gamePDA, choice);
      
      if (result.success) {
        // Wait a moment for the transaction to settle
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check the game result (try to get game data before it's closed)
        const gameData = await blockchainService.getGameData(gamePDA);
        
        // Create finished game entry for user participation
                const actualResult = gameData?.result || choice; // Fallback to choice if can't get result
        const actualResultString = actualResult.heads !== undefined ? 'heads' : 'tails';
        
        // Determine who won based on choice vs result
        const won = choice === actualResultString;
        const finalWinner = won ? wallet.publicKey.toString() : game.creator;
        
        // Create finished game
        const finishedGame = createFinishedGameFromResult(
          gameId,
          game.lobbyName,
          game.creator,
          game.player || wallet.publicKey.toString(),
          game.betAmount,
          choice,
          actualResultString,
          finalWinner
        );
        
        // Add EUR conversion
        finishedGame.betAmountEur = solToEur(finishedGame.betAmount, solEurRate);
        
        // Add to local storage and state
        const updatedFinishedGames = addFinishedGame(finishedGame);
        const gamesWithEur = updatedFinishedGames.map(g => ({
          ...g,
          betAmountEur: solToEur(g.betAmount, solEurRate)
        }));
        setFinishedGames(gamesWithEur);
        
        // Try to claim winnings if we won
        if (won && gameData?.winner && 
            gameData.winner.toString() === wallet.publicKey.toString()) {
          console.log('🏆 We won! Attempting to claim winnings...');
          try {
            const claimResult = await blockchainService.claimWinnings(wallet, gamePDA);
            if (claimResult.success) {
              console.log('✅ Winnings claimed automatically!');
            }
          } catch (claimError) {
            console.log('⚠️ Could not auto-claim winnings:', claimError);
          }
        }
        
        // Refresh all data
        await Promise.all([
          loadActiveGames(),
          loadGameStats()
        ]);
        
        // Update wallet balance
        const newBalance = await blockchainService.getWalletBalance(wallet.publicKey);
        setWalletBalance(newBalance);
        
        return true;
      } else {
        setError(result.error || 'Failed to flip coin');
        return false;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to flip coin');
      return false;
    } finally {
      setLoading(false);
    }
  }, [wallet, activeGames, solEurRate, loadActiveGames, loadGameStats]);

  // Delete own game lobby
  const deleteGame = useCallback(async (gameId: string): Promise<boolean> => {
    if (!wallet.connected || !wallet.publicKey) {
      setError('Wallet not connected');
      return false;
    }

    const game = activeGames.find(g => g.id === gameId);
    if (!game) {
      setError('Game not found');
      return false;
    }

    if (game.creator !== wallet.publicKey.toString()) {
      setError('You can only delete your own games');
      return false;
    }

    try {
      setLoading(true);
      
      const gamePDA = new PublicKey(gameId);
      const result = await blockchainService.deleteGame(wallet, gamePDA);
      
      if (result.success) {
        // Refresh data
        await Promise.all([
          loadActiveGames(),
          loadGameStats()
        ]);
        
        // Update wallet balance
        const newBalance = await blockchainService.getWalletBalance(wallet.publicKey);
        setWalletBalance(newBalance);
        
        return true;
      } else {
        setError(result.error || 'Failed to delete game');
        return false;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete game');
      return false;
    } finally {
      setLoading(false);
    }
  }, [wallet, activeGames, loadActiveGames, loadGameStats]);

  // Request devnet airdrop
  const requestDevnetAirdrop = useCallback(async (amount: number = 1): Promise<boolean> => {
    if (!wallet.connected || !wallet.publicKey) {
      setError('Wallet not connected');
      return false;
    }

    try {
      setLoading(true);
      const success = await blockchainService.requestAirdrop(wallet.publicKey, amount);
      
      if (success) {
        // Wait for confirmation and update balance
        await new Promise(resolve => setTimeout(resolve, 3000));
        const newBalance = await blockchainService.getWalletBalance(wallet.publicKey);
        setWalletBalance(newBalance);
      } else {
        setError('Failed to request airdrop');
      }
      
      return success;
    } catch (err: any) {
      setError(err.message || 'Failed to request airdrop');
      return false;
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Refresh all data
  const refreshData = useCallback(async () => {
    if (!wallet.connected || !wallet.publicKey) return;
    
    try {
      setLoading(true);
      await Promise.all([
        loadActiveGames(), // This now also detects finished games
        loadGameStats()
      ]);
      
      const balance = await blockchainService.getWalletBalance(wallet.publicKey);
      setWalletBalance(balance);
      
      // Also refresh finished games from localStorage
      const localGames = loadFinishedGames();
      const gamesWithEur = localGames.map(game => ({
        ...game,
        betAmountEur: solToEur(game.betAmount, solEurRate)
      }));
      setFinishedGames(gamesWithEur);
      
    } catch (err) {
      console.error('Error refreshing data:', err);
    } finally {
      setLoading(false);
    }
  }, [wallet, loadActiveGames, loadGameStats, solEurRate]);

  // Auto-refresh data every 15 seconds when connected (faster to catch finished games)
  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      const interval = setInterval(refreshData, 15000); // Every 15 seconds
      return () => clearInterval(interval);
    }
  }, [wallet.connected, wallet.publicKey, refreshData]);

  return {
    // State
    activeGames,
    finishedGames,
    gameStats,
    solEurRate,
    minBetSol,
    loading,
    error,
    walletBalance,
    platformInitialized,
    
    // Actions
    createGame,
    joinGame,
    performCoinFlip,
    deleteGame,
    clearError,
    refreshData,
    requestDevnetAirdrop,
    initializePlatform
  };
};