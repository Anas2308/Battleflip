import { type FC } from 'react';
import { WalletContextProvider } from './providers/WalletProvider';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';

const App: FC = () => {
  return (
    <WalletContextProvider>
      <Layout>
        <Home />
      </Layout>
    </WalletContextProvider>
  );
};

export default App;