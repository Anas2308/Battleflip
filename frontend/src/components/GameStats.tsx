import { type FC } from 'react';
import type { GameStats as GameStatsType } from '../types';
import { formatSol, formatEur } from '../utils';

interface Props {
  stats: GameStatsType;
  solEurRate: number;
}

export const GameStats: FC<Props> = ({ stats, solEurRate }) => {
  const statItems = [
    {
      label: 'Active Games',
      value: stats.activeGames.toString(),
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/20',
      borderColor: 'border-purple-500/30',
      showProgress: true
    },
    {
      label: 'Total Volume',
      value: `${formatSol(stats.totalVolume)} SOL`,
      subValue: `≈ ${formatEur(stats.totalVolumeEur)}€`,
      color: 'text-green-400',
      bgColor: 'bg-green-900/20',
      borderColor: 'border-green-500/30',
      showProgress: false
    },
    {
      label: 'Games Played',
      value: stats.gamesPlayed.toString(),
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20',
      borderColor: 'border-blue-500/30',
      showProgress: false
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {statItems.map((item, index) => (
        <div
          key={index}
          className={`
            rounded-xl p-6 border transition-all duration-300 hover:scale-105
            ${item.bgColor} ${item.borderColor}
          `}
        >
          {/* Main Stats - NO ICONS */}
          <div className="text-center mb-4">
            <div className={`text-3xl font-bold ${item.color} mb-2`}>
              {item.value}
            </div>
            {item.subValue && (
              <div className="text-sm text-gray-400">
                {item.subValue}
              </div>
            )}
          </div>
          
          <div className="text-gray-400 font-medium text-center">
            {item.label}
          </div>
          
          {/* Progress bar for active games */}
          {item.showProgress && (
            <div className="mt-4">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min((stats.activeGames / 10) * 100, 100)}%` 
                  }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-2 text-center">
                {stats.activeGames}/10 games active
              </div>
            </div>
          )}
          
          {/* Volume trend indicator */}
          {item.label === 'Total Volume' && stats.totalVolume > 0 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="flex items-center text-green-400 text-sm">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
                Growing
              </div>
            </div>
          )}
          
          {/* Games completion rate */}
          {item.label === 'Games Played' && stats.gamesPlayed > 0 && (
            <div className="mt-4">
              <div className="text-xs text-gray-500 text-center">
                Platform fee collected: {formatSol(stats.totalVolume * 0.05)} SOL
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};