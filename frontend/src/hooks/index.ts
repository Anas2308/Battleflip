export interface GameLobby {
  id: string;
  creator: string;
  lobbyName: string;
  betAmount: number; // Original bet amount (what user pays) in SOL
  potAmount: number; // Amount that goes to pot (97.5% of bet) in SOL
  totalPot: number;  // Total pot available for winner in SOL
  betAmountEur: number; // in EUR
  createdAt: Date;
  status: 'active' | 'in_progress' | 'finished';
  player?: string;
  winner?: string;
  result?: 'heads' | 'tails';
  choice?: 'heads' | 'tails';
}

export interface FinishedGame {
  id: string;
  creator: string;
  player: string;
  lobbyName: string;
  betAmount: number; // Original total bet amount (both players combined)
  potAmount: number; // Total pot amount (97.5% of both bets)
  betAmountEur: number;
  winner: string;
  result: 'heads' | 'tails';
  choice: 'heads' | 'tails';
  finishedAt: Date;
}

export interface UserGameHistory {
  id: string;
  role: 'creator' | 'player';
  opponent: string;
  lobbyName: string;
  betAmount: number;
  potAmount: number;
  betAmountEur: number;
  result: 'won' | 'lost';
  coinResult: 'heads' | 'tails';
  choice: 'heads' | 'tails';
  finishedAt: Date;
}

export interface GameStats {
  activeGames: number;
  totalVolume: number; // Total bet volume (original amounts) in SOL
  totalVolumeEur: number; // in EUR
  gamesPlayed: number;
}

export type CoinSide = 'heads' | 'tails';

// Fee calculation helpers
export interface FeeCalculation {
  originalBet: number;    // What user pays (e.g., 1.0 SOL)
  potAmount: number;      // What goes to pot (0.975 SOL)
  feeAmount: number;      // What goes to platform (0.025 SOL)
  totalPot: number;       // Total pot for winner (1.95 SOL from both players)
}

// Constants
export const POT_PERCENTAGE = 97.5;  // 97.5% to pot
export const FEE_PERCENTAGE = 2.5;   // 2.5% to platform

// Helper function to calculate fees
export const calculateFees = (betAmountSol: number): FeeCalculation => {
  const potAmount = (betAmountSol * POT_PERCENTAGE) / 100;
  const feeAmount = betAmountSol - potAmount; // Use remainder to avoid rounding issues
  const totalPot = potAmount * 2; // Both players contribute to pot
  
  return {
    originalBet: betAmountSol,
    potAmount,
    feeAmount,
    totalPot
  };
};