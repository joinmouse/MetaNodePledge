import React from 'react';
import { Link } from 'react-router-dom';

import pageURL from '_constants/pageURL';

import './index.less';

const LeftMenu: React.FC = () => (
  <div className="left-menu-list">
    <Link to={pageURL.home}>首页</Link>
  </div>
);

export default LeftMenu;
