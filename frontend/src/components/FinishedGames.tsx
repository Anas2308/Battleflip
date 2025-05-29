import { type FC } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import type { FinishedGame } from '../types';
import { formatSol, formatEur, formatTimeAgo, truncateAddress } from '../utils';
import { TrophyIcon, FireIcon, ChartBarIcon } from '@heroicons/react/24/solid';

interface Props {
  games: FinishedGame[];
}

export const FinishedGames: FC<Props> = ({ games }) => {
  const { publicKey, connected } = useWallet();

  if (!connected) {
    return (
      <div className="card text-center">
        <h3 className="text-xl font-bold mb-4 text-purple-400">Recent Games</h3>
        <p className="text-gray-400">Connect your wallet to view recent games</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-purple-400">
          Recent Games ({games.length})
        </h3>
        <div className="text-sm text-gray-400">
          Last 24 hours
        </div>
      </div>

      {games.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-lg text-gray-400 mb-2">No recent games</p>
          <p className="text-sm text-gray-500">Finished games will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {games.map((game) => {
            const userIsCreator = publicKey && game.creator === publicKey.toBase58();
            const userIsPlayer = publicKey && game.player === publicKey.toBase58();
            const userWon = publicKey && game.winner === publicKey.toBase58();
            const userParticipated = userIsCreator || userIsPlayer;
            
            return (
              <div
                key={game.id}
                className={`
                  bg-gray-700 rounded-lg p-4 border transition-colors
                  ${userParticipated 
                    ? userWon 
                      ? 'border-green-500/50 bg-green-900/20' 
                      : 'border-red-500/50 bg-red-900/20'
                    : 'border-gray-600'
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  {/* Game Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-bold text-lg">{game.lobbyName}</h4>
                      
                      {userParticipated && (
                        <span className={`
                          px-2 py-1 text-xs rounded-full flex items-center gap-1
                          ${userWon 
                            ? 'bg-green-600 text-green-100' 
                            : 'bg-red-600 text-red-100'
                          }
                        `}>
                          {userWon ? (
                            <>
                              <TrophyIcon className="w-3 h-3" />
                              WON
                            </>
                          ) : (
                            <>
                              <FireIcon className="w-3 h-3" />
                              LOST
                            </>
                          )}
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {/* Players */}
                      <div className="space-y-1">
                        <div>
                          <span className="text-gray-400">Creator:</span>
                          <span className={`ml-2 font-mono ${
                            userIsCreator ? 'text-purple-400 font-bold' : ''
                          }`}>
                            {userIsCreator ? 'You' : truncateAddress(game.creator)}
                          </span>
                          {game.winner === game.creator && (
                            <TrophyIcon className="w-4 h-4 inline ml-1 text-yellow-500" />
                          )}
                        </div>
                        
                        <div>
                          <span className="text-gray-400">Player:</span>
                          <span className={`ml-2 font-mono ${
                            userIsPlayer ? 'text-purple-400 font-bold' : ''
                          }`}>
                            {userIsPlayer ? 'You' : truncateAddress(game.player)}
                          </span>
                          {game.winner === game.player && (
                            <TrophyIcon className="w-4 h-4 inline ml-1 text-yellow-500" />
                          )}
                        </div>
                      </div>

                      {/* Game Details */}
                      <div className="space-y-1">
                        <div>
                          <span className="text-gray-400">Total Bet:</span>
                          <span className="ml-2 font-bold text-green-400">
                            {formatSol(game.betAmount)} SOL
                          </span>
                          <span className="ml-1 text-gray-400">
                            (≈{formatEur(game.betAmountEur)}€)
                          </span>
                        </div>
                        
                        <div>
                          <span className="text-gray-400">Finished:</span>
                          <span className="ml-2">{formatTimeAgo(game.finishedAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Result Details */}
                    <div className="mt-3 pt-3 border-t border-gray-600">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-sm">
                            <span className="text-gray-400">Choice:</span>
                            <span className="ml-2 font-bold text-blue-400">
                              {game.choice.toUpperCase()}
                            </span>
                          </div>
                          
                          <div className="text-sm">
                            <span className="text-gray-400">Result:</span>
                            <span className="ml-2 font-bold text-yellow-400">
                              {game.result.toUpperCase()}
                            </span>
                            <span className="ml-2 text-xl">
                              {game.result === 'heads' ? '👑' : '🔥'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm text-gray-400">Winner Payout:</div>
                          <div className="font-bold text-green-400">
                            {formatSol(game.betAmount * 0.95)} SOL
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Statistics - CLEANED */}
      {games.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-600">
          <h4 className="font-medium text-gray-300 mb-3">Statistics</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-400">
                {games.length}
              </div>
              <div className="text-gray-400">Total Games</div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-400">
                {formatSol(games.reduce((sum, game) => sum + game.betAmount, 0))}
              </div>
              <div className="text-gray-400">Total Volume (SOL)</div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {games.filter(game => 
                  publicKey && game.winner === publicKey.toBase58()
                ).length}
              </div>
              <div className="text-gray-400">Your Wins</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};