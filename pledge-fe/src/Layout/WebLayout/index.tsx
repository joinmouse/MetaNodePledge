import React from 'react';
import classnames from 'classnames';
import Footer from '_components/Footer';

import './index.less';

interface IwebLayout {
  className?: string;
}

const WebLayout: React.FC<IwebLayout> = ({ children, className, ...props }) => (
  <div className={classnames('web-layout', className)}>
    {children}
    <Footer />
  </div>
);

export default WebLayout;
