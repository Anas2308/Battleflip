import { type FC, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { formatSol, formatEur, validateLobbyName, solToEur } from '../utils';
import { PlusIcon, InformationCircleIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

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

  const quickBetAmounts = [
    { sol: 0.01, label: '0.01 SOL' },
    { sol: 0.05, label: '0.05 SOL' },
    { sol: 0.1, label: '0.1 SOL' },
    { sol: 0.5, label: '0.5 SOL' },
  ];

  if (!connected) {
    return (
      <div className="glass-card text-center p-8">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <PlusIcon className="w-10 h-10 text-white" />
        </div>
        <h3 className="text-2xl font-bold mb-4 text-gradient-blue">Create New Game</h3>
        <p className="text-gray-400 text-lg">Connect your wallet to create a new coin-flip game</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-3xl font-bold text-gradient-blue mb-2">
          ➕ Create New Game
        </h3>
        <p className="text-gray-400">
          Set up your coin-flip game and wait for opponents to join
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Form */}
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Lobby Name */}
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-3">
                🏷️ Lobby Name
              </label>
              <input
                type="text"
                value={lobbyName}
                onChange={(e) => setLobbyName(e.target.value)}
                placeholder="Enter a unique lobby name"
                className={`input-field w-full text-lg ${
                  lobbyName && !isValidLobbyName ? 'border-red-500 ring-red-500/20' : 'focus:ring-purple-500/50'
                }`}
                maxLength={20}
                disabled={loading || isCreating}
              />
              <div className="flex justify-between items-center mt-2">
                <span className={`text-xs ${
                  lobbyName && !isValidLobbyName ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {lobbyName && !isValidLobbyName ? '❌ Only letters and numbers allowed' : '✅ Letters and numbers only'}
                </span>
                <span className={`text-xs font-mono ${
                  lobbyName.length > 15 ? 'text-yellow-400' : 'text-gray-400'
                }`}>
                  {lobbyName.length}/20
                </span>
              </div>
            </div>

            {/* Bet Amount */}
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-3">
                💰 Bet Amount (SOL)
              </label>
              <div className="space-y-3">
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder={`Minimum: ${formatSol(minBetSol)} SOL`}
                  step="0.000001"
                  min={minBetSol}
                  className={`input-field w-full text-lg ${
                    betAmount && !isValidBetAmount ? 'border-red-500 ring-red-500/20' : 'focus:ring-green-500/50'
                  }`}
                  disabled={loading || isCreating}
                />
                
                {/* Quick Bet Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  {quickBetAmounts.map((amount) => (
                    <button
                      key={amount.sol}
                      type="button"
                      onClick={() => setBetAmount(amount.sol.toString())}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-sm font-medium rounded-lg transition-colors border border-gray-600 hover:border-gray-500"
                      disabled={loading || isCreating}
                    >
                      {amount.label}
                      <div className="text-xs text-gray-400">
                        ≈ {formatEur(solToEur(amount.sol, solEurRate))}€
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center mt-2">
                <span className={`text-xs ${
                  betAmount && !isValidBetAmount ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {betAmount && !isValidBetAmount 
                    ? `❌ Minimum: ${formatSol(minBetSol)} SOL (≈ 0.50€)` 
                    : `✅ Minimum: ${formatSol(minBetSol)} SOL (≈ 0.50€)`
                  }
                </span>
                {betAmountNum > 0 && (
                  <span className="text-xs font-bold text-green-400">
                    ≈ {formatEur(betAmountEur)}€
                  </span>
                )}
              </div>
            </div>

            {/* Pot Preview */}
            {betAmountNum > 0 && isValidBetAmount && (
              <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 rounded-xl p-4 border border-green-500/30">
                <h4 className="font-bold text-green-400 mb-3">💰 Game Preview</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Your bet:</span>
                    <span className="font-bold text-white">{formatSol(betAmountNum)} SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total pot (when joined):</span>
                    <span className="font-bold text-yellow-400">{formatSol(betAmountNum * 2)} SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Winner payout (95%):</span>
                    <span className="font-bold text-green-400">{formatSol(betAmountNum * 2 * 0.95)} SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Platform fee (5%):</span>
                    <span className="font-bold text-gray-400">{formatSol(betAmountNum * 2 * 0.05)} SOL</span>
                  </div>
                </div>
              </div>
            )}

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
              className="btn-primary w-full text-lg py-4 relative overflow-hidden"
            >
              {isCreating ? (
                <span className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating Game...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-3">
                  <PlusIcon className="w-5 h-5" />
                  Create Game
                  {betAmountNum > 0 && (
                    <span className="text-sm opacity-80">
                      ({formatSol(betAmountNum)} SOL)
                    </span>
                  )}
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Info Panel */}
        <div className="space-y-6">
          {/* Instructions */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <InformationCircleIcon className="w-5 h-5 text-white" />
              </div>
              <h4 className="font-bold text-xl text-gradient-purple">How It Works</h4>
            </div>
            <ol className="space-y-3 text-gray-300">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <span>Choose a unique lobby name (letters and numbers only)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <span>Set your bet amount (minimum {formatSol(minBetSol)} SOL ≈ 0.50€)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <span>Pay the bet to create the lobby</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                <span>Wait for someone to join your game</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
                <span>Winner takes 95% of the total pot!</span>
              </li>
            </ol>
          </div>

          {/* Fee Structure */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                <CurrencyDollarIcon className="w-5 h-5 text-white" />
              </div>
              <h4 className="font-bold text-xl text-gradient-green">Fee Structure</h4>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-900/20 rounded-xl border border-green-500/30">
                <span className="text-gray-300">Winner Payout</span>
                <span className="font-bold text-green-400">95%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-900/20 rounded-xl border border-blue-500/30">
                <span className="text-gray-300">Platform Fee</span>
                <span className="font-bold text-blue-400">5%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-900/20 rounded-xl border border-yellow-500/30">
                <span className="text-gray-300">Manual Delete Refund</span>
                <span className="font-bold text-yellow-400">95%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-900/20 rounded-xl border border-purple-500/30">
                <span className="text-gray-300">Auto-Delete (24h)</span>
                <span className="font-bold text-purple-400">100%</span>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="glass-card p-6">
            <h4 className="font-bold text-xl text-gradient-blue mb-4">🚀 Why Create Games?</h4>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-center gap-3">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span>50/50 chance to double your money</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                <span>Provably fair blockchain randomness</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                <span>Instant payouts for winners</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                <span>Delete anytime with 95% refund</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-2 h-2 bg-pink-400 rounded-full"></span>
                <span>You can even join your own games!</span>
              </li>
            </ul>
          </div>

          {/* Tips */}
          <div className="glass-card p-6 bg-gradient-to-br from-gray-800/60 to-gray-900/60">
            <h4 className="font-bold text-lg text-yellow-400 mb-3">💡 Pro Tips</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• Higher bet amounts attract more players</li>
              <li>• Unique lobby names are easier to find</li>
              <li>• Check current SOL price for best EUR value</li>
              <li>• Games auto-delete after 24h with full refund</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 text-center">
          <div className="text-2xl font-bold text-purple-400 mb-1">
            {formatSol(minBetSol)}
          </div>
          <div className="text-sm text-gray-400">Minimum Bet (SOL)</div>
        </div>
        
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 text-center">
          <div className="text-2xl font-bold text-green-400 mb-1">
            95%
          </div>
          <div className="text-sm text-gray-400">Winner Payout</div>
        </div>
        
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 text-center">
          <div className="text-2xl font-bold text-blue-400 mb-1">
            24h
          </div>
          <div className="text-sm text-gray-400">Auto-Delete Timer</div>
        </div>
      </div>
    </div>
  );
};