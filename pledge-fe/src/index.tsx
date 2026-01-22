import '_assets/themes/light.css';
import '_assets/themes/dark.css';
import '_assets/less/index.less';

import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { Provider } from 'mobx-react';
import React from 'react';
import { RecoilRoot } from 'recoil';
import Routes from '_src/routes';
import { ThemeProvider } from '_components/SwitchThemes';
// antd 组件库 多语言
import antdEnUS from 'antd/lib/locale/en_US';
import antdZhCN from 'antd/lib/locale/zh_CN';
import { createRoot } from 'react-dom/client';
import rootStore from '_src/stores';

// 国际化配置
import './i18n';
import { useTranslation } from 'react-i18next';

const AppContent = () => {
  const { i18n } = useTranslation();
  const antdLocale = i18n.language === 'zh' ? antdZhCN : antdEnUS;

  return (
    <ConfigProvider locale={antdLocale}>
      <BrowserRouter>
        <RecoilRoot>
          <Routes />
        </RecoilRoot>
      </BrowserRouter>
    </ConfigProvider>
  );
};

const Root = () => (
  <Provider appStore={rootStore.appStore}>
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  </Provider>
);

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<Root />);
