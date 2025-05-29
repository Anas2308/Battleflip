import { type FC, useState, useEffect } from 'react';
import type { CoinSide } from '../types';

interface Props {
  onFlip: (choice: CoinSide) => Promise<boolean>;
  loading: boolean;
  gameId: string;
  lobbyName: string;
  betAmount: number;
  totalPot: number;
}

export const CoinFlip: FC<Props> = ({ 
  onFlip, 
  loading, 
  gameId, 
  lobbyName, 
  betAmount, 
  totalPot 
}) => {
  const [selectedChoice, setSelectedChoice] = useState<CoinSide | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState<CoinSide | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleFlip = async () => {
    if (!selectedChoice || loading) return;

    setIsFlipping(true);
    setShowResult(false);
    
    // Start coin animation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const success = await onFlip(selectedChoice);
    
    if (success) {
      // Simulate getting result (in real app, this would come from the blockchain)
      const coinResult = Math.random() < 0.5 ? 'heads' : 'tails';
      setResult(coinResult);
      setShowResult(true);
    }
    
    setIsFlipping(false);
  };

  const resetGame = () => {
    setSelectedChoice(null);
    setResult(null);
    setShowResult(false);
    setIsFlipping(false);
  };

  useEffect(() => {
    // Reset when gameId changes
    resetGame();
  }, [gameId]);

  return (
    <div className="card max-w-md mx-auto">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2 text-purple-400">
          {lobbyName}
        </h3>
        <p className="text-gray-400 mb-6">
          Total Pot: <span className="text-green-400 font-bold">{totalPot} SOL</span>
        </p>

        {/* Coin Display */}
        <div className="flex justify-center mb-8">
          <div className={`
            w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold
            transition-all duration-1000 transform
            ${isFlipping ? 'animate-spin coin-flip' : ''}
            ${result === 'heads' ? 'bg-yellow-500 text-white' : 
              result === 'tails' ? 'bg-gray-600 text-white' : 
              'bg-gradient-to-br from-yellow-500 to-gray-600 text-white'}
          `}>
            {showResult ? (
              result === 'heads' ? '👑' : '🔥'
            ) : isFlipping ? (
              '🎯'
            ) : (
              '🪙'
            )}
          </div>
        </div>

        {/* Result Display */}
        {showResult && result && (
          <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/50">
            <div className="text-2xl font-bold mb-2">
              Result: <span className="text-yellow-400">{result.toUpperCase()}</span>
            </div>
            <div className={`text-lg ${
              selectedChoice === result ? 'text-green-400' : 'text-red-400'
            }`}>
              You {selectedChoice === result ? 'WON!' : 'LOST!'}
            </div>
            {selectedChoice === result && (
              <div className="text-sm text-gray-300 mt-2">
                You won {(totalPot * 0.95).toFixed(4)} SOL!
              </div>
            )}
          </div>
        )}

        {/* Choice Selection */}
        {!showResult && (
          <>
            <div className="mb-6">
              <p className="text-lg mb-4">Choose your side:</p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setSelectedChoice('heads')}
                  disabled={isFlipping || loading}
                  className={`
                    px-6 py-4 rounded-lg border-2 transition-all transform hover:scale-105
                    ${selectedChoice === 'heads' 
                      ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400' 
                      : 'border-gray-600 hover:border-yellow-500/50'
                    }
                  `}
                >
                  <div className="text-3xl mb-2">👑</div>
                  <div className="font-bold">HEADS</div>
                </button>
                
                <button
                  onClick={() => setSelectedChoice('tails')}
                  disabled={isFlipping || loading}
                  className={`
                    px-6 py-4 rounded-lg border-2 transition-all transform hover:scale-105
                    ${selectedChoice === 'tails' 
                      ? 'border-gray-400 bg-gray-600/20 text-gray-300' 
                      : 'border-gray-600 hover:border-gray-400/50'
                    }
                  `}
                >
                  <div className="text-3xl mb-2">🔥</div>
                  <div className="font-bold">TAILS</div>
                </button>
              </div>
            </div>

            {/* Flip Button */}
            <button
              onClick={handleFlip}
              disabled={!selectedChoice || isFlipping || loading}
              className="btn-primary w-full text-lg py-4"
            >
              {isFlipping ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Flipping Coin...
                </span>
              ) : selectedChoice ? (
                `Flip for ${selectedChoice.toUpperCase()}!`
              ) : (
                'Choose Heads or Tails'
              )}
            </button>
          </>
        )}

        {/* Play Again Button */}
        {showResult && (
          <button
            onClick={resetGame}
            className="btn-secondary w-full mt-4"
          >
            Close Result
          </button>
        )}

        {/* Game Info */}
        <div className="mt-6 p-4 bg-gray-700 rounded-lg text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-400">Your Bet:</span>
              <div className="font-bold">{betAmount} SOL</div>
            </div>
            <div>
              <span className="text-gray-400">Potential Win:</span>
              <div className="font-bold text-green-400">
                {(totalPot * 0.95).toFixed(4)} SOL
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};