import React, {FC, useState} from 'react';
import Download from './Download'
import Settings from './Settings'
import {Button} from 'antd'
import {ArrowDownOutlined, SettingOutlined, GithubOutlined} from "@ant-design/icons";
import {GITHUB_URL} from "../../common/js/utils";

export interface HomeProps {
    username: string
}

const Home: FC<HomeProps> = (props) => {
    const {username} = props
    const [showSettings, setShowSettings] = useState(false)
    const openGithub = ()=>{
        chrome.tabs.create({
            active: true,
            url: GITHUB_URL
        })
    }
    return (
        <div className='home'>
            <div className='home-buttons'>
                <Button
                    shape="circle"
                    type="text"
                    className='home-button'
                    icon={<GithubOutlined />}
                    onClick={openGithub}
                />
                <Button
                    shape="circle"
                    type="text"
                    className='home-button'
                    icon={<ArrowDownOutlined className={showSettings ? '' : 'home-flip-active'}/>}
                    onClick={() => {
                        setShowSettings(false)
                    }}
                />
                <Button
                    shape="circle"
                    type="text"
                    className='home-button'
                    icon={<SettingOutlined className={showSettings ? 'home-flip-active' : ''}/>}
                    onClick={() => {
                        setShowSettings(true)
                    }}
                />
            </div>
            {showSettings
                ? <Settings/>
                : <Download username={username}/>
            }
        </div>
    )
}
export default Home
