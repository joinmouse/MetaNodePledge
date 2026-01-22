import { AbstractConnector } from '@web3-react/abstract-connector';
import { UnsupportedChainIdError } from '@web3-react/core';

/**
 * 安全的钱包连接函数，处理各种连接错误
 */
export const safeActivateConnector = async (
  activate: (connector: AbstractConnector, onError?: (error: Error) => void, throwErrors?: boolean) => Promise<void>,
  connector: AbstractConnector,
  onError?: (error: Error) => void,
): Promise<boolean> => {
  try {
    await activate(connector, undefined, true);
    return true;
  } catch (error: any) {
    console.error('Wallet connection error:', error);

    // 处理 chainId 为 null 的错误
    if (error.message && error.message.includes('chainId null is not an integer')) {
      console.warn('ChainId is null, retrying connection...');

      // 延迟重试
      return new Promise((resolve) => {
        setTimeout(async () => {
          try {
            await activate(connector, undefined, true);
            resolve(true);
          } catch (retryError: any) {
            console.error('Retry connection failed:', retryError);
            if (onError) {
              onError(retryError);
            }
            resolve(false);
          }
        }, 1500);
      });
    }

    // 处理不支持的链ID错误
    if (error instanceof UnsupportedChainIdError) {
      console.warn('Unsupported chain ID, attempting to activate anyway...');
      try {
        await activate(connector);
        return true;
      } catch (secondError: any) {
        console.error('Second activation attempt failed:', secondError);
        if (onError) {
          onError(secondError);
        }
        return false;
      }
    }

    // 其他错误
    if (onError) {
      onError(error);
    }
    return false;
  }
};

/**
 * 检查 chainId 是否有效
 */
export const isValidChainId = (chainId: any): boolean =>
  chainId !== null && chainId !== undefined && chainId !== 'null' && chainId !== '0x0' && chainId !== 0;

/**
 * 安全获取 chainId
 */
export const getSafeChainId = (chainId: any): number | null => {
  if (!isValidChainId(chainId)) {
    return null;
  }

  if (typeof chainId === 'string') {
    // 处理十六进制格式
    if (chainId.startsWith('0x')) {
      return parseInt(chainId, 16);
    }
    return parseInt(chainId, 10);
  }

  if (typeof chainId === 'number') {
    return chainId;
  }

  return null;
};
