import './index.less';

import { Drawer, Dropdown, Menu, Select, message } from 'antd';
import { Link, NavLink, useHistory, useRouteMatch } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { find, get } from 'lodash';

import Button from '_components/Button';
import ConnectWallet from '_components/ConnectWallet';
import PageUrl from '_constants/pageURL';
import classnames from 'classnames';
import close from '_assets/images/Icon (2).png';
import currencyInfos from '_constants/currencyInfos';
import { currencyState } from '_src/model/global';
import list from '_assets/images/Icon (1).png';
import logo from '_assets/images/vector.png';
import logo2 from '_assets/images/vector2.png';
import services from '_src/services';
import styled from 'styled-components';
import { useActiveWeb3React } from '_src/hooks';
import { useRecoilState } from 'recoil';
import { useWeb3React } from '@web3-react/core';

export interface IHeaderProps {}

type Iparams = {};
const Header: React.FC<IHeaderProps> = () => {
  const [isOpacity, setIsOpacity] = useState(true);
  const [visable, setVisable] = useState(false);
  const { url: routeUrl, params } = useRouteMatch<Iparams>();
  const [currency, setCurrency] = useRecoilState(currencyState);
  const { chainId } = useActiveWeb3React();
  const [currentChainId, setCurrentChainId] = useState<number>();
  const [flag, setflag] = useState(false);

  const handleClick = async (v: any) => {
    await services.PoolServer.switchNetwork(get(currencyInfos, [v.key, 'netWorkInfo']))
      .then(() => {
        setCurrency(v.key);
      })
      .catch(() => {
        console.error();
      });
  };

  useEffect(() => {
    if (chainId !== currentChainId && currentChainId === undefined) {
      setCurrentChainId(chainId);

      const chainName = find(Object.values(currencyInfos), { chainId })?.chainName;
      setCurrency(chainName || 'BSC_Mainnet');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId]);
  const FlexDiv = styled.div`
    display: flex;
    justify-content: space-between;
    > img {
      margin-right: 10px;
    }
  `;
  return (
    <div className={classnames('components_header_landing', { no_opacity: isOpacity })}>
      <div className="continer">
        <div className="home_menu_list">
          <a className="findora-logo" href={PageUrl.Dapp} target="_self" style={{ margin: '0' }}>
            <img src={logo} alt="" width="146px" height="44px" className="logo" />
          </a>
          <NavLink
            to={PageUrl.Dapp}
            activeClassName="active"
            activeStyle={{ color: '##5d52ff' }}
            className={
              location.pathname == '/BUSD'
                ? 'menu-item'
                : location.pathname == '/USDT'
                ? 'menu-item'
                : location.pathname == '/DAI'
                ? 'menu-item'
                : ''
            }
          >
            Market
          </NavLink>
          <NavLink
            to={PageUrl.Lend_Borrow.replace(':mode', 'Lend')}
            activeStyle={{ color: '#5d52ff' }}
            activeClassName="active"
            className={location.pathname == '/Market/Lend' ? 'menu-item' : ''}
          >
            Lend
          </NavLink>
          <NavLink
            to={PageUrl.Lend_Borrow.replace(':mode', 'Borrow')}
            activeStyle={{ color: '#5d52ff' }}
            activeClassName="active"
            className={location.pathname == '/Market/Borrow' ? 'menu-item' : ''}
          >
            Borrow
          </NavLink>
          <NavLink
            to={PageUrl.DEX_Swap.replace(':mode', 'Swap')}
            activeStyle={{ color: '#5d52ff' }}
            activeClassName="active"
            className={location.pathname == '/DEX/Swap' || location.pathname == '/DEX/Liquidity' ? 'menu-item' : ''}
          >
            DEX
          </NavLink>
          <a onClick={() => window.open('http://prod-pledger-swap.s3-website-us-west-2.amazonaws.com')} className="">
            DEX
          </a>
          {chainId == 97 && (
            <NavLink
              to={PageUrl.Lend_Borrow.replace(':mode', 'Provide')}
              className={location.pathname == '/Market/Provide' ? 'menu-item' : ''}
              activeStyle={{ color: '#5d52ff' }}
              activeClassName="active"
            >
              Get Testnet Tokens
            </NavLink>
          )}
        </div>
        <div className="changeWallet">
          <Dropdown
            menu={{
              selectedKeys: [currency],
              onClick: handleClick,
              className: "selecttab",
              style: { width: '240px', height: '160px', padding: '16px' },
              items: [
                {
                  key: 'header',
                  label: <p style={{ color: ' #8B89A3' }}>Select a network</p>,
                  disabled: true
                },
                {
                  key: 'BSC_Mainnet',
                  label: (
                    <FlexDiv style={{ display: 'flex', justifyContent: 'left' }}>
                      <img src={get(currencyInfos, ['BSC_Mainnet', 'chainImageAsset'])} alt="" width={24} height={24} />
                      <span>BSC-Mainnet</span>
                    </FlexDiv>
                  ),
                  style: { borderRadius: '12px' }
                },
                {
                  key: 'BSC_Testnet',
                  label: (
                    <FlexDiv style={{ display: 'flex', justifyContent: 'left' }}>
                      <img src={get(currencyInfos, ['BSC_Testnet', 'chainImageAsset'])} alt="" width={24} height={24} />
                      <span>BSC-Testnet</span>
                    </FlexDiv>
                  ),
                  style: { borderRadius: '12px', marginBottom: '10px' }
                }
              ]
            }}
          >
            <div>
              <img src={get(currencyInfos, [currency, 'chainImageAsset'])} alt="" width={24} height={24} />
              <span>{currency}</span>
              <img src={require('_assets/images/dropDown.svg')} alt="" />
            </div>
          </Dropdown>
          <ConnectWallet />
        </div>
        <div className="modile_list">
          <div>
            <img src={logo2} alt="" width="27.82px" height="27.82px" className="logo2" />
          </div>
          <div className="list_right">
            <div className="changeWallet2">
              <Dropdown
                menu={{
                  selectedKeys: [currency],
                  onClick: handleClick,
                  className: "selecttab",
                  style: { width: '240px', height: '160px', padding: '16px' },
                  items: [
                    {
                      key: 'header',
                      label: <p style={{ color: ' #8B89A3' }}>Select a network</p>,
                      disabled: true
                    },
                    {
                      key: 'BSC_Mainnet',
                      label: (
                        <FlexDiv style={{ display: 'flex', justifyContent: 'left' }}>
                          <img
                            src={get(currencyInfos, ['BSC_Mainnet', 'chainImageAsset'])}
                            alt=""
                            width={20}
                            height={20}
                          />
                          <span>BSC-Mainnet</span>
                        </FlexDiv>
                      ),
                      style: { borderRadius: '12px' }
                    },
                    {
                      key: 'BSC_Testnet',
                      label: (
                        <FlexDiv style={{ display: 'flex', justifyContent: 'left' }}>
                          <img
                            src={get(currencyInfos, ['BSC_Testnet', 'chainImageAsset'])}
                            alt=""
                            width={20}
                            height={20}
                          />
                          <span>BSC-Testnet</span>
                        </FlexDiv>
                      ),
                      style: { borderRadius: '12px', marginBottom: '10px' }
                    }
                  ]
                }}
              >
                <div>
                  <img src={get(currencyInfos, [currency, 'chainImageAsset'])} alt="" width={24} height={24} />
                  <span>{currency}</span>
                  <img src={require('_assets/images/dropDown.svg')} alt="" />
                </div>
              </Dropdown>
              <ConnectWallet />
            </div>

            <div className="mobile_select">
              <img src={list} onClick={() => setVisable(true)} />
            </div>
          </div>
          <Drawer placement={'top'} closable={false} onClose={() => setVisable(false)} open={visable} key={'top'}>
            <div className="drawer_header">
              <img src={close} onClick={() => setVisable(false)} />
            </div>
            <div className="home_menu_list2">
              <NavLink to={PageUrl.Dapp} className="menu-item">
                Market
              </NavLink>
              <NavLink to={PageUrl.Lend_Borrow.replace(':mode', 'Lend')} className="menu-item">
                Lend
              </NavLink>
              <NavLink to={PageUrl.Lend_Borrow.replace(':mode', 'Borrow')} className="menu-item">
                Borrow
              </NavLink>
              {/* <NavLink to={PageUrl.DEX.replace(':mode', 'Swap')} className="menu-item">
                DEX
              </NavLink> */}
              <a
                onClick={() => window.open('http://prod-pledger-swap.s3-website-us-west-2.amazonaws.com')}
                className="menu-item"
              >
                DEX
              </a>
              {chainId == 97 && (
                <NavLink to={PageUrl.Lend_Borrow.replace(':mode', 'Provide')} className="menu-item">
                  Get Testnet Tokens
                </NavLink>
              )}
            </div>
          </Drawer>
        </div>
      </div>
    </div>
  );
};



export default Header;
