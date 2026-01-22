import './index.less';

import { message } from 'antd';
import React, { useState } from 'react';

import BNB from '_src/assets/images/order_BNB.png';
import BTCB from '_src/assets/images/order_BTCB.png';
import BUSD from '_src/assets/images/BUSDcoin.png';
import Button from '_components/Button';
import DAI from '_src/assets/images/order_DAI.png';
import { DappLayout } from '_src/Layout';
import services from '_src/services';
import { useActiveWeb3React } from '_src/hooks';
import { TESTNET_TOKEN_ADDRESSES } from '_src/constants/tokenAddresses';

export interface ITestnetTokens {
  className?: string;
  style?: React.CSSProperties;
  props?: any;
  mode?: string;
}

const TestnetTokens: React.FC<ITestnetTokens> = ({ className = '', style = {}, props = {}, mode = '' }) => {
  const [loadingsbusd, setloadingsbusd] = useState(false);
  const [loadingsbtc, setloadingsbtc] = useState(false);
  const [loadingsdai, setloadingsdai] = useState(false);
  const { library, account } = useActiveWeb3React();

  // 使用 useMessage Hook，避免 findDOMNode 警告
  const [messageApi, contextHolder] = message.useMessage();

  // Format remaining time to readable format
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // 添加代币到钱包
  const getImporttoken = (address: string, coin: string) => {
    library.provider
      .request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address,
            symbol: coin,
            decimals: 18,
          },
        },
      } as any)
      .then((success) => {
        console.log(success);
      })
      .catch(() => console.log(false));
  };

  // 领取代币（带冷却时间检查）
  const handleClaim = async (contractAddress: string, tokenName: string, setLoading: (loading: boolean) => void) => {
    if (!account) {
      messageApi.warning('Please connect your wallet first');
      return;
    }

    setLoading(true);

    try {
      // 先检查是否在冷却时间内
      const remainingTime = await services.IBEP20Server.getTimeUntilNextClaim(contractAddress, account);
      if (remainingTime > 0) {
        // Show friendly cooldown message
        messageApi.warning(
          `You can only claim ${tokenName} once every 24 hours. Please wait ${formatTime(remainingTime)}`,
        );
        setLoading(false);
        return;
      }

      // Execute claim
      await services.IBEP20Server.getfaucet_transfer(contractAddress);
      messageApi.success(`${tokenName} claimed successfully! 🎉`);
    } catch (error: any) {
      // Handle error cases
      if (error?.message?.includes('24 hours')) {
        messageApi.warning(`You can only claim ${tokenName} once every 24 hours`);
      } else {
        messageApi.error(`Failed to claim ${tokenName}. Please try again later`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={style}>
      {contextHolder}
      <DappLayout title="Get Testnet Tokens" className="testnetpages">
        <ul>
          <li>
            <img src={BNB} alt="" />
            <p className="tokenname">Testnet BNB</p>
            <p style={{ marginBottom: '95px' }} className="tokenaddress">
              Please use faucet link to get BNB in testnet
            </p>
            <Button onClick={() => window.open('https://www.bnbchain.org/en/testnet-faucet')}>Go to Faucet</Button>
          </li>
          <li>
            <img src={BTCB} alt="" />
            <p className="tokenname">Testnet BTCB</p>
            <Button
              style={{
                border: '1px solid rgba(93, 82, 255, 0.5)',
                borderRadius: '8px',
                width: '95px',
                height: '30px',
                color: '#5D52FF',
                lineHeight: '10px',
                padding: '10px 4px',
                fontSize: '14px',
                boxSizing: 'border-box',
                background: '#fff',
                margin: '0 auto 24px ',
              }}
              onClick={() => getImporttoken(TESTNET_TOKEN_ADDRESSES.BTCB, 'BTCB')}
            >
              Add Token
            </Button>
            <p className="tokenaddress">{TESTNET_TOKEN_ADDRESSES.BTCB}</p>
            <Button
              loading={loadingsbtc}
              onClick={() => handleClaim(TESTNET_TOKEN_ADDRESSES.BTCB, 'BTCB', setloadingsbtc)}
            >
              Claim
            </Button>
          </li>
          <li>
            <img src={BUSD} alt="" />
            <p className="tokenname">Testnet BUSD</p>
            <Button
              style={{
                border: '1px solid rgba(93, 82, 255, 0.5)',
                borderRadius: '8px',
                width: '95px',
                height: '30px',
                color: '#5D52FF',
                lineHeight: '10px',
                padding: '10px 4px',
                fontSize: '14px',
                boxSizing: 'border-box',
                background: '#fff',
                margin: '0 auto 24px ',
              }}
              onClick={() => getImporttoken(TESTNET_TOKEN_ADDRESSES.BUSD, 'BUSD')}
            >
              Add Token
            </Button>
            <p className="tokenaddress">{TESTNET_TOKEN_ADDRESSES.BUSD}</p>
            <Button
              loading={loadingsbusd}
              onClick={() => handleClaim(TESTNET_TOKEN_ADDRESSES.BUSD, 'BUSD', setloadingsbusd)}
            >
              Claim
            </Button>
          </li>
          <li>
            <img src={DAI} alt="" />
            <p className="tokenname">Testnet DAI</p>
            <Button
              style={{
                border: '1px solid rgba(93, 82, 255, 0.5)',
                borderRadius: '8px',
                width: '95px',
                height: '30px',
                color: '#5D52FF',
                lineHeight: '10px',
                padding: '10px 4px',
                fontSize: '14px',
                boxSizing: 'border-box',
                background: '#fff',
                margin: '0 auto 24px ',
              }}
              onClick={() => getImporttoken(TESTNET_TOKEN_ADDRESSES.DAI, 'DAI')}
            >
              Add Token
            </Button>
            <p className="tokenaddress">{TESTNET_TOKEN_ADDRESSES.DAI}</p>
            <Button
              loading={loadingsdai}
              onClick={() => handleClaim(TESTNET_TOKEN_ADDRESSES.DAI, 'DAI', setloadingsdai)}
            >
              Claim
            </Button>
          </li>
        </ul>
      </DappLayout>
    </div>
  );
};

export default TestnetTokens;
