import { type FC, type ReactNode } from 'react';
import { WalletConnect } from './WalletConnect';

interface Props {
  children: ReactNode;
}

export const Layout: FC<Props> = ({ children }) => {
  return (
    <div className="min-h-screen bg-white text-black">
      {/* Minimaler Header */}
      <header className="w-full py-6 px-8">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Solana Logo/Text links */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <div className="w-6 h-1 bg-black mb-1"></div>
              <div className="w-6 h-1 bg-black mb-1"></div>
              <div className="w-6 h-1 bg-black"></div>
            </div>
            <span className="text-2xl font-bold text-black ml-2">SOLANA</span>
          </div>

          {/* Connect Wallet Button rechts */}
          <WalletConnect />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8">
        {children}
      </main>
    </div>
  );
};