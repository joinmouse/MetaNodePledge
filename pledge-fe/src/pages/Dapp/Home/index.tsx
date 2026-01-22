import './index.less';

import { Dropdown, Menu, Popover, Progress, Table, Tabs } from 'antd';
import { Link, useHistory } from 'react-router-dom';
import React, { useEffect, useState } from 'react';

import BigNumber from 'bignumber.js';
import Borrower from '_src/assets/images/Group 1842.png';
import Button from '_components/Button';
import Close from '_assets/images/Close Square.png';
import { DappLayout } from '_src/Layout';
import { DownOutlined } from '@ant-design/icons';
import { FORMAT_TIME_STANDARD } from '_src/utils/constants';
import Lender1 from '_src/assets/images/Group 1843.png';
import PageUrl from '_constants/pageURL';
import moment from 'moment';
import services from '_src/services';
import { useWeb3React } from '@web3-react/core';
import { MAINNET_TOKEN_ADDRESSES, TESTNET_TOKEN_ADDRESSES } from '_src/constants/tokenAddresses';

function HomePage() {
  const history = useHistory();
  const { chainId } = useWeb3React();
  const [pid, setpid] = useState(0);

  const [tab, settab] = useState('Live');
  const [pool, setpool] = useState('BUSD');
  const [coin, setcoin] = useState('');
  const [visible, setvisible] = useState(false);
  const [show, setshow] = useState('100');
  const [data, setdata] = useState([]);
  const [datastate, setdatastate] = useState([]);
  const [Id, setId] = useState(56);
  
  // 预过滤各标签页数据，提升切换性能
  const [filteredData, setFilteredData] = useState({
    BUSD: [],
    USDT: [],
    DAI: [],
    PLGR: []
  });

  const dealNumber18 = (num) => {
    if (num) {
      const x = new BigNumber(num);
      const y = new BigNumber(1e18);
      return x.dividedBy(y).toFixed();
    }
    return undefined;
  };

  const dealNumber8 = (num) => {
    if (num) {
      const x = new BigNumber(num);
      const y = new BigNumber(1e6);
      return x.dividedBy(y).toString();
    }
    return undefined;
  };
  const getPoolInfo = async (poolChainId) => {
    const datainfo = await services.userServer.getpoolBaseInfo(poolChainId);

    const res = datainfo.data.data.map((item, index) => {
      const maxSupply = dealNumber18(item.pool_data.maxSupply);
      const borrowSupply = dealNumber18(item.pool_data.borrowSupply);
      const lendSupply = dealNumber18(item.pool_data.lendSupply);

      const times = moment.unix(item.pool_data.settleTime).format(FORMAT_TIME_STANDARD);

      const difftime = item.pool_data.endTime - item.pool_data.settleTime;

      const days = parseInt(`${difftime / 86400}`, 10);
      return {
        key: index + 1,
        state: item.pool_data.state,
        underlying_asset: item.pool_data.borrowTokenInfo.tokenName,
        fixed_rate: dealNumber8(item.pool_data.interestRate),
        maxSupply,
        available_to_lend: [borrowSupply, lendSupply],
        settlement_date: times,
        length: days,
        margin_ratio: dealNumber8(item.pool_data.autoLiquidateThreshold),
        collateralization_ratio: dealNumber8(item.pool_data.martgageRate),
        poolname: item.pool_data.lendTokenInfo.tokenName,
        endTime: item.pool_data.endTime,
        settleTime: item.pool_data.settleTime,
        logo: item.pool_data.borrowTokenInfo.tokenLogo,
        Sp: item.pool_data.lendToken,
        Jp: item.pool_data.borrowToken,
        borrowPrice: item.pool_data.borrowTokenInfo.tokenPrice,
        lendPrice: item.pool_data.lendTokenInfo.tokenPrice,
      };
    });
    
    setdata(res);
    
    // 预过滤各标签页数据，提升切换性能
    const liveData = res.filter((item) => item.state < 1);
    const filtered = {
BUSD: liveData.filter(item => 
        item.Sp === MAINNET_TOKEN_ADDRESSES.BUSD ||
        item.Sp === TESTNET_TOKEN_ADDRESSES.BUSD
      ),
      USDT: liveData.filter(item => 
        item.Sp === MAINNET_TOKEN_ADDRESSES.USDT ||
        item.Sp === MAINNET_TOKEN_ADDRESSES.USDT.toLowerCase()
      ),
DAI: liveData.filter(item => 
        item.Sp === MAINNET_TOKEN_ADDRESSES.DAI ||
        item.Sp === TESTNET_TOKEN_ADDRESSES.DAI
      ),
      PLGR: liveData.filter(item => 
        item.Sp === '0x6Aa91CbfE045f9D154050226fCc830ddbA886CED'
      )
    };
    setFilteredData(filtered);
    setdatastate(liveData);
  };

  useEffect(() => {
    history.push('BUSD');
  }, [history]);
  useEffect(() => {
    const currentChainId = chainId || 56;
    setId(currentChainId);
    getPoolInfo(currentChainId).catch(() => {
      // Handle error silently
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId]);

  const callback = (key) => {
    history.push(key);
    setpool(key);
    // 使用预过滤的数据，避免实时过滤
    setdatastate(filteredData[key] || []);
  };
  const handleVisibleChange = (visable, num) => {
    if (visable) {
      setshow(num);
      setvisible(visable);
    }
  };
  const menuItems = [
    {
      key: 'Live',
      label: (
        <button
          type="button"
          className="menutab"
          onClick={() => {
            const livelist = data.filter((item) => item.state < 1);
            settab('Live');
            setdatastate(livelist);
          }}
        >
          Live
        </button>
      ),
    },
    {
      key: 'All',
      label: (
        <button
          type="button"
          className="menutab"
          onClick={() => {
            const livelist = data.filter((item) => item);
            settab('All');
            setdatastate(livelist);
          }}
        >
          All
        </button>
      ),
    },
    {
      key: 'Finished',
      label: (
        <button
          type="button"
          className="menutab"
          onClick={() => {
            const livelist = data.filter((item) => item.state >= 1);
            settab('Finished');
            setdatastate(livelist);
          }}
        >
          Finished
        </button>
      ),
    },
  ];
  // 每三位加一个小数点
  function toThousands(num) {
    const str = num.toString();
    const reg = str.indexOf('.') > -1 ? /(\d)(?=(\d{3})+\.)/g : /(\d)(?=(?:\d{3})+$)/g;
    return str.replace(reg, '$1,');
  }

  const columns = [
    {
      title: 'Underlying Asset',
      dataIndex: 'underlying_asset',
      render: (val, record) => (
        <div className="underlyingAsset">
          <img src={record.logo} alt="" />
          <p>{val}</p>
        </div>
      ),
    },
    {
      title: 'Fixed Rate',
      dataIndex: 'fixed_rate',
      sorter: {
        compare: (a, b) => a.fixed_rate - b.fixed_rate,
        multiple: 3,
      },
      render: (val) => <div>{`${val}%`}</div>,
    },
    {
      title: 'Available To Lend',
      dataIndex: 'available_to_lend',
      render: (val, record) => {
        const totalFinancing = (val[1] / record.maxSupply) * 100;
        return (
          <div className="totalFinancing">
            <Progress
              percent={totalFinancing}
              showInfo={false}
              strokeColor="#5D52FF"
              success={{
                percent:
                  Math.floor(
                    ((val[0] * record.borrowPrice) / record.lendPrice / record.collateralization_ratio) * 10000,
                  ) / record.maxSupply,
              }}
            />

            <p style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>
                <span style={{ color: '#FFA011', fontSize: '12px' }}>
                  {toThousands(
                    Math.floor(
                      ((val[0] * Number(record.borrowPrice)) /
                        Number(record.lendPrice) /
                        record.collateralization_ratio) *
                        10000,
                    ) / 100,
                  )}
                </span>
                /
                <span style={{ color: '#5D52FF', fontSize: '12px' }}>{`${toThousands(
                  Math.floor(val[1] * 100) / 100,
                )}`}</span>
              </span>
              <span style={{ width: '10px' }} />
              <span style={{ fontSize: '12px' }}>{toThousands(Number(record.maxSupply))}</span>
            </p>
          </div>
        );
      },
      sorter: {
        compare: (a, b) => a.total_financing - b.total_financing,
        multiple: 2,
      },
    },
    {
      title: 'Settlement Date',
      dataIndex: 'settlement_date',
      sorter: {
        compare: (a, b) => a.settleTime - b.settleTime,
        multiple: 1,
      },
    },
    {
      title: 'Length',
      dataIndex: 'length',
      sorter: {
        compare: (a, b) => a.length - b.length,
        multiple: 5,
      },
      render: (val) => <div>{`${val} day`}</div>,
    },
    {
      title: 'Margin Ratio',
      dataIndex: 'margin_ratio',
      sorter: {
        compare: (a, b) => a.margin_ratio - b.margin_ratio,
        multiple: 6,
      },
      render: (val) => {
        const numVal = val ? Number(val) : 0;
        return `${isNaN(numVal) ? 100 : numVal + 100}%`;
      },
    },
    {
      title: 'Collateralization Ratio',
      dataIndex: 'collateralization_ratio',
      render: (val, record) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {`${val}%`}
          <Popover
            content={content}
            title="Choose a Role"
            trigger="click"
            open={show === record.key && visible}
            onOpenChange={(e) => handleVisibleChange(e, record.key)}
          >
            <Button
              style={{ width: '107px', height: '40px', borderRadius: '15px', lineHeight: '40px', color: '#FFF' }}
              onClick={() => {
                setcoin(record.underlying_asset);
                setshow(record.key);
                setpid(record.key - 1);
              }}
            >
              Detail
            </Button>
          </Popover>
        </div>
      ),
      sorter: {
        compare: (a, b) => a.collateralization_ratio - b.collateralization_ratio,
        multiple: 7,
      },
    },
  ];
  const columns1 = [
    {
      title: 'Underlying Asset',
      dataIndex: 'underlying_asset',
      render: (val, record) => (
        <Popover
          content={content}
          title="Choose a Role"
          trigger="click"
          open={show === record.key && visible}
          onOpenChange={(e) => handleVisibleChange(e, record.key)}
        >
          <div
            className="underlyingAsset"
            onClick={() => {
              Changecoin(val);
              setcoin(record.underlying_asset);
              setshow(record.key);
              setpid(record.key - 1);
            }}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                Changecoin(val);
                setcoin(record.underlying_asset);
                setshow(record.key);
                setpid(record.key - 1);
              }
            }}
          >
            <img src={record.logo} alt="" />
            <p>{val}</p>
          </div>
        </Popover>
      ),
    },

    {
      title: 'Fixed Rate',
      dataIndex: 'fixed_rate',
      sorter: {
        compare: (a, b) => a.fixed_rate - b.fixed_rate,
        multiple: 3,
      },
      render: (val) => <div>{`${val}%`}</div>,
    },

    {
      title: 'Settlement Date',
      dataIndex: 'settlement_date',
      sorter: {
        compare: (a, b) => a.settleTime - b.settleTime,
        multiple: 1,
      },
    },
  ];

  const Changecoin = (val) => {
    setcoin(val);
  };

  const content = (
    <div className="choose">
      <Link
        to={PageUrl.Market_Pool.replace(':pid/:pool/:coin/:mode', `${pid}/${pool}/${coin}/Lender`)}
        style={{ color: '#FFF' }}
      >
        <div className="choose_lender">
          <img src={Lender1} alt="" />
          <p>
            <span>Lender</span> <span> Lock in a fixed interest rate today. Fixed rates guarantee your APY.</span>
          </p>
        </div>
      </Link>
      <Link
        to={PageUrl.Market_Pool.replace(':pid/:pool/:coin/:mode', `${pid}/${pool}/${coin}/Borrower`)}
        style={{ color: '#FFF' }}
      >
        <div className="choose_borrow">
          <img src={Borrower} alt="" />
          <p>
            <span>Borrower</span> <span>Borrow with certainty. Fixed rates lock in what you pay.</span>
          </p>
        </div>
      </Link>
      <button
        type="button"
        className="close"
        aria-label="Close"
        onClick={() => {
          setvisible(false);
          setshow('100');
        }}
      >
        <img src={Close} alt="" />
      </button>
    </div>
  );
  return (
    <div className="dapp_home_page">
      <DappLayout title="Market Pool" className="trust_code">
        <Dropdown menu={{ items: menuItems }} trigger={['click']} className="dropdown">
          <a className="ant-dropdown-link" onClick={(e) => e.preventDefault()}>
            {tab}
            <DownOutlined />
          </a>
        </Dropdown>
        <Tabs 
          defaultActiveKey="1" 
          onChange={callback} 
          className="all_tab"
          items={[
            {
              key: 'BUSD',
              label: 'BUSD',
              children: (
                <Table
                  pagination={datastate.length < 10 ? false : {}}
                  columns={columns}
                  dataSource={datastate}
                  rowClassName={(record) => record}
                />
              )
            },
            {
              key: 'USDT',
              label: 'USDT',
              children: (
                <Table
                  pagination={datastate.length < 10 ? false : {}}
                  columns={columns}
                  dataSource={datastate}
                  rowClassName={(record) => record}
                />
              )
            },
            ...(chainId === 97 ? [
              {
                key: 'DAI',
                label: 'DAI',
                children: (
                  <Table
pagination={
                      datastate.filter(
                        (item) =>
                          item.Sp === MAINNET_TOKEN_ADDRESSES.DAI ||
                          item.Sp === TESTNET_TOKEN_ADDRESSES.DAI,
                      ).length < 10
                        ? false
                        : {}
                    }
                    columns={columns}
                    dataSource={datastate.filter(
                      (item) =>
                        item.Sp === MAINNET_TOKEN_ADDRESSES.DAI ||
                        item.Sp === TESTNET_TOKEN_ADDRESSES.DAI,
                    )}
                    rowClassName={(record) => record}
                  />
                )
              }
            ] : [
              {
                key: 'PLGR',
                label: 'PLGR',
                children: (
                  <Table
                    pagination={
                      datastate.filter((item) => item.Sp === '0x6Aa91CbfE045f9D154050226fCc830ddbA886CED').length < 10
                        ? false
                        : {}
                    }
                    columns={columns}
                  dataSource={datastate}
                    rowClassName={(record) => record}
                  />
                )
              }
            ])
          ]}
        />
        <Tabs 
          defaultActiveKey="1" 
          onChange={callback} 
          className="media_tab"
          items={[
            {
              key: 'BUSD',
              label: 'BUSD',
              children: (
                <Table
                  pagination={datastate.length < 10 ? false : {}}
                  columns={columns1}
                  dataSource={datastate}
                  rowClassName={(record) => record}
                />
              )
            },
            {
              key: 'USDT',
              label: 'USDT',
              children: (
                <Table
                  pagination={datastate.length < 10 ? false : {}}
                  columns={columns1}
                  dataSource={datastate}
                  rowClassName={(record) => record}
                />
              )
            },
            {
              key: 'DAI',
              label: 'DAI',
              children: (
                <Table
pagination={
                    datastate.filter(
                      (item) =>
                        item.Sp === MAINNET_TOKEN_ADDRESSES.DAI ||
                        item.Sp === TESTNET_TOKEN_ADDRESSES.DAI,
                    ).length < 10
                      ? false
                      : {}
                  }
                  columns={columns1}
                  dataSource={datastate}
                  rowClassName={(record) => record}
                />
              )
            }
          ]}
        />
      </DappLayout>
    </div>
  );
}
export default HomePage;
