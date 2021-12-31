import React from 'react';
import ReactDOM from 'react-dom';
import Popup from './components/Home';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/es/locale/zh_CN';
import './popup.styl'

const antdConfig = {
    locale: zhCN
}
// popup 入口
ReactDOM.render(
  <React.StrictMode>
      <ConfigProvider {...antdConfig}><Popup /></ConfigProvider>
  </React.StrictMode>,
  document.getElementById('root')
)
