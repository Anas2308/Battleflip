import { type FC, type ReactNode } from 'react';
import { WalletConnect } from './WalletConnect';

interface Props {
  children: ReactNode;
}

export const Layout: FC<Props> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header - CLEANED */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">BF</span>
              </div>
              <h1 className="text-2xl font-bold text-purple-400">BattleFlip</h1>
            </div>
            <WalletConnect />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-gray-400">
          <p>© 2025 BattleFlip - Built on Solana</p>
        </div>
      </footer>
    </div>
  );
};