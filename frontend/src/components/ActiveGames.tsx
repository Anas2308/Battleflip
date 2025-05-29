import { type FC } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import type { GameLobby } from '../types';
import { formatSol, formatEur, formatTimeAgo, truncateAddress } from '../utils';
import { TrashIcon, PlayIcon } from '@heroicons/react/24/outline';

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
      <div className="card text-center">
        <h3 className="text-xl font-bold mb-4 text-purple-400">Active Games</h3>
        <p className="text-gray-400">Connect your wallet to view active games</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-purple-400">
          Active Games ({games.length})
        </h3>
        <div className="text-sm text-gray-400">
          Sorted by bet amount
        </div>
      </div>

      {games.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-lg text-gray-400 mb-2">No active games</p>
          <p className="text-sm text-gray-500">Be the first to create a game!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {games.map((game) => {
            const isOwnGame = publicKey && game.creator === publicKey.toBase58();
            const canJoin = game.status === 'active';
            const isInProgress = game.status === 'in_progress';
            
            return (
              <div
                key={game.id}
                className={`
                  bg-gray-700 rounded-lg p-4 border transition-colors
                  ${isOwnGame ? 'border-purple-500/50 bg-purple-900/20' : 'border-gray-600'}
                  ${isInProgress ? 'border-yellow-500/50 bg-yellow-900/20' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  {/* Game Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-bold text-lg">{game.lobbyName}</h4>
                      {isOwnGame && (
                        <span className="px-2 py-1 bg-purple-600 text-xs rounded-full">
                          Your Game
                        </span>
                      )}
                      {isInProgress && (
                        <span className="px-2 py-1 bg-yellow-600 text-xs rounded-full">
                          In Progress
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-gray-400">Creator:</span>
                        <span className="ml-2 font-mono">
                          {isOwnGame ? 'You' : truncateAddress(game.creator)}
                        </span>
                      </div>
                      
                      <div>
                        <span className="text-gray-400">Bet:</span>
                        <span className="ml-2 font-bold text-green-400">
                          {formatSol(game.betAmount)} SOL
                        </span>
                        <span className="ml-1 text-gray-400">
                          (≈{formatEur(game.betAmountEur)}€)
                        </span>
                      </div>
                      
                      <div>
                        <span className="text-gray-400">Created:</span>
                        <span className="ml-2">{formatTimeAgo(game.createdAt)}</span>
                      </div>
                    </div>

                    {isInProgress && game.player && (
                      <div className="mt-2 text-sm">
                        <span className="text-gray-400">Player:</span>
                        <span className="ml-2 font-mono">
                          {game.player === publicKey?.toBase58() ? 'You' : truncateAddress(game.player)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {isOwnGame ? (
                      <button
                        onClick={() => handleDeleteGame(game.id)}
                        disabled={loading || isInProgress}
                        className="btn-danger flex items-center gap-2 px-4 py-2 text-sm"
                        title="Delete game (95% refund)"
                      >
                        <TrashIcon className="w-4 h-4" />
                        Delete
                      </button>
                    ) : canJoin ? (
                      <button
                        onClick={() => handleJoinGame(game.id)}
                        disabled={loading}
                        className="btn-primary flex items-center gap-2 px-6 py-2"
                      >
                        <PlayIcon className="w-4 h-4" />
                        Join & Flip
                      </button>
                    ) : isInProgress ? (
                      <div className="text-sm text-yellow-400 px-4 py-2">
                        Waiting for flip...
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Total Pot Information */}
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total Pot:</span>
                    <span className="font-bold text-green-400">
                      {formatSol(game.betAmount * 2)} SOL
                      <span className="text-gray-400 ml-1">
                        (≈{formatEur(game.betAmountEur * 2)}€)
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Winner gets:</span>
                    <span>
                      {formatSol(game.betAmount * 2 * 0.95)} SOL (95%)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info Box - CLEANED */}
      <div className="mt-6 p-4 bg-blue-900/20 rounded-lg border border-blue-500/30">
        <h4 className="font-medium text-blue-300 mb-2">Game Rules:</h4>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• Click "Join & Flip" to enter any game</li>
          <li>• You'll choose heads or tails after joining</li>
          <li>• Winner gets 95% of the total pot</li>
          <li>• Self-play is allowed (you can join your own games)</li>
          <li>• Games auto-delete after 24 hours</li>
        </ul>
      </div>
    </div>
  );
};