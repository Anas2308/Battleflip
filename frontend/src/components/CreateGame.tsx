import { type FC, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { formatSol, formatEur, validateLobbyName, solToEur } from '../utils';

interface Props {
  onCreateGame: (lobbyName: string, betAmount: number) => Promise<boolean>;
  minBetSol: number;
  solEurRate: number;
  loading: boolean;
}

export const CreateGame: FC<Props> = ({ onCreateGame, minBetSol, solEurRate, loading }) => {
  const { connected } = useWallet();
  const [lobbyName, setLobbyName] = useState('');
  const [betAmount, setBetAmount] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!connected || !lobbyName || !betAmount) return;
    
    const betAmountNum = parseFloat(betAmount);
    if (isNaN(betAmountNum) || betAmountNum <= 0) return;
    
    setIsCreating(true);
    const success = await onCreateGame(lobbyName, betAmountNum);
    
    if (success) {
      setLobbyName('');
      setBetAmount('');
    }
    
    setIsCreating(false);
  };

  const isValidLobbyName = validateLobbyName(lobbyName);
  const betAmountNum = parseFloat(betAmount) || 0;
  const isValidBetAmount = betAmountNum >= minBetSol;
  const betAmountEur = solToEur(betAmountNum, solEurRate);

  if (!connected) {
    return (
      <div className="card text-center">
        <h3 className="text-xl font-bold mb-4 text-purple-400">Create Game</h3>
        <p className="text-gray-400">Connect your wallet to create a game</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-xl font-bold mb-6 text-purple-400">Create New Game</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Lobby Name */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Lobby Name
          </label>
          <input
            type="text"
            value={lobbyName}
            onChange={(e) => setLobbyName(e.target.value)}
            placeholder="Enter lobby name"
            className={`input-field w-full ${
              lobbyName && !isValidLobbyName ? 'border-red-500' : ''
            }`}
            maxLength={20}
            disabled={loading || isCreating}
          />
          <div className="flex justify-between text-xs mt-1">
            <span className={lobbyName && !isValidLobbyName ? 'text-red-400' : 'text-gray-400'}>
              Only letters and numbers (A-Z, a-z, 0-9)
            </span>
            <span className="text-gray-400">{lobbyName.length}/20</span>
          </div>
        </div>

        {/* Bet Amount - FIXED: More precise step */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Bet Amount (SOL)
          </label>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            placeholder={`Min: ${formatSol(minBetSol)} SOL`}
            step="0.000001"
            min={minBetSol}
            className={`input-field w-full ${
              betAmount && !isValidBetAmount ? 'border-red-500' : ''
            }`}
            disabled={loading || isCreating}
          />
          <div className="flex justify-between text-xs mt-1">
            <span className={betAmount && !isValidBetAmount ? 'text-red-400' : 'text-gray-400'}>
              Minimum: {formatSol(minBetSol)} SOL (≈ 0.50€)
            </span>
            {betAmountNum > 0 && (
              <span className="text-gray-400">
                ≈ {formatEur(betAmountEur)}€
              </span>
            )}
          </div>
        </div>

        {/* Fee Information */}
        <div className="bg-gray-700 rounded-lg p-4 text-sm">
          <h4 className="font-medium text-yellow-400 mb-2">Fee Structure</h4>
          <ul className="space-y-1 text-gray-300">
            <li>• Winner gets 95% of total pot</li>
            <li>• Platform fee: 5%</li>
            <li>• Manual delete: 95% refund</li>
            <li>• Auto-delete (24h): 100% refund</li>
          </ul>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={
            !connected ||
            !isValidLobbyName ||
            !isValidBetAmount ||
            loading ||
            isCreating
          }
          className="btn-primary w-full"
        >
          {isCreating ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Creating Game...
            </span>
          ) : (
            `Create Game (${formatSol(betAmountNum)} SOL)`
          )}
        </button>
      </form>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
        <h4 className="font-medium text-purple-300 mb-2">📋 How it works:</h4>
        <ol className="text-sm text-gray-300 space-y-1">
          <li>1. Choose a unique lobby name</li>
          <li>2. Set your bet amount (min 0.003 SOL ≈ 0.50€)</li>
          <li>3. Pay the bet to create lobby</li>
          <li>4. Wait for someone to join</li>
          <li>5. Winner takes 95% of total pot!</li>
        </ol>
      </div>
    </div>
  );
};