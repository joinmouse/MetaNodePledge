import { Steps, message } from 'antd';
import { dealNumber, dealNumber_18 } from '_src/components/Coin_pool/help';

import Button1 from '_components/Button';
import ConnectWallet from '_components/ConnectWallet';
import React from 'react';
import pageURL from '_constants/pageURL';
import services from '_src/services';

const { Step } = Steps;

interface LendActionButtonsProps {
  current: number;
  steps: any[];
  chainId: number | undefined;
  loadings: boolean;
  lendvalue: number;
  balance: string;
  poolinfo: any;
  pid: string;
  mode: string;
  warning: string;
  setwarning: (warning: string) => void;
  setloadings: (loading: boolean) => void;
  next: () => void;
  prev: () => void;
  openNotification: (message: string) => void;
  openNotificationerror: (message: string) => void;
  openNotificationlend: (message: string) => void;
  openNotificationerrorlend: (message: string) => void;
}

const LendActionButtons: React.FC<LendActionButtonsProps> = ({
  current,
  steps,
  chainId,
  loadings,
  lendvalue,
  balance,
  poolinfo,
  pid,
  mode,
  setwarning,
  setloadings,
  next,
  prev,
  openNotification,
  openNotificationerror,
  openNotificationlend,
  openNotificationerrorlend,
}) => {
  const validateLendTransaction = () => {
    const currentTime = Math.round(new Date().getTime() / 1000).toString();
    if ((poolinfo[pid]?.state ?? 0) > 2) {
      setwarning('The pool has finished');
      return false;
    }
    if (lendvalue > (poolinfo[pid]?.maxSupply ?? 0)) {
      setwarning('Maximum exceeded');
      return false;
    }
    // 修复时间检查逻辑：应该检查是否超过到期时间(endTime)，而不是结算时间(settleTime)
    // settleTime是pool开始接受借贷的时间，endTime是pool结束的时间
    if (currentTime >= (poolinfo[pid]?.endTime ?? 0)) {
      setwarning('Pool has ended');
      return false;
    }
    if (lendvalue > (balance && Number(dealNumber_18(balance)))) {
      console.log('lendvalue:', lendvalue);
      console.log('balance:', balance);
      console.log('dealNumber_18(balance):', dealNumber_18(balance));
      console.log('Number(dealNumber_18(balance)):', balance && Number(dealNumber_18(balance)));
      setwarning('transfer amount exceeds balance lend');
      return false;
    }
    if (Number(lendvalue) + Number(poolinfo[pid]?.available_to_lend[1] ?? 0) > Number(poolinfo[pid]?.maxSupply ?? 0)) {
      setwarning('Exceed limit');
      return false;
    }
    setwarning('');
    return true;
  };

  const handleLendApprove = async () => {
    if (!validateLendTransaction()) return;
    setloadings(true);
    const num = dealNumber(lendvalue);

    console.log('[Approve] Starting approval transaction:', {
      tokenAddress: poolinfo[pid]?.Sp,
      amount: num,
      lendValue: lendvalue,
      chainId,
      pid,
    });

    try {
      const result = await services.ERC20Server.Approve(poolinfo[pid]?.Sp ?? 0, num, chainId);
      console.log('[Approve] Transaction successful:', result);
      openNotification('Success');
      setloadings(false);
      next();
      await services.ERC20Server.allowance(poolinfo[pid]?.Sp ?? 0, chainId);
    } catch (error: any) {
      console.error('[Approve] Transaction failed:', {
        error,
        errorMessage: error?.message,
        errorCode: error?.code,
        tokenAddress: poolinfo[pid]?.Sp,
        amount: num,
        chainId,
      });

      // 根据错误类型显示更友好的提示
      let errorMsg = 'Error';
      if (error?.code === 4001) {
        errorMsg = 'User rejected the transaction';
      } else if (error?.message?.includes('insufficient funds')) {
        errorMsg = 'Insufficient funds for gas';
      } else if (error?.message) {
        errorMsg = `Error: ${error.message.substring(0, 100)}`;
      }

      openNotificationerror(errorMsg);
      setloadings(false);
    }
  };

  const handleLendExecute = async () => {
    console.log("handleLendExecute");
    if (!validateLendTransaction()) return;
    setloadings(true);
    const num = dealNumber(lendvalue);

    console.log('[Lend] Starting lend transaction:', {
      pid,
      amount: num,
      amountInWei: num,
      tokenAddress: poolinfo[pid]?.Sp,
      chainId,
      isNativeToken: poolinfo[pid]?.Sp === '0x0000000000000000000000000000000000000000',
    });

    try {
      console.log("Lending with pid:", pid, "amount:", num, "tokenAddress:", poolinfo[pid]?.Sp, "chainId:", chainId);
      const result = await services.PoolServer.depositLend(pid, num, poolinfo[pid]?.Sp ?? 0, chainId);
      console.log('[Lend] Transaction successful:', result);
      setloadings(false);
      openNotificationlend('Success');
      prev();
      window.open(`${pageURL.Lend_Borrow.replace(':mode', `${mode}`)}`, '_self');
    } catch (error: any) {
      console.error('[Lend] Transaction failed:', {
        error,
        errorMessage: error?.message,
        errorCode: error?.code,
        errorData: error?.data,
        pid,
        amount: num,
        tokenAddress: poolinfo[pid]?.Sp,
        chainId,
      });

      // 根据错误类型显示更友好的提示
      let errorMsg = 'Error';
      if (error?.code === 4001) {
        errorMsg = 'User rejected the transaction';
      } else if (error?.code === -32603) {
        // JSON-RPC内部错误
        errorMsg = 'Transaction failed. Please check if you have enough gas and the token is approved.';
        console.error('[Lend] JSON-RPC internal error. This could be caused by:');
        console.error('  1. Insufficient gas balance');
        console.error('  2. Token not approved (Sp token)');
        console.error('  3. Network connectivity issue');
        console.error('  4. Contract execution reverted');
      } else if (error?.message?.includes('insufficient funds')) {
        errorMsg = 'Insufficient funds for gas';
      } else if (error?.message?.includes('nonce')) {
        errorMsg = 'Nonce error. Please try again.';
      } else if (error?.message) {
        errorMsg = `Error: ${error.message.substring(0, 100)}`;
      }

      openNotificationerrorlend(errorMsg);
      setloadings(false);
    }
  };

  return (
    <div>
      <div className="steps-action" style={{ display: 'flex', justifyContent: 'space-between', margin: '42px 0 10px' }}>
        {current < steps.length - 1 && (
          <>
            {chainId === undefined ? (
              <ConnectWallet className="borrowwallet" />
            ) : (
              <Button1
                style={{ width: '48%', borderRadius: '15px' }}
                loading={loadings}
                onClick={handleLendApprove}
                disabled={lendvalue === 0 || lendvalue == null}
              >
                Approve
              </Button1>
            )}
            <Button1 style={{ width: '48%' }} disabled onClick={() => message.success('Processing complete!')}>
              Lend
            </Button1>
          </>
        )}
        {current === steps.length - 1 && (
          <>
            <Button1 style={{ width: '48%', borderRadius: '15px' }} disabled>
              Approve
            </Button1>
            <Button1 loading={loadings} style={{ width: '48%', borderRadius: '15px' }} onClick={handleLendExecute}>
              Lend
            </Button1>
          </>
        )}
      </div>
      <Steps current={current} style={{ width: '60%', margin: '0 auto' }}>
        {steps.map((item) => (
          <Step key={item.title} title={item.title} />
        ))}
      </Steps>
      <div className="steps-content">{steps[current].content}</div>
    </div>
  );
};

export default LendActionButtons;
