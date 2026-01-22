import { useState, useEffect } from 'react';
import { useActiveWeb3React } from '_src/hooks';
import { injected } from './connector';
import { safeActivateConnector } from '../../utils/walletUtils';

// 断开连接标志的 key
export const DISCONNECT_WALLET_KEY = 'disconnectWallet';

export function useEagerConnect() {
  const { activate, active } = useActiveWeb3React();

  const [tried, setTried] = useState(false);

  useEffect(() => {
    // 检查是否用户主动断开了连接
    const isDisconnected = window.localStorage.getItem(DISCONNECT_WALLET_KEY) === 'true';

    if (isDisconnected) {
      // 用户主动断开，不自动重连
      setTried(true);
      return;
    }

    injected.isAuthorized().then(async (isAuthorized) => {
      if (isAuthorized) {
        const success = await safeActivateConnector(activate, injected, (error) => {
          console.error('Eager connect failed:', error);
          setTried(true);
        });

        if (!success) {
          setTried(true);
        }
      } else {
        setTried(true);
      }
    });
  }, [activate]);

  useEffect(() => {
    if (!tried && active) {
      setTried(true);
    }
  }, [tried, active]);

  return tried;
}

export function useInactiveListener(suppress = false) {
  const { active, error, activate } = useActiveWeb3React();

  useEffect(() => {
    const { ethereum } = window as any;
    if (ethereum && ethereum.on && !active && !error && !suppress) {
      const handleConnect = async () => {
        console.log("Handling 'connect' event");
        await safeActivateConnector(activate, injected);
      };
      const handleChainChanged = async (chainId: any) => {
        console.log("Handling 'chainChanged' event with payload", chainId);
        // 检查 chainId 是否有效，避免 null 或 undefined 导致的错误
        if (chainId && chainId !== 'null' && chainId !== '0x0') {
          await safeActivateConnector(activate, injected);
        }
      };
      const handleAccountsChanged = async (accounts: string | any[]) => {
        console.log("Handling 'accountsChanged' event with payload", accounts);
        if (accounts.length > 0) {
          await safeActivateConnector(activate, injected);
        }
      };
      const handleNetworkChanged = async (networkId: any) => {
        console.log("Handling 'networkChanged' event with payload", networkId);
        // 检查 networkId 是否有效，避免 null 或 undefined 导致的错误
        if (networkId && networkId !== 'null' && networkId !== '0') {
          await safeActivateConnector(activate, injected);
        }
      };

      ethereum.on('connect', handleConnect);
      ethereum.on('chainChanged', handleChainChanged);
      ethereum.on('accountsChanged', handleAccountsChanged);
      ethereum.on('networkChanged', handleNetworkChanged);

      return () => {
        if (ethereum.removeListener) {
          ethereum.removeListener('connect', handleConnect);
          ethereum.removeListener('chainChanged', handleChainChanged);
          ethereum.removeListener('accountsChanged', handleAccountsChanged);
          ethereum.removeListener('networkChanged', handleNetworkChanged);
        }
      };
    }
  }, [active, error, suppress, activate]);
}
