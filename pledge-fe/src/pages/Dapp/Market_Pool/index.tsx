import './index.less';

import React, { useEffect, useState } from 'react';
import { useHistory, useRouteMatch } from 'react-router-dom';

import Coin_pool from '_components/Coin_pool';
import { DappLayout } from '_src/Layout';
import { Tabs } from 'antd';

type Iparams = {
  coin: string;
  pool: 'BUSD' | 'USDC' | 'DAI';
  mode: 'Borrower' | 'Lender';
};
function MarketPage() {
  const history = useHistory();
  const { url: routeUrl, params } = useRouteMatch<Iparams>();
  const { coin, pool, mode } = params;

  const callback = (key) => {
    history.push(key);
  };
  useEffect(() => {}, []);
  console.log(params);
  return (
    <DappLayout className="dapp_coin_page">
      <Tabs 
        defaultActiveKey="1" 
        onChange={callback} 
        activeKey={mode}
        items={[
          {
            key: 'Lender',
            label: 'Lender',
            children: <Coin_pool mode="Lend" pool={pool} coin={coin} />
          },
          {
            key: 'Borrower',
            label: 'Borrower',
            children: <Coin_pool mode="Borrow" pool={pool} coin={coin} />
          }
        ]}
      />
    </DappLayout>
  );
}

export default MarketPage;
