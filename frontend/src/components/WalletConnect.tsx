import { type FC } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const WalletConnect: FC = () => {
  const { publicKey } = useWallet();

  return (
    <div className="flex items-center">
      <WalletMultiButton 
        className="!bg-white !text-black !border !border-gray-300 !rounded-lg !px-6 !py-3 !font-medium hover:!bg-gray-50 transition-colors !shadow-none" 
      />
    </div>
  );
};