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
import i18n from '_utils/i18n';
import rootStore from '_src/stores';

const Root = () => (
  <Provider testStore={rootStore.testStore}>
    <ThemeProvider>
      <ConfigProvider locale={i18n.language === 'zhCN' ? antdZhCN : antdEnUS}>
        <BrowserRouter>
          <RecoilRoot>
            <Routes />
          </RecoilRoot>
        </BrowserRouter>
      </ConfigProvider>
    </ThemeProvider>
  </Provider>
);

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<Root />);
