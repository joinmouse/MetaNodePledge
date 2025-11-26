import './index.less';

import React, { ReactNode } from 'react';

import classnames from 'classnames';

export interface IDappLayout {
  title?: string;
  info?: JSX.Element | string | number;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}

const DappLayout: React.FC<IDappLayout> = ({ title = '', info = null, children, className = '', style = null, ...props }) => {
  return (
    <section className={classnames('dapp-layout', className)} {...props}>
      <h2 className="landingbox_title" style={{ display: 'flex', alignItems: 'flex-start' }}>
        {title}
      </h2>

      <div className="landingbox_info">{info}</div>
      {children}
    </section>
  );
};



export default DappLayout;
