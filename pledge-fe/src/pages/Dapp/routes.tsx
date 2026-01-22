import React, { Suspense } from 'react';
import {
  RedirectDuplicateTokenIds,
  RedirectOldAddLiquidityPathStructure,
} from '_src/pages/Dapp/Dex//AddLiquidity/redirects';
import { Route, Switch } from 'react-router-dom';

import AddLiquidity from '_src/pages/Dapp/Dex/AddLiquidity';
import DappHome from '_src/pages/Dapp/Home';
import Dex from '_src/pages/Dapp/Dex';
import Loading from '_components/Loading';
import MarketMode from '_src/pages/Dapp/Market_Mode';
import MarketPool from '_src/pages/Dapp/Market_Pool';
import PoolFinder from '_src/pages/Dapp/Dex/PoolFinder';
import { RedirectOldRemoveLiquidityPathStructure } from '_src/pages/Dapp/Dex/RemoveLiquidity/redirects';
import RemoveLiquidity from '_src/pages/Dapp/Dex/RemoveLiquidity';
import pageURL from '_constants/pageURL';

const routeMap = [
  // Pool Routes(首页)
  {
    path: pageURL.Dapp,
    component: DappHome,
    exact: true,
    dynamic: false,
  },
  {
    path: pageURL.Market,
    component: DappHome,
    exact: true,
    dynamic: false,
  },
  {
    path: pageURL.Market_Pool,
    component: MarketPool,
    exact: true,
    dynamic: true,
  },
  {
    path: pageURL.Lend_Borrow,
    component: MarketMode,
    exact: true,
    dynamic: true,
  },
  {
    path: pageURL.DEX_Swap,
    component: Dex,
    exact: true,
    dynamic: true,
  },
  {
    path: pageURL.Find,
    component: PoolFinder,
    exact: true,
    dynamic: true,
  },
  {
    path: pageURL.Add,
    component: AddLiquidity,
    exact: true,
    dynamic: true,
  },
  {
    path: pageURL.Add_Single,
    component: RedirectOldAddLiquidityPathStructure,
    exact: true,
    dynamic: true,
  },
  {
    path: pageURL.Add_Double,
    component: RedirectDuplicateTokenIds,
    exact: true,
    dynamic: true,
  },
  {
    path: pageURL.Remove_Tokens,
    component: RedirectOldRemoveLiquidityPathStructure,
    exact: true,
    dynamic: true,
  },
  {
    path: pageURL.Remove_Liquidity,
    component: RemoveLiquidity,
    exact: true,
    dynamic: true,
  },
  {
    path: '*',
    component: DappHome,
    exact: true,
    dynamic: false,
  },
];

// Define the Routes component
const Routes = () => (
  <Suspense fallback={<Loading />}>
    <Switch>
      {routeMap.map((item) => (
        <Route key={item.path} path={item.path} exact={item.exact} component={item.component} />
      ))}
    </Switch>
  </Suspense>
);

export default Routes;
