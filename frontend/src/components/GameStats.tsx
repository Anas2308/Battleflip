import { type FC } from 'react';
import type { GameStats as GameStatsType } from '../types';
import { formatSol, formatEur } from '../utils';
import { ChartBarIcon, CurrencyDollarIcon, PlayIcon } from '@heroicons/react/24/outline';

interface Props {
  stats: GameStatsType;
  solEurRate: number;
}

export const GameStats: FC<Props> = ({ stats, solEurRate }) => {
  const statItems = [
    {
      label: 'Active Games',
      value: stats.activeGames.toString(),
      icon: PlayIcon,
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/20',
      borderColor: 'border-purple-500/30'
    },
    {
      label: 'Total Volume',
      value: `${formatSol(stats.totalVolume)} SOL`,
      subValue: `≈ ${formatEur(stats.totalVolumeEur)}€`,
      icon: CurrencyDollarIcon,
      color: 'text-green-400',
      bgColor: 'bg-green-900/20',
      borderColor: 'border-green-500/30'
    },
    {
      label: 'Games Played',
      value: stats.gamesPlayed.toString(),
      icon: ChartBarIcon,
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20',
      borderColor: 'border-blue-500/30'
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
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg ${item.bgColor}`}>
              <item.icon className={`w-6 h-6 ${item.color}`} />
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${item.color}`}>
                {item.value}
              </div>
              {item.subValue && (
                <div className="text-sm text-gray-400 mt-1">
                  {item.subValue}
                </div>
              )}
            </div>
          </div>
          
          <div className="text-gray-400 font-medium">
            {item.label}
          </div>
          
          {/* Progress bar for active games */}
          {item.label === 'Active Games' && (
            <div className="mt-3">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min((stats.activeGames / 10) * 100, 100)}%` 
                  }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {stats.activeGames}/10 games active
              </div>
            </div>
          )}
          
          {/* Volume trend indicator */}
          {item.label === 'Total Volume' && stats.totalVolume > 0 && (
            <div className="mt-3 flex items-center gap-2">
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
            <div className="mt-3">
              <div className="text-xs text-gray-500">
                Platform fee collected: {formatSol(stats.totalVolume * 0.05)} SOL
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};