import './index.less';

import { Dropdown, notification } from 'antd';
import React, { useEffect, useState } from 'react';
import { UnsupportedChainIdError } from '@web3-react/core';
// import ChainBridge from '@/constants/ChainBridge';
import styled from 'styled-components';
import { useRecoilValue, useSetRecoilState } from 'recoil';

import { CopyToClipboard } from 'react-copy-to-clipboard';
import type { InjectedConnector } from '@web3-react/injected-connector';
import { useActiveWeb3React } from '_src/hooks';
import { connectorLocalStorageKey } from '@pancakeswap-libs/uikit';
import { HeaderBox } from '../styleComponents';
import WalletModal from '../WalletModal';
import { injected } from './connector';
import services from '../../services';
import { useEagerConnect, useInactiveListener, DISCONNECT_WALLET_KEY } from './WalletHooks';
import { chainInfoState, walletModalOpen } from '../../model/global';

// import { modal } from

const WalletInfo = styled.div`
  width: 160px;
  padding: 3px 8px;
  > div {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 5px 0;
    > div {
      font-weight: 600;
      font-size: 16px;
    }
    *:first-child {
      padding-right: 10px;
    }
  }
`;
const WalletConnected = styled(HeaderBox)`
  margin-left: 24px;
  background-color: #fff !important;
  padding: 0 20px 0 20px !important;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

// const WalletConnecting = styled(HeaderBox)``;

const WalletNoConnected = styled(HeaderBox)`
  margin-left: 24px;
  background: #5d52ff;
  border-radius: 21px 21px 21px 0px;
  color: #fff;
  font-style: normal;
  font-weight: 600;
`;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IConnectWallet {
  className?: string;
}

const ConnectWallet: React.FC<IConnectWallet> = ({ className }) => {
  const triedEager = useEagerConnect();
  const chainInfo = useRecoilValue(chainInfoState);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { connector, chainId, account, activate, deactivate, error } = useActiveWeb3React();
  const [activatingConnector, setActivatingConnector] = useState<InjectedConnector>();

  const setWalletModalOpen = useSetRecoilState(walletModalOpen);

  async function activatingConnectorFn() {
    if (activatingConnector && activatingConnector === connector) {
      setActivatingConnector(undefined);
    } else if (error instanceof UnsupportedChainIdError) {
      // console.log(error);
      // const fraNetworkDefault = ChainBridge.chains
      //   .filter((item) => item.type === 'Ethereum')
      //   .find((item) => item.networkId === 525);
      try {
        await services.PoolServer.switchNetwork(chainInfo.netWorkInfo);
      } catch {
        notification.warning({
          message: error?.name,
          description: error?.message,
          top: 80,
        });
      }
    } else if (error && error.message && error.message.includes('chainId null is not an integer')) {
      // 处理 chainId 为 null 的错误
      console.warn('ChainId is null, attempting to reconnect...');
      try {
        // 延迟重试连接
        setTimeout(() => {
          if (injected) {
            activate(injected, undefined, true).catch((retryError) => {
              console.error('Retry connection failed:', retryError);
            });
          }
        }, 1000);
      } catch (retryError) {
        console.error('Error during retry:', retryError);
      }
    }
  }

  useEffect(() => {
    activatingConnectorFn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activatingConnector, connector]);

  const activating = injected === activatingConnector;
  const connected = injected === connector;
  // const disabled = !triedEager || !!activatingConnector || !!error;
  const isDisconnect = !error && chainId;
  useInactiveListener(!triedEager || !!activatingConnector);

  function handleOnCLickConnectWallet() {
    setWalletModalOpen(true);
    // if (!isDisconnect) {
    //   setActivatingConnector(injected);
    //   activate(injected);
    // } else {
    //   // deactivate();
    // }
  }

  // 断开钱包连接
  function handleDisconnect() {
    try {
      // 设置断开连接标志，阻止自动重连
      window.localStorage.setItem(DISCONNECT_WALLET_KEY, 'true');
      deactivate();
      // 清除本地存储的连接状态
      window.localStorage.removeItem(connectorLocalStorageKey);
      window.localStorage.removeItem('walletconnect');
      // 刷新页面以确保完全断开
      window.location.reload();
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }

  function ButtonSwitchComponent() {
    if (connected && isDisconnect) {
      return (
        <Dropdown
          menu={{
            items: [
              {
                key: 'wallet-info',
                label: (
                  <WalletInfo>
                    <div>
                      <img src={require('_assets/images/meta-mask-border.svg')} alt="" />
                      <span>MetaMask</span>
                    </div>
                    <div>
                      <div>{`${account?.slice(0, 6)}···${account?.slice(-4)}`}</div>
                      <CopyToClipboard text={account!}>
                        <img src={require('_assets/images/copy-icon.svg')} alt="" style={{ cursor: 'pointer' }} />
                      </CopyToClipboard>
                    </div>
                  </WalletInfo>
                ),
              },
              {
                type: 'divider',
              },
              {
                key: 'disconnect',
                label: (
                  <div
                    style={{
                      color: '#ff4d4f',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>🔌</span>
                    <span>Disconnect</span>
                  </div>
                ),
                onClick: handleDisconnect,
              },
            ],
          }}
        >
          <WalletConnected onClick={handleOnCLickConnectWallet}>
            <img src={require('_assets/images/meta-mask.svg')} alt="" />
            <span className="address">{`${account?.slice(0, 6)}···${account?.slice(-4)}`}</span>
          </WalletConnected>
        </Dropdown>
      );
    }
    if (activating) {
      return <WalletNoConnected>Connecting</WalletNoConnected>;
    }
    return (
      <>
        <WalletNoConnected onClick={handleOnCLickConnectWallet} className={className}>
          Connect Wallet
        </WalletNoConnected>
        <WalletModal />
        {/* {!!error?<WalletNoConnected>Wrong Network</WalletNoConnected>:<WalletNoConnected onClick={handleOnCLickConnectWallet}>Connect Wallet</WalletNoConnected>} */}
      </>
    );
  }
  return <div className={className}>{ButtonSwitchComponent()}</div>;
};

export default ConnectWallet;
