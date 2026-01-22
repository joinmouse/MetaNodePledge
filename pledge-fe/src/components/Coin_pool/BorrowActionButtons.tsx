import { Steps, message } from 'antd';
import { dealNumber, dealNumber_18 } from '_src/components/Coin_pool/help';

import Button1 from '_components/Button';
import ConnectWallet from '_components/ConnectWallet';
import React from 'react';
import pageURL from '_constants/pageURL';
import services from '_src/services';

const { Step } = Steps;

interface BorrowActionButtonsProps {
  current: number;
  steps: any[];
  chainId: number | undefined;
  loadings: boolean;
  borrowvalue: number;
  data: number;
  balanceborrow: string;
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
  openNotificationborrow: (message: string) => void;
  openNotificationerrorborrow: (message: string) => void;
}

const BorrowActionButtons: React.FC<BorrowActionButtonsProps> = ({
  current,
  steps,
  chainId,
  loadings,
  borrowvalue,
  data,
  balanceborrow,
  poolinfo,
  pid,
  mode,
  warning,
  setwarning,
  setloadings,
  next,
  prev,
  openNotification,
  openNotificationerror,
  openNotificationborrow,
  openNotificationerrorborrow,
}) => {
  const validateBorrowTransaction = () => {
    const currentTime = Math.round(new Date().getTime() / 1000).toString();
    if (borrowvalue > (poolinfo[pid]?.maxSupply ?? 0)) {
      setwarning('Maximum exceeded');
      return false;
    }
    if (currentTime > (poolinfo[pid]?.settleTime ?? 0)) {
      setwarning('Over time');
      return false;
    }
    if (data > (balanceborrow && Number(dealNumber_18(balanceborrow)))) {
      setwarning('transfer amount exceeds balance borrow');
      return false;
    }
    setwarning('');
    return true;
  };

  const handleBorrowApprove = async () => {
    if (!validateBorrowTransaction()) return;
    setloadings(true);
    const borrownum = dealNumber(Math.round(data * 10**18) / 10**18);
    
    console.log('[BorrowApprove] Starting approval transaction:', {
      tokenAddress: poolinfo[pid]?.Jp,
      amount: borrownum,
      borrowValue: data,
      chainId,
      pid,
    });
    
    try {
      const result = await services.ERC20Server.Approve(poolinfo[pid]?.Jp ?? 0, borrownum, chainId);
      console.log('[BorrowApprove] Transaction successful:', result);
      
      const allowanceData = await services.ERC20Server.allowance(poolinfo[pid]?.Jp ?? 0, chainId);
      console.log('[BorrowApprove] Current allowance:', allowanceData);
      
      openNotification('Success');
      setloadings(false);
      next();
    } catch (error: any) {
      console.error('[BorrowApprove] Transaction failed:', {
        error,
        errorMessage: error?.message,
        errorCode: error?.code,
        tokenAddress: poolinfo[pid]?.Jp,
        amount: borrownum,
        chainId,
      });
      openNotificationerror('Error');
      setloadings(false);
    }
  };

  const handleBorrowExecute = async () => {
    if (!validateBorrowTransaction()) return;
    setloadings(true);
    const timestamp = Math.round(new Date().getTime() / 1000).toString();
    const borrownum = dealNumber(Math.floor(data * 10**18) / 10**18);
    try {
      await services.PoolServer.depositBorrow(pid, borrownum, timestamp, poolinfo[pid]?.Jp ?? 0, chainId);
      openNotificationborrow('Success');
      setloadings(false);
      prev();
      window.open(`${pageURL.Lend_Borrow.replace(':mode', `${mode}`)}`, '_self');
    } catch (error) {
      openNotificationerrorborrow('Error');
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
                onClick={handleBorrowApprove}
                disabled={data === 0 || data == null}
              >
                Approve
              </Button1>
            )}
            <Button1 style={{ width: '48%' }} disabled={true} onClick={() => message.success('Processing complete!')}>
              Borrow
            </Button1>
          </>
        )}
        {current === steps.length - 1 && (
          <>
            <Button1 style={{ width: '48%', borderRadius: '15px' }} disabled={true}>
              Approve
            </Button1>
            <Button1 style={{ width: '48%', borderRadius: '15px' }} loading={loadings} onClick={handleBorrowExecute}>
              Borrow
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

export default BorrowActionButtons;
