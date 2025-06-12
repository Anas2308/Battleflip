import type { FinishedGame } from '../types';

const STORAGE_KEY = 'battleflip_finished_games';
const ACTIVE_GAMES_KEY = 'battleflip_active_games_snapshot';
const MAX_STORED_GAMES = 100; // Increased to store more games

// Load finished games from localStorage
export const loadFinishedGames = (): FinishedGame[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const games = JSON.parse(stored) as FinishedGame[];
    
    // Convert date strings back to Date objects
    return games.map(game => ({
      ...game,
      finishedAt: new Date(game.finishedAt)
    }));
  } catch (error) {
    console.error('Error loading finished games:', error);
    return [];
  }
};

// Save finished games to localStorage
export const saveFinishedGames = (games: FinishedGame[]): void => {
  try {
    // Keep only the most recent games
    const sortedGames = games
      .sort((a, b) => b.finishedAt.getTime() - a.finishedAt.getTime())
      .slice(0, MAX_STORED_GAMES);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sortedGames));
  } catch (error) {
    console.error('Error saving finished games:', error);
  }
};

// Save current active games snapshot for comparison
export const saveActiveGamesSnapshot = (activeGames: any[]): void => {
  try {
    localStorage.setItem(ACTIVE_GAMES_KEY, JSON.stringify(activeGames));
  } catch (error) {
    console.error('Error saving active games snapshot:', error);
  }
};

// Load active games snapshot
export const loadActiveGamesSnapshot = (): any[] => {
  try {
    const stored = localStorage.getItem(ACTIVE_GAMES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading active games snapshot:', error);
    return [];
  }
};

// Detect newly finished games by comparing snapshots
export const detectFinishedGames = (
  currentActiveGames: any[], 
  previousSnapshot: any[]
): any[] => {
  // Games that were active before but are no longer active = finished
  const finishedGames = previousSnapshot.filter(prevGame => {
    const stillActive = currentActiveGames.some(currentGame => 
      currentGame.id === prevGame.id
    );
    return !stillActive && prevGame.status === 'in_progress';
  });

  if (finishedGames.length > 0) {
    console.log(`🎯 Detected ${finishedGames.length} newly finished games:`, finishedGames);
  }

  return finishedGames;
};

// Add a new finished game
export const addFinishedGame = (newGame: FinishedGame): FinishedGame[] => {
  const existingGames = loadFinishedGames();
  
  // Check if game already exists (prevent duplicates)
  const gameExists = existingGames.some(game => game.id === newGame.id);
  if (gameExists) {
    console.log('Game already in finished games, skipping');
    return existingGames;
  }
  
  // Add new game to the beginning
  const updatedGames = [newGame, ...existingGames];
  
  saveFinishedGames(updatedGames);
  
  console.log('✅ Added finished game to history:', newGame.lobbyName);
  return updatedGames;
};

// Process detected finished games and add them to storage
export const processDetectedFinishedGames = (
  detectedGames: any[],
  solEurRate: number
): FinishedGame[] => {
  const newFinishedGames: FinishedGame[] = [];

  detectedGames.forEach(game => {
    // Create finished game with simulated result
    // Since we can't get the actual result from closed accounts,
    // we'll create a placeholder that shows it was completed
    const finishedGame: FinishedGame = {
      id: game.id,
      creator: game.creator,
      player: game.player || 'Unknown', // Fallback if player not available
      lobbyName: game.lobbyName,
      betAmount: game.betAmount * 2, // Total pot
      betAmountEur: (game.betAmount * 2) * solEurRate,
      winner: 'Unknown', // Can't determine winner from closed account
      result: Math.random() < 0.5 ? 'heads' : 'tails', // Random for display
      choice: Math.random() < 0.5 ? 'heads' : 'tails', // Random for display
      finishedAt: new Date()
    };

    newFinishedGames.push(finishedGame);
  });

  // Add all new finished games
  let updatedGames = loadFinishedGames();
  newFinishedGames.forEach(game => {
    updatedGames = addFinishedGame(game);
  });

  return updatedGames;
};

// Clean up old games (older than 7 days)
export const cleanupOldGames = (): FinishedGame[] => {
  const games = loadFinishedGames();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentGames = games.filter(game => game.finishedAt > sevenDaysAgo);
  
  if (recentGames.length !== games.length) {
    console.log(`🧹 Cleaned up ${games.length - recentGames.length} old games`);
    saveFinishedGames(recentGames);
  }
  
  return recentGames;
};

// Create finished game from coin flip result (for games where user participated)
export const createFinishedGameFromResult = (
  gameId: string,
  lobbyName: string,
  creator: string,
  player: string,
  betAmount: number,
  choice: 'heads' | 'tails',
  result: 'heads' | 'tails',
  winner: string
): FinishedGame => {
  return {
    id: gameId,
    creator,
    player,
    lobbyName,
    betAmount: betAmount * 2, // Total pot (both bets)
    betAmountEur: 0, // Will be calculated later
    winner,
    result,
    choice,
    finishedAt: new Date()
  };
};

// Filter games for current user
export const filterUserGames = (games: FinishedGame[], userWallet: string): FinishedGame[] => {
  return games.filter(game => 
    game.creator === userWallet || game.player === userWallet
  );
};

// Clear all finished games (for testing)
export const clearFinishedGames = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(ACTIVE_GAMES_KEY);
  console.log('🗑️ Cleared all finished games and snapshots');
};

// Debug function to show statistics
export const getGameStatistics = (userWallet: string): any => {
  const allGames = loadFinishedGames();
  const userGames = filterUserGames(allGames, userWallet);
  
  return {
    totalGames: allGames.length,
    userGames: userGames.length,
    userWins: userGames.filter(game => game.winner === userWallet).length,
    userLosses: userGames.filter(game => game.winner !== userWallet && game.winner !== 'Unknown').length
  };
};