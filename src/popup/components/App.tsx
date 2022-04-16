import React, {FC, useEffect, useState} from 'react';
import {_chrome, getPageType} from "../../common/js/utils";
import Home from './Home'
import Hint from './Hint'
import DeviantArtDownloaderLogo from "../../common/images/DeviantArtDownloaderLogo.png"

const App:FC = ()=>{
    const [username, setUsername] = useState('')

    // 获取 user 信息
    // 获取 popup 页面信息
    const init = () => {
        _chrome.getTabInfoP().then((tab) => {
            // 检查页面类型
            if (tab.url) {
                const {pageType, pageInfo} = getPageType(tab.url)
                if (pageType === 'user' && pageInfo.username) {
                    setUsername(pageInfo.username)
                }
                else {
                    // 不是用户页面，显示提醒
                    setUsername('')
                }
            }
        })
    }
    useEffect(() => {
        init()
    })
    // todo: 添加 logo
    return (
        <div className='app'>
            <img
                src={DeviantArtDownloaderLogo}
                alt='DeviantArtDownloader'
                className='app-logo'
            />
            {
                username?<Home username={username} />:<Hint />
            }
        </div>
    )
}
export default App
