import { type FC } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const WalletConnect: FC = () => {
  const { publicKey, connected } = useWallet();

  return (
    <div className="flex items-center gap-4">
      {/* Custom styled wallet button */}
      <div className="wallet-button-container">
        <WalletMultiButton 
          style={{
            backgroundColor: 'white',
            color: 'black',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            padding: '8px 16px',
            fontFamily: 'inherit',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s',
          }}
        />
      </div>
      
      {/* Connection indicator */}
      {connected && publicKey && (
        <div className="hidden md:block text-sm text-gray-600">
          {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
        </div>
      )}
    </div>
  );
};