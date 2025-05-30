import { type FC, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useBlockchainGameState } from '../hooks/useBlockchainGameState';
import { CreateGame } from '../components/CreateGame';
import { ActiveGames } from '../components/ActiveGames';
import { CoinFlip } from '../components/CoinFlip';
import { FinishedGames } from '../components/FinishedGames';
import { GameStats } from '../components/GameStats';
import { ErrorDisplay } from '../components/ErrorDisplay';

export const Home: FC = () => {
  const { connected } = useWallet();
  const {
    activeGames,
    finishedGames,
    gameStats,
    solEurRate,
    minBetSol,
    loading,
    error,
    walletBalance,
    platformInitialized,
    createGame,
    joinGame,
    performCoinFlip,
    deleteGame,
    clearError,
    refreshData,
    requestDevnetAirdrop,
    initializePlatform
  } = useBlockchainGameState();

  const [activeTab, setActiveTab] = useState<'create' | 'active' | 'finished'>('active');
  const [flipGameId, setFlipGameId] = useState<string | null>(null);

  const handleJoinGame = async (gameId: string): Promise<boolean> => {
    const success = await joinGame(gameId);
    if (success) {
      setFlipGameId(gameId);
    }
    return success;
  };

  const handleCoinFlip = async (choice: 'heads' | 'tails') => {
    if (!flipGameId) return false;
    
    const success = await performCoinFlip(flipGameId, choice);
    if (success) {
      setFlipGameId(null);
      setActiveTab('finished');
    }
    return success;
  };

  const flipGame = activeGames.find(g => g.id === flipGameId);

  return (
    <div className="space-y-8">
      {/* Error Display */}
      {error && (
        <ErrorDisplay error={error} onClose={clearError} />
      )}

      {/* Hero Section - CLEANED */}
      <div className="text-center py-8">
        <h2 className="text-4xl font-bold mb-4">
          Welcome to <span className="text-purple-400">BattleFlip</span>
        </h2>
        <p className="text-xl text-gray-400 mb-6">
          The ultimate coin-flip gambling experience on Solana
        </p>
        <div className="flex justify-center items-center gap-4 text-sm text-gray-500">
          <span>1 SOL ≈ {solEurRate.toFixed(0)}€</span>
          <span>•</span>
          <span>Min bet: {minBetSol.toFixed(4)} SOL (≈ 0.50€)</span>
        </div>
      </div>

      {/* Game Statistics */}
      <GameStats stats={gameStats} solEurRate={solEurRate} />

      {/* Connection Status - CLEANED */}
      {!connected ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold mb-4 text-purple-400">Connect Wallet to Start</h3>
          <p className="text-lg mb-6 text-gray-300">Connect your wallet to start playing!</p>
          <div className="flex justify-center gap-8">
            <div className="flex items-center gap-3 p-4 bg-gray-700 rounded-lg">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <div>
                <div className="font-bold">Phantom</div>
                <div className="text-sm text-gray-400">Recommended</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-700 rounded-lg">
              <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <div>
                <div className="font-bold">Solflare</div>
                <div className="text-sm text-gray-400">Mobile friendly</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Devnet Helper */}
          <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-500/30">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-blue-300">Devnet Testing Mode</h4>
                <p className="text-sm text-gray-300">
                  Balance: {walletBalance.toFixed(4)} SOL
                  {!platformInitialized && " • Platform needs initialization"}
                </p>
              </div>
              <div className="flex gap-2">
                {!platformInitialized && (
                  <button
                    onClick={initializePlatform}
                    disabled={loading}
                    className="btn-primary text-sm px-4 py-2"
                  >
                    Initialize Platform
                  </button>
                )}
                <button
                  onClick={() => requestDevnetAirdrop(2)}
                  disabled={loading}
                  className="btn-secondary text-sm px-4 py-2"
                >
                  Get 2 SOL
                </button>
                <button
                  onClick={refreshData}
                  disabled={loading}
                  className="btn-secondary text-sm px-4 py-2"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Coin Flip Modal */}
          {flipGameId && flipGame && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-purple-400">Coin Flip Time!</h3>
                    <button
                      onClick={() => setFlipGameId(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <CoinFlip
                    onFlip={handleCoinFlip}
                    loading={loading}
                    gameId={flipGame.id}
                    lobbyName={flipGame.lobbyName}
                    betAmount={flipGame.betAmount}
                    totalPot={flipGame.betAmount * 2}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation Tabs - CLEANED */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'active', label: `Active Games (${activeGames.length})`, icon: '▶' },
              { key: 'create', label: 'Create Game', icon: '+' },
              { key: 'finished', label: `Recent Games (${finishedGames.length})`, icon: '◼' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`
                  px-6 py-3 rounded-lg font-medium transition-all
                  ${activeTab === tab.key
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }
                `}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {activeTab === 'create' && (
              <CreateGame
                onCreateGame={createGame}
                minBetSol={minBetSol}
                solEurRate={solEurRate}
                loading={loading}
              />
            )}

            {activeTab === 'active' && (
              <ActiveGames
                games={activeGames}
                onJoinGame={handleJoinGame}
                onDeleteGame={deleteGame}
                loading={loading}
              />
            )}

            {activeTab === 'finished' && (
              <FinishedGames games={finishedGames} />
            )}
          </div>
        </>
      )}

      {/* Platform Information - CLEANED */}
      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl p-6 border border-purple-500/30">
        <h3 className="text-xl font-bold mb-4 text-purple-300">How BattleFlip Works</h3>
        <div className="grid md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-bold text-white mb-2">For Creators:</h4>
            <ul className="space-y-1 text-gray-300">
              <li>• Create a lobby with your bet amount</li>
              <li>• Wait for someone to join your game</li>
              <li>• 50/50 chance to win 95% of total pot</li>
              <li>• Delete anytime for 95% refund</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-2">For Players:</h4>
            <ul className="space-y-1 text-gray-300">
              <li>• Browse active games and join any</li>
              <li>• Choose heads or tails for the flip</li>
              <li>• Win 95% of total pot if you're right</li>
              <li>• Self-play allowed (join your own games)</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-purple-500/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-400">
            <div>
              <span className="font-bold text-green-400">Winner Payout:</span> 95% of total pot
            </div>
            <div>
              <span className="font-bold text-yellow-400">Platform Fee:</span> 5% of total pot
            </div>
            <div>
              <span className="font-bold text-blue-400">Auto-delete:</span> 24h with 100% refund
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};