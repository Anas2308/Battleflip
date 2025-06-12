import { type FC, useState } from 'react';
import type { CoinFlipModalData, CoinFlipPhase, CoinFlipResult } from '../hooks/useModals';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: CoinFlipModalData | null;
  phase: CoinFlipPhase;
  result: CoinFlipResult | null;
  onFlip: (choice: 'heads' | 'tails') => Promise<void>;
  loading: boolean;
}

export const CoinFlipModal: FC<Props> = ({ 
  isOpen, 
  onClose, 
  data, 
  phase, 
  result, 
  onFlip,
  loading 
}) => {
  const [selectedChoice, setSelectedChoice] = useState<'heads' | 'tails' | null>(null);

  if (!isOpen || !data) return null;

  const handleChoiceClick = async (choice: 'heads' | 'tails') => {
    setSelectedChoice(choice);
    await onFlip(choice);
  };

  const handleClose = () => {
    setSelectedChoice(null);
    onClose();
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={phase === 'result' ? handleClose : undefined}
    >
      <div 
        style={{
          backgroundColor: 'white',
          padding: '32px',
          borderRadius: '16px',
          maxWidth: '480px',
          width: '90%',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h3 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            margin: 0,
            color: 'black'
          }}>
            {data.isResume ? 'Resume Game' : 'Coin Flip'}
          </h3>
          {phase !== 'flipping' && (
            <button
              onClick={handleClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666',
                padding: '4px'
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Game Info */}
        <div style={{ marginBottom: '32px' }}>
          <h4 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: 'black',
            marginBottom: '8px',
            margin: '0 0 8px 0'
          }}>
            {data.lobbyName}
          </h4>
          <div style={{
            fontSize: '14px',
            color: '#6b7280',
            display: 'flex',
            justifyContent: 'center',
            gap: '24px',
            flexWrap: 'wrap'
          }}>
            <span>Your Bet: <strong>{data.betAmount.toFixed(4)} SOL</strong></span>
            <span>Total Pot: <strong style={{ color: '#059669' }}>{data.totalPot.toFixed(4)} SOL</strong></span>
            <span>Win Amount: <strong style={{ color: '#059669' }}>{data.totalPot.toFixed(4)} SOL</strong></span>
          </div>
        </div>

        {/* PHASE 1: SELECTION */}
        {phase === 'selection' && (
          <>
            {/* Coin Display */}
            <div style={{
              fontSize: '80px',
              marginBottom: '32px',
              display: 'flex',
              justifyContent: 'center'
            }}>
              🪙
            </div>

            <p style={{
              fontSize: '18px',
              fontWeight: '600',
              color: 'black',
              marginBottom: '32px',
              margin: '0 0 32px 0'
            }}>
              Choose your side:
            </p>

            {/* Choice Buttons */}
            <div style={{
              display: 'flex',
              gap: '20px',
              justifyContent: 'center',
              marginBottom: '24px'
            }}>
              <button
                onClick={() => handleChoiceClick('heads')}
                disabled={loading}
                style={{
                  padding: '24px 32px',
                  border: '3px solid #e5e7eb',
                  borderRadius: '16px',
                  background: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: '700',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.2s',
                  opacity: loading ? 0.5 : 1,
                  minWidth: '120px'
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    e.currentTarget.style.borderColor = '#fbbf24';
                    e.currentTarget.style.backgroundColor = '#fef3c7';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseLeave={e => {
                  if (!loading) {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
              >
                <span style={{ fontSize: '32px' }}>👑</span>
                <span style={{ color: '#000' }}>HEADS</span>
              </button>
              
              <button
                onClick={() => handleChoiceClick('tails')}
                disabled={loading}
                style={{
                  padding: '24px 32px',
                  border: '3px solid #e5e7eb',
                  borderRadius: '16px',
                  background: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: '700',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.2s',
                  opacity: loading ? 0.5 : 1,
                  minWidth: '120px'
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    e.currentTarget.style.borderColor = '#ef4444';
                    e.currentTarget.style.backgroundColor = '#fee2e2';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseLeave={e => {
                  if (!loading) {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
              >
                <span style={{ fontSize: '32px' }}>🔥</span>
                <span style={{ color: '#000' }}>TAILS</span>
              </button>
            </div>
          </>
        )}

        {/* PHASE 2: FLIPPING */}
        {phase === 'flipping' && (
          <>
            <div style={{
              fontSize: '80px',
              marginBottom: '32px',
              display: 'flex',
              justifyContent: 'center',
              animation: 'spin 1s linear infinite'
            }}>
              🌀
            </div>

            <p style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#d97706',
              marginBottom: '16px',
              margin: '0 0 16px 0'
            }}>
              Flipping the coin...
            </p>

            {selectedChoice && (
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: '0'
              }}>
                You chose: <strong>{selectedChoice.toUpperCase()}</strong>
              </p>
            )}

            <div style={{
              marginTop: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              color: '#6b7280'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #e5e7eb',
                borderTop: '2px solid #6b7280',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              Processing on blockchain...
            </div>
          </>
        )}

        {/* PHASE 3: RESULT */}
        {phase === 'result' && result && (
          <>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'center'
            }}>
              {result.result === 'heads' ? '👑' : '🔥'}
            </div>

            <div style={{
              marginBottom: '24px',
              padding: '24px',
              borderRadius: '12px',
              backgroundColor: result.won ? '#dcfce7' : '#fee2e2',
              border: `2px solid ${result.won ? '#16a34a' : '#dc2626'}`
            }}>
              <h3 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: result.won ? '#16a34a' : '#dc2626',
                marginBottom: '8px',
                margin: '0 0 8px 0'
              }}>
                {result.won ? '🎉 CONGRATULATIONS!' : '😢 YOU LOST!'}
              </h3>
              
              <p style={{
                fontSize: '16px',
                color: result.won ? '#15803d' : '#b91c1c',
                marginBottom: '12px',
                margin: '0 0 12px 0'
              }}>
                Result: <strong>{result.result.toUpperCase()}</strong> • You chose: <strong>{result.choice.toUpperCase()}</strong>
              </p>

              {result.won ? (
                <p style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#15803d',
                  margin: '0'
                }}>
                  You won {data.totalPot.toFixed(4)} SOL! 💰
                </p>
              ) : (
                <p style={{
                  fontSize: '16px',
                  color: '#b91c1c',
                  margin: '0'
                }}>
                  Better luck next time! The pot goes to your opponent.
                </p>
              )}
            </div>

            {/* Action Button */}
            {result.won ? (
              <button
                onClick={handleClose}
                style={{
                  backgroundColor: '#16a34a',
                  color: 'white',
                  border: 'none',
                  padding: '16px 32px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  width: '100%',
                  marginBottom: '16px'
                }}
              >
                🏆 CLAIM WINNINGS
              </button>
            ) : (
              <button
                onClick={handleClose}
                style={{
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '16px 32px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  width: '100%',
                  marginBottom: '16px'
                }}
              >
                OK
              </button>
            )}

            <button
              onClick={handleClose}
              style={{
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Back to Games
            </button>
          </>
        )}
      </div>
    </div>
  );
};