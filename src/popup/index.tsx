import React from 'react';
import ReactDOM from 'react-dom';
import Popup from './components/App';
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
// 捕获 popover 导致的 ResizeObserver loop limit exceeded
window.onerror = function(e) {
    if(e.toString() === 'ResizeObserver loop limit exceeded') {
        return true
    }
}
