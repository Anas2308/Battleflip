import { type FC } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

export const Home: FC = () => {
  const { connected } = useWallet();

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-12">
        <h2 className="text-4xl font-bold mb-4">
          Welcome to <span className="text-purple-400">BattleFlip</span>
        </h2>
        <p className="text-xl text-gray-400">
          The ultimate coin-flip gambling experience on Solana
        </p>
      </div>

      {/* Connection Status */}
      {!connected ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-lg mb-4">Connect your wallet to start playing!</p>
          <div className="flex justify-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">👻</span>
              <span>Phantom</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">☀️</span>
              <span>Solflare</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-8">
          {/* Create Game */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-2xl font-bold mb-4 text-purple-400">Create Game</h3>
            <p className="text-gray-400 mb-4">
              Create a new coin-flip game and wait for an opponent
            </p>
            <button className="btn-primary w-full">
              Create New Game
            </button>
          </div>

          {/* Join Game */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-2xl font-bold mb-4 text-purple-400">Join Game</h3>
            <p className="text-gray-400 mb-4">
              Browse available games and challenge other players
            </p>
            <button className="btn-primary w-full">
              Browse Games
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-3xl font-bold text-purple-400">0</p>
          <p className="text-gray-400">Active Games</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-3xl font-bold text-purple-400">0 SOL</p>
          <p className="text-gray-400">Total Volume</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-3xl font-bold text-purple-400">0</p>
          <p className="text-gray-400">Games Played</p>
        </div>
      </div>
    </div>
  );
};