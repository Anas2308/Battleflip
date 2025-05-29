import { type FC } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const WalletConnect: FC = () => {
  const { publicKey } = useWallet();

  return (
    <div className="flex items-center gap-4">
      <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 transition-colors" />
      {publicKey && (
        <div className="text-sm text-gray-400">
          Connected: {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
        </div>
      )}
    </div>
  );
};