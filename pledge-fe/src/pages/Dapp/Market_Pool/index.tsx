import './index.less';

import { useHistory, useRouteMatch } from 'react-router-dom';

import CoinPool from '_components/Coin_pool';
import { DappLayout } from '_src/Layout';
import React from 'react';
import { Tabs } from 'antd';

interface Iparams {
  coin: string;
  pool: 'BUSD' | 'USDC' | 'DAI';
  mode: 'Borrower' | 'Lender';
}

function MarketPage() {
  const history = useHistory();
  // 获取路由参数
  const { params } = useRouteMatch<Iparams>();
  const { coin, pool, mode } = params;

  const callback = (key) => {
    history.push(key);
  };

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
            children: <CoinPool mode="Lend" pool={pool} coin={coin} />,
          },
          {
            key: 'Borrower',
            label: 'Borrower',
            children: <CoinPool mode="Borrow" pool={pool} coin={coin} />,
          },
        ]}
      />
    </DappLayout>
  );
}

export default MarketPage;
