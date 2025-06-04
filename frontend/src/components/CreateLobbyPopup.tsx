import { type FC, useState } from 'react';
import { validateLobbyName, formatSol } from '../utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreateGame: (lobbyName: string, betAmount: number) => Promise<boolean>;
  minBetSol: number;
  loading: boolean;
}

export const CreateLobbyPopup: FC<Props> = ({ 
  isOpen, 
  onClose, 
  onCreateGame, 
  minBetSol, 
  loading 
}) => {
  const [lobbyName, setLobbyName] = useState('');
  const [betAmount, setBetAmount] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!lobbyName || !betAmount) return;
    
    const betAmountNum = parseFloat(betAmount);
    if (isNaN(betAmountNum) || betAmountNum < minBetSol) return;
    
    const success = await onCreateGame(lobbyName, betAmountNum);
    
    if (success) {
      setLobbyName('');
      setBetAmount('');
      onClose();
    }
  };

  const isValidLobbyName = validateLobbyName(lobbyName);
  const betAmountNum = parseFloat(betAmount) || 0;
  const isValidBetAmount = betAmountNum >= minBetSol;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-black mb-4">Create Lobby</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Lobby Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lobby Name
            </label>
            <input
              type="text"
              value={lobbyName}
              onChange={(e) => setLobbyName(e.target.value)}
              placeholder="Enter lobby name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              maxLength={20}
              disabled={loading}
            />
            <div className="flex justify-between items-center mt-1">
              <span className={`text-xs ${
                lobbyName && !isValidLobbyName ? 'text-red-500' : 'text-gray-500'
              }`}>
                {lobbyName && !isValidLobbyName ? 'Only letters and numbers allowed' : 'Letters and numbers only'}
              </span>
              <span className="text-xs text-gray-500">
                {lobbyName.length}/20
              </span>
            </div>
          </div>

          {/* Bet Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bet Amount (SOL)
            </label>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              placeholder={`Min: ${formatSol(minBetSol)} SOL`}
              step="0.001"
              min={minBetSol}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              disabled={loading}
            />
            <span className={`text-xs mt-1 block ${
              betAmount && !isValidBetAmount ? 'text-red-500' : 'text-gray-500'
            }`}>
              {betAmount && !isValidBetAmount 
                ? `Minimum: ${formatSol(minBetSol)} SOL (≈ 0.50€)` 
                : `Minimum: ${formatSol(minBetSol)} SOL (≈ 0.50€)`
              }
            </span>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                !isValidLobbyName ||
                !isValidBetAmount ||
                loading
              }
              className="flex-1 bg-black text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'OK'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};