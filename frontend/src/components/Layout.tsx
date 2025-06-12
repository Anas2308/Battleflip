import { type FC, type ReactNode } from 'react';
import { WalletConnect } from './WalletConnect';

interface Props {
  children: ReactNode;
}

export const Layout: FC<Props> = ({ children }) => {
  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header - FORCED INLINE STYLES */}
      <header 
        style={{
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          zIndex: '50'
        }}
      >
        <div style={{ position: 'relative', padding: '16px 24px' }}>
          {/* Left: Logo */}
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            color: 'black',
            margin: '0'
          }}>
            SOLANA
          </h1>
          
          {/* Right: Connect Wallet - ABSOLUTE POSITIONED */}
          <div style={{
            position: 'absolute',
            top: '5px',
            right: '24px'
          }}>
            <WalletConnect />
          </div>
        </div>
      </header>

      {/* Main Content - FORCED PADDING */}
      <main style={{ 
        padding: '32px 24px', 
        paddingTop: '96px' 
      }}>
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="px-6 py-4 text-center text-gray-500">
          <p>© 2025 BattleFlip - Built on Solana</p>
        </div>
      </footer>
    </div>
  );
};