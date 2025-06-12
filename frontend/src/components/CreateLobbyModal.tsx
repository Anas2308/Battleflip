import { type FC, useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreateGame: (lobbyName: string, betAmount: number) => Promise<boolean>;
  minBetSol: number;
  solEurRate: number;
  loading: boolean;
}

export const CreateLobbyModal: FC<Props> = ({ 
  isOpen, 
  onClose, 
  onCreateGame, 
  minBetSol, 
  solEurRate,
  loading 
}) => {
  const [lobbyName, setLobbyName] = useState('');
  const [betAmount, setBetAmount] = useState('');

  console.log('🎯 CreateLobbyModal render, isOpen:', isOpen);
  
  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🎯 Form submitted:', { lobbyName, betAmount });
    
    const betAmountNum = parseFloat(betAmount);
    if (lobbyName && betAmountNum > 0) {
      const success = await onCreateGame(lobbyName, betAmountNum);
      if (success) {
        setLobbyName('');
        setBetAmount('');
        onClose();
      }
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          padding: '32px',
          borderRadius: '12px',
          maxWidth: '450px',
          width: '90%'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h3 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            margin: 0
          }}>
            Create Lobby
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Lobby Name
            </label>
            <input
              type="text"
              value={lobbyName}
              onChange={(e) => setLobbyName(e.target.value)}
              placeholder="Enter lobby name"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px'
              }}
              maxLength={20}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Bet Amount (SOL)
            </label>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              placeholder="Min: 0.003 SOL"
              step="0.001"
              min="0.003"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!lobbyName || !betAmount || loading}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                borderRadius: '6px',
                background: 'black',
                color: 'white',
                cursor: 'pointer',
                opacity: (!lobbyName || !betAmount || loading) ? 0.5 : 1
              }}
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};