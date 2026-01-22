import React from 'react';
import { Menu, Dropdown } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

import './index.less';

/**
 * 其它组件
 */
const SwitchLanguage = () => {
  const { t, i18n } = useTranslation();

  const handleToggleLanguage = ({ key }) => {
    i18n.changeLanguage(key);
  };

  return (
    <Dropdown 
      menu={{
        onClick: handleToggleLanguage,
        style: { minWidth: '100px' },
        items: [
          { key: 'zhCN', label: t('zhCN') },
          { key: 'enUS', label: t('enUS') }
        ]
      }} 
      style={{ cursor: 'pointer' }} 
      placement="bottomRight"
      <div className="components-switch-language">
        <span style={{ marginRight: '6px' }}>{t(i18n.language)}</span>
        <DownOutlined />
      </div>
    </Dropdown>
  );
};

export default SwitchLanguage;
export default SwitchLanguage;
