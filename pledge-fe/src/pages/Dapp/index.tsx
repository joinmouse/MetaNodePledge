import 'firebase/firestore';
import './index.less';

import React, { StrictMode } from 'react';

import ApplicationUpdater from '_src/state/application/updater';
import Header from '_components/Header';
import ListsUpdater from '_src/state/lists/updater';
import MulticallUpdater from '_src/state/multicall/updater';
import Providers from './Providers';
import { ResetCSS } from '@pancakeswap-libs/uikit';
import Routes from './routes';
import ToastListener from '_components/ToastListener';
import TransactionUpdater from '_src/state/transactions/updater';
import { WebLayout } from '_src/Layout';

const PortfolioPage: React.FC = () => (
  <StrictMode>
    <Providers>
      <>
        <ListsUpdater />
        <ApplicationUpdater />
        <TransactionUpdater />
        <MulticallUpdater />
        <ToastListener />
      </>
      <WebLayout className="dapp-page">
        <Header />
        <div className="dapp-router-page">
          <ResetCSS />
          <Routes />
        </div>
      </WebLayout>
    </Providers>
  </StrictMode>
);

export default PortfolioPage;
