import axios from 'axios';

// SOL to EUR conversion
export const getSolToEurRate = async (): Promise<number> => {
  try {
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=eur'
    );
    return response.data.solana.eur;
  } catch (error) {
    console.error('Error fetching SOL/EUR rate:', error);
    // Fallback rate (approximate)
    return 180; // 1 SOL ≈ 180 EUR (update this periodically)
  }
};

export const solToEur = (solAmount: number, rate: number): number => {
  return solAmount * rate;
};

export const eurToSol = (eurAmount: number, rate: number): number => {
  return eurAmount / rate;
};

// FIXED: Minimum bet validation - set to fixed SOL amount
export const getMinimumBetInSol = async (): Promise<number> => {
  // Fixed minimum: 0.003 SOL (approximately 0.50€ when SOL = 170€)
  return 0.003;
};

export const validateBetAmount = (solAmount: number, minSolAmount: number): boolean => {
  return solAmount >= minSolAmount;
};

// Lobby name validation (only A-Z, a-z, 0-9)
export const validateLobbyName = (name: string): boolean => {
  const regex = /^[A-Za-z0-9]+$/;
  return regex.test(name) && name.length > 0 && name.length <= 20;
};

// Format SOL amount for display
export const formatSol = (amount: number): string => {
  return amount.toFixed(4);
};

// Format EUR amount for display
export const formatEur = (amount: number): string => {
  return amount.toFixed(2);
};

// Generate random coin flip result
export const flipCoin = (): 'heads' | 'tails' => {
  return Math.random() < 0.5 ? 'heads' : 'tails';
};

// Calculate winner payout (95% of total bet)
export const calculateWinnerPayout = (totalBet: number): number => {
  return totalBet * 0.95;
};

// Calculate platform fee (5% of total bet)
export const calculatePlatformFee = (totalBet: number): number => {
  return totalBet * 0.05;
};

// Truncate wallet address for display
export const truncateAddress = (address: string, chars: number = 4): string => {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

// Generate unique game ID
export const generateGameId = (): string => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

// Time formatting
export const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

// Validate wallet connection
export const isWalletConnected = (publicKey: any): boolean => {
  return publicKey !== null && publicKey !== undefined;
};