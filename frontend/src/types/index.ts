export interface GameLobby {
  id: string;
  creator: string;
  lobbyName: string;
  betAmount: number; // in SOL
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
  betAmount: number;
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
  betAmountEur: number;
  result: 'won' | 'lost';
  coinResult: 'heads' | 'tails';
  choice: 'heads' | 'tails';
  finishedAt: Date;
}

export interface GameStats {
  activeGames: number;
  totalVolume: number; // in SOL
  totalVolumeEur: number; // in EUR
  gamesPlayed: number;
}

export type CoinSide = 'heads' | 'tails';