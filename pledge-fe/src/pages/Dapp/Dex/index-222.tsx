import './index.less';

import { Cascader, InputNumber, Modal, Popover, Select, Space, Tabs, Tooltip } from 'antd';
import React, { useEffect, useState } from 'react';
import styled, { css } from 'styled-components';
import { useHistory, useRouteMatch } from 'react-router-dom';

import Button from '_components/Button';
import Coin_pool from '_components/Coin_pool';
import { DappLayout } from '_src/Layout';
import PageHeader from '_components/PageHeader';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { color } from 'echarts';
import pageURL from '_constants/pageURL';

const { Option } = Select;
type Iparams = {
  mode: 'Swap' | 'Liquidity';
};
const InputCurrency = styled.div`
  display: flex;
  width: 154px;
  justify-content: space-between;
`;
const CurrencySelect = styled(Select)`
  background: #f5f5fa;
  border-radius: 10px;
  overflow: hidden;
`;
const CurrencyRow = styled.div`
  display: flex;
  align-items: center;
  padding-bottom: 10px;
  justify-content: space-between;
`;
const Blance = styled.div`
  text-align: right;
  color: #8b89a3;
  line-height: 22px;
  font-size: 14px;
`;
const ContentTitle = styled.div`
  line-height: 20px;
  font-weight: 600;
  color: #262533;
`;
const ContentTab = styled.div`
  color: #4f4e66;
`;
const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;
const SlippageWrap = styled.div`
  background: #ffffff;
  padding: 0 10px;
  border: 1px solid #bcc0cc;
  border-radius: 14px;
  display: flex;
  align-items: center;
  & :hover {
    color: #fff;
    background: #5d52ff;
  }
  input {
    text-align: right;
    height: 24px;
    padding: 0;
    & :hover {
      color: #fff;
    }
  }
`;
function Dex() {
  const history = useHistory();
  const { url: routeUrl, params } = useRouteMatch<Iparams>();
  const { mode } = params;
  const [activeKey, setActiveKey] = useState<string>(mode);

  const [slippagevalue, setslippagevalue] = useState(0.5);
  const [slippagetime, setslippagetime] = useState(20);
  const onChanges = (newActiveKey: string) => {
    setActiveKey(newActiveKey);
    // history.replace(pageURL.DEX.replace(':mode', `${newActiveKey}`));
  };
  function handleOnChange(value) {
    setslippagevalue(value);
  }
  function handleOnChange2(value) {
    setslippagetime(value);
  }
  const onChange = (key: string) => {
    console.log(key);
  };

  return (
    <DappLayout title={`${activeKey} Dex`} className="dapp_Dex">
      测试
      {/* <Tabs 
        defaultActiveKey="Swap" 
        activeKey={activeKey} 
        onChange={onChanges}
        items={[
          {
            key: 'Swap',
            label: 'Swap',
            children: 'e eeeeeee'
          },
          {
            key: 'Liquidity',
            label: 'Liquidity',
            children: '12313'
          }
        ]}
      />
      <Tabs 
        defaultActiveKey="1" 
        onChange={onChange}
        items={[
          {
            key: '1',
            label: 'Tab 1',
            children: 'Content of Tab Pane 1'
          },
          {
            key: '2',
            label: 'Tab 2',
            children: 'Content of Tab Pane 2'
          },
          {
            key: '3',
            label: 'Tab 3',
            children: 'Content of Tab Pane 3'
          }
        ]}
      /> */}
    </DappLayout>
  );
}

export default Dex;

export default Dex;
