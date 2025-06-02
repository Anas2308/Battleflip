import { type FC } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import type { GameLobby } from '../types';
import { formatSol, formatEur, formatTimeAgo, truncateAddress } from '../utils';
import { TrashIcon, PlayIcon, UserIcon, ClockIcon } from '@heroicons/react/24/outline';

interface Props {
  games: GameLobby[];
  onJoinGame: (gameId: string) => Promise<boolean>;
  onDeleteGame: (gameId: string) => Promise<boolean>;
  loading: boolean;
}

export const ActiveGames: FC<Props> = ({ games, onJoinGame, onDeleteGame, loading }) => {
  const { publicKey, connected } = useWallet();

  const handleJoinGame = async (gameId: string) => {
    if (!connected) return;
    await onJoinGame(gameId);
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!connected) return;
    if (confirm('Are you sure you want to delete this game? You will get a 95% refund.')) {
      await onDeleteGame(gameId);
    }
  };

  if (!connected) {
    return (
      <div className="glass-card text-center p-8">
        <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">🔐</span>
        </div>
        <h3 className="text-2xl font-bold mb-4 text-gradient-purple">Active Games</h3>
        <p className="text-gray-400 text-lg">Connect your wallet to view and join active games</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-3xl font-bold text-gradient-purple mb-2">
            ⚡ Active Games
          </h3>
          <p className="text-gray-400">
            {games.length} games waiting for players • Sorted by bet amount
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-gray-800/50 backdrop-blur-sm px-4 py-2 rounded-xl border border-gray-700/50">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-300">Live</span>
        </div>
      </div>

      {games.length === 0 ? (
        <div className="glass-card text-center py-16">
          <div className="w-24 h-24 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🎯</span>
          </div>
          <h4 className="text-2xl font-bold text-gray-300 mb-3">No Active Games</h4>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Be the first to create a game and start the action! Other players are waiting to flip coins.
          </p>
          <div className="inline-flex items-center gap-2 text-purple-400 font-medium">
            <span>👈</span>
            <span>Click "CREATE" to start a new game</span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {games.map((game, index) => {
            const isOwnGame = publicKey && game.creator === publicKey.toBase58();
            const canJoin = game.status === 'active';
            const isInProgress = game.status === 'in_progress';
            
            return (
              <div
                key={game.id}
                className={`
                  group relative overflow-hidden bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border transition-all duration-300 hover:shadow-2xl hover:-translate-y-1
                  ${isOwnGame 
                    ? 'border-purple-500/50 bg-gradient-to-br from-purple-900/20 to-blue-900/20' 
                    : isInProgress 
                      ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-900/20 to-orange-900/20'
                      : 'border-gray-700/50 hover:border-gray-600/50'
                  }
                `}
              >
                {/* Rank Badge */}
                <div className="absolute top-4 left-4">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                    ${index === 0 
                      ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-gray-900' 
                      : index === 1 
                        ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-900'
                        : index === 2
                          ? 'bg-gradient-to-br from-amber-600 to-yellow-700 text-white'
                          : 'bg-gray-700 text-gray-300'
                    }
                  `}>
                    #{index + 1}
                  </div>
                </div>

                {/* Status Badges */}
                <div className="absolute top-4 right-4 flex gap-2">
                  {isOwnGame && (
                    <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-bold rounded-full">
                      Your Game
                    </span>
                  )}
                  {isInProgress && (
                    <span className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 text-xs font-bold rounded-full animate-pulse">
                      In Progress
                    </span>
                  )}
                </div>

                <div className="mt-8">
                  {/* Game Title */}
                  <div className="mb-6">
                    <h4 className="text-2xl font-bold text-white mb-2 group-hover:text-gradient-purple transition-all">
                      {game.lobbyName}
                    </h4>
                    <div className="flex items-center gap-2 text-gray-400">
                      <ClockIcon className="w-4 h-4" />
                      <span>Created {formatTimeAgo(game.createdAt)}</span>
                    </div>
                  </div>

                  {/* Game Info Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {/* Creator Info */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                        <UserIcon className="w-4 h-4" />
                        <span>Creator</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {isOwnGame ? 'YOU' : game.creator.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className={`font-mono font-bold ${
                            isOwnGame ? 'text-purple-400' : 'text-gray-300'
                          }`}>
                            {isOwnGame ? 'You' : truncateAddress(game.creator)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bet Amount */}
                    <div className="space-y-3">
                      <div className="text-gray-400 text-sm font-medium">Bet Amount</div>
                      <div>
                        <div className="text-2xl font-bold text-green-400">
                          {formatSol(game.betAmount)} SOL
                        </div>
                        <div className="text-gray-400 text-sm">
                          ≈ {formatEur(game.betAmountEur)}€
                        </div>
                      </div>
                    </div>

                    {/* Total Pot */}
                    <div className="space-y-3">
                      <div className="text-gray-400 text-sm font-medium">Total Pot</div>
                      <div>
                        <div className="text-2xl font-bold text-yellow-400">
                          {formatSol(game.betAmount * 2)} SOL
                        </div>
                        <div className="text-gray-400 text-sm">
                          Winner gets {formatSol(game.betAmount * 2 * 0.95)} SOL (95%)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Player Info (if in progress) */}
                  {isInProgress && game.player && (
                    <div className="mb-6 p-4 bg-yellow-900/20 rounded-xl border border-yellow-500/30">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                          <span className="text-gray-900 font-bold text-sm">
                            {game.player === publicKey?.toBase58() ? 'YOU' : game.player.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm text-yellow-400 font-medium">Player Joined</div>
                          <div className="font-mono font-bold text-white">
                            {game.player === publicKey?.toBase58() ? 'You' : truncateAddress(game.player)}
                          </div>
                        </div>
                        <div className="ml-auto text-yellow-400 animate-pulse">
                          Waiting for coin flip...
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Game ID */}
                      <div className="text-xs text-gray-500 font-mono">
                        ID: {game.id.slice(-8)}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isOwnGame ? (
                        <button
                          onClick={() => handleDeleteGame(game.id)}
                          disabled={loading || isInProgress}
                          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                          title="Delete game (95% refund)"
                        >
                          <TrashIcon className="w-4 h-4" />
                          Delete Game
                        </button>
                      ) : canJoin ? (
                        <button
                          onClick={() => handleJoinGame(game.id)}
                          disabled={loading}
                          className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                        >
                          <PlayIcon className="w-5 h-5" />
                          <span>Join & Flip</span>
                          <div className="text-xs opacity-80">
                            ({formatSol(game.betAmount)} SOL)
                          </div>
                        </button>
                      ) : isInProgress ? (
                        <div className="flex items-center gap-2 px-6 py-3 bg-yellow-600/20 border border-yellow-500/30 rounded-xl">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                          <span className="text-yellow-400 font-medium">Coin flip pending...</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5 pointer-events-none">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full transform translate-x-16 -translate-y-16"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-green-500 to-teal-600 rounded-full transform -translate-x-12 translate-y-12"></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Game Rules Info */}
      <div className="glass-card p-6">
        <h4 className="font-bold text-xl text-gradient-blue mb-4">🎯 How to Play</h4>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h5 className="font-semibold text-green-400 mb-2">For Players:</h5>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Click "Join & Flip" on any active game</li>
              <li>• Choose heads or tails after joining</li>
              <li>• Win 95% of total pot if you guess correctly</li>
              <li>• Self-play allowed (join your own games)</li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold text-purple-400 mb-2">Game Features:</h5>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Provably fair randomness on-chain</li>
              <li>• Instant payouts for winners</li>
              <li>• 24h auto-deletion with full refund</li>
              <li>• 5% platform fee on completed games</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};