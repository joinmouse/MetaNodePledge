import './index.less';

import BNB from '_src/assets/images/order_BNB.png';
import BTCB from '_src/assets/images/order_BTCB.png';
import BUSD from '_src/assets/images/order_BUSD.png';
import DAI from '_src/assets/images/order_DAI.png';
import React from 'react';
import USDT from '_src/assets/images/order_USDT.png';
import classnames from 'classnames';

export interface IOrderImg {
  img1: string;
  img2: string;
  className?: string;
  style?: React.CSSProperties;
}

const OrderImg: React.FC<IOrderImg> = ({ className = '', style = null, img1 = '', img2 = '' }) => {
  return (
    <div className={classnames('components_order_img')} style={style}>
      <img src={img1} alt="" className="img1" />
      <img src={img2} alt="" className="img2" />
    </div>
  );
};



export default OrderImg;
