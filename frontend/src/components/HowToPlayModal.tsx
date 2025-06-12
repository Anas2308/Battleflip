import { type FC } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{
          padding: '32px',
          maxWidth: '500px'
        }}
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
            color: 'black',
            margin: '0'
          }}>
            How to Play
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            className="hover:bg-gray-100"
          >
            <XMarkIcon style={{ width: '24px', height: '24px', color: '#6b7280' }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {/* Step 1 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'black',
                color: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '14px',
                flexShrink: 0
              }}>
                1
              </div>
              <div>
                <h4 style={{ 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  marginBottom: '4px', 
                  color: 'black',
                  margin: '0 0 4px 0'
                }}>
                  Create a lobby with your bet
                </h4>
                <p style={{ 
                  fontSize: '14px', 
                  color: '#6b7280',
                  margin: '0'
                }}>
                  Choose a unique lobby name and bet amount (min 0.003 SOL ≈ 0.50€)
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'black',
                color: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '14px',
                flexShrink: 0
              }}>
                2
              </div>
              <div>
                <h4 style={{ 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  marginBottom: '4px', 
                  color: 'black',
                  margin: '0 0 4px 0'
                }}>
                  Wait for another player to join
                </h4>
                <p style={{ 
                  fontSize: '14px', 
                  color: '#6b7280',
                  margin: '0'
                }}>
                  Your lobby appears in the Active Games list for other players to join
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'black',
                color: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '14px',
                flexShrink: 0
              }}>
                3
              </div>
              <div>
                <h4 style={{ 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  marginBottom: '4px', 
                  color: 'black',
                  margin: '0 0 4px 0'
                }}>
                  Player joins and flips the coin
                </h4>
                <p style={{ 
                  fontSize: '14px', 
                  color: '#6b7280',
                  margin: '0'
                }}>
                  The joining player chooses heads or tails and the blockchain decides the result
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'black',
                color: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '14px',
                flexShrink: 0
              }}>
                4
              </div>
              <div>
                <h4 style={{ 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  marginBottom: '4px', 
                  color: 'black',
                  margin: '0 0 4px 0'
                }}>
                  Winner takes 95% of the pot
                </h4>
                <p style={{ 
                  fontSize: '14px', 
                  color: '#6b7280',
                  margin: '0'
                }}>
                  5% goes to platform fees, winner gets the rest automatically
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Updated Info Box */}
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#1e293b',
            marginBottom: '8px',
            margin: '0 0 8px 0'
          }}>
            💡 Important Rules
          </h4>
          <ul style={{
            fontSize: '12px',
            color: '#64748b',
            margin: '0',
            paddingLeft: '16px',
            lineHeight: '1.5'
          }}>
            <li>You cannot join your own games (no self-play)</li>
            <li>You can delete your own games (95% refund, 5% fee)</li>
            <li>Games auto-delete after 24 hours (100% refund)</li>
            <li>Minimum bet: ~0.50€ in SOL</li>
            <li>Results are provably fair via blockchain</li>
          </ul>
        </div>

        {/* OK Button */}
        <button
          onClick={onClose}
          className="btn-primary w-full"
          style={{ width: '100%' }}
        >
          Got it!
        </button>
      </div>
    </div>
  );
};