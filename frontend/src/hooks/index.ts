import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import type { GameLobby, FinishedGame, UserGameHistory, GameStats, CoinSide } from '../types';
import { 
  getSolToEurRate, 
  getMinimumBetInSol, 
  validateBetAmount, 
  validateLobbyName,
  flipCoin,
  generateGameId,
  calculateWinnerPayout,
  calculatePlatformFee,
  solToEur
} from '../utils';

export const useGameState = () => {
  const { publicKey, connected } = useWallet();
  
  // State
  const [activeGames, setActiveGames] = useState<GameLobby[]>([]);
  const [finishedGames, setFinishedGames] = useState<FinishedGame[]>([]);
  const [userHistory, setUserHistory] = useState<UserGameHistory[]>([]);
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

  // Initialize exchange rate and minimum bet
  useEffect(() => {
    const initializeRates = async () => {
      try {
        setLoading(true);
        const rate = await getSolToEurRate();
        const minBet = await getMinimumBetInSol();
        setSolEurRate(rate);
        setMinBetSol(minBet);
      } catch (err) {
        setError('Failed to fetch exchange rates');
      } finally {
        setLoading(false);
      }
    };

    initializeRates();
    
    // Update rates every 5 minutes
    const interval = setInterval(initializeRates, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Create new game lobby
  const createGame = useCallback(async (lobbyName: string, betAmount: number): Promise<boolean> => {
    if (!connected || !publicKey) {
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

    try {
      setLoading(true);
      
      // Simulate transaction (replace with actual Solana transaction)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newGame: GameLobby = {
        id: generateGameId(),
        creator: publicKey.toBase58(),
        lobbyName,
        betAmount,
        betAmountEur: solToEur(betAmount, solEurRate),
        createdAt: new Date(),
        status: 'active'
      };

      setActiveGames(prev => [...prev, newGame].sort((a, b) => b.betAmount - a.betAmount));
      updateGameStats();
      
      return true;
    } catch (err) {
      setError('Failed to create game');
      return false;
    } finally {
      setLoading(false);
    }
  }, [connected, publicKey, minBetSol, solEurRate]);

  // Join existing game
  const joinGame = useCallback(async (gameId: string): Promise<boolean> => {
    if (!connected || !publicKey) {
      setError('Wallet not connected');
      return false;
    }

    const game = activeGames.find(g => g.id === gameId);
    if (!game) {
      setError('Game not found');
      return false;
    }

    if (game.creator === publicKey.toBase58()) {
      // Self-play allowed
    }

    try {
      setLoading(true);
      
      // Simulate transaction (replace with actual Solana transaction)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update game status to in_progress
      setActiveGames(prev => 
        prev.map(g => 
          g.id === gameId 
            ? { ...g, status: 'in_progress' as const, player: publicKey.toBase58() }
            : g
        )
      );
      
      return true;
    } catch (err) {
      setError('Failed to join game');
      return false;
    } finally {
      setLoading(false);
    }
  }, [connected, publicKey, activeGames]);

  // Perform coin flip
  const performCoinFlip = useCallback(async (gameId: string, choice: CoinSide): Promise<boolean> => {
    if (!connected || !publicKey) {
      setError('Wallet not connected');
      return false;
    }

    const game = activeGames.find(g => g.id === gameId && g.status === 'in_progress');
    if (!game) {
      setError('Game not found or not in progress');
      return false;
    }

    try {
      setLoading(true);
      
      // Simulate coin flip delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const result = flipCoin();
      const isWinner = choice === result;
      const winner = isWinner ? publicKey.toBase58() : game.creator;
      
      // Create finished game
      const finishedGame: FinishedGame = {
        id: game.id,
        creator: game.creator,
        player: game.player!,
        lobbyName: game.lobbyName,
        betAmount: game.betAmount * 2, // Total bet from both players
        betAmountEur: game.betAmountEur * 2,
        winner,
        result,
        choice,
        finishedAt: new Date()
      };

      // Remove from active games
      setActiveGames(prev => prev.filter(g => g.id !== gameId));
      
      // Add to finished games
      setFinishedGames(prev => [finishedGame, ...prev]);
      
      // Add to user history
      const historyEntry: UserGameHistory = {
        id: game.id,
        role: game.creator === publicKey.toBase58() ? 'creator' : 'player',
        opponent: game.creator === publicKey.toBase58() ? game.player! : game.creator,
        lobbyName: game.lobbyName,
        betAmount: game.betAmount * 2,
        betAmountEur: game.betAmountEur * 2,
        result: isWinner ? 'won' : 'lost',
        coinResult: result,
        choice,
        finishedAt: new Date()
      };
      
      setUserHistory(prev => [historyEntry, ...prev]);
      updateGameStats();
      
      return true;
    } catch (err) {
      setError('Failed to perform coin flip');
      return false;
    } finally {
      setLoading(false);
    }
  }, [connected, publicKey, activeGames]);

  // Delete own game lobby
  const deleteGame = useCallback(async (gameId: string): Promise<boolean> => {
    if (!connected || !publicKey) {
      setError('Wallet not connected');
      return false;
    }

    const game = activeGames.find(g => g.id === gameId);
    if (!game) {
      setError('Game not found');
      return false;
    }

    if (game.creator !== publicKey.toBase58()) {
      setError('You can only delete your own games');
      return false;
    }

    try {
      setLoading(true);
      
      // Simulate refund transaction (95% refund, 5% fee)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setActiveGames(prev => prev.filter(g => g.id !== gameId));
      updateGameStats();
      
      return true;
    } catch (err) {
      setError('Failed to delete game');
      return false;
    } finally {
      setLoading(false);
    }
  }, [connected, publicKey, activeGames]);

  // Update game statistics
  const updateGameStats = useCallback(() => {
    const totalVolumeSol = finishedGames.reduce((sum, game) => sum + game.betAmount, 0);
    
    setGameStats({
      activeGames: activeGames.length,
      totalVolume: totalVolumeSol,
      totalVolumeEur: solToEur(totalVolumeSol, solEurRate),
      gamesPlayed: finishedGames.length
    });
  }, [activeGames.length, finishedGames, solEurRate]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-delete games after 24h (simulate)
  useEffect(() => {
    const checkExpiredGames = () => {
      const now = new Date();
      setActiveGames(prev => 
        prev.filter(game => {
          const timeDiff = now.getTime() - game.createdAt.getTime();
          const hoursDiff = timeDiff / (1000 * 60 * 60);
          return hoursDiff < 24;
        })
      );
    };

    const interval = setInterval(checkExpiredGames, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Clean up finished games after 24h
  useEffect(() => {
    const cleanupFinishedGames = () => {
      const now = new Date();
      setFinishedGames(prev => 
        prev.filter(game => {
          const timeDiff = now.getTime() - game.finishedAt.getTime();
          const hoursDiff = timeDiff / (1000 * 60 * 60);
          return hoursDiff < 24;
        })
      );
    };

    const interval = setInterval(cleanupFinishedGames, 60000);
    return () => clearInterval(interval);
  }, []);

  return {
    // State
    activeGames,
    finishedGames,
    userHistory,
    gameStats,
    solEurRate,
    minBetSol,
    loading,
    error,
    
    // Actions
    createGame,
    joinGame,
    performCoinFlip,
    deleteGame,
    clearError
  };
};