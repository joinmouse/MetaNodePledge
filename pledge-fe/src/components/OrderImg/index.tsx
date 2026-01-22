import './index.less';

import React from 'react';
import classnames from 'classnames';

export interface IOrderImg {
  img1: string;
  img2: string;
  className?: string;
  style?: React.CSSProperties;
}

const OrderImg: React.FC<IOrderImg> = ({ className = '', style = null, img1 = '', img2 = '' }) => (
  <div className={classnames('components_order_img')} style={style}>
    <img src={img1} alt="" className="img1" />
    <img src={img2} alt="" className="img2" />
  </div>
);

export default OrderImg;
