import React, {FC, useState} from 'react';
import Download from './Download'
import Settings from './Settings'
import {Button} from 'antd'
import {ArrowDownOutlined, SettingOutlined} from "@ant-design/icons";

export interface HomeProps {
    username: string
}

const Home: FC<HomeProps> = (props) => {
    const {username} = props
    const [showSettings, setShowSettings] = useState(false)
    const handleClick = () => {
        setShowSettings(!showSettings)
    }
    return (
        <div className='home'>
            <div className='home-flip' onClick={handleClick}>
                <Button
                    shape="circle"
                    type="text"
                    icon={<ArrowDownOutlined className={showSettings?'':'home-flip-active'}/>}/>
                <Button
                    shape="circle"
                    type="text"
                    icon={<SettingOutlined className={showSettings?'home-flip-active':''}/>}/>
            </div>
            {showSettings
                ? <Settings/>
                : <Download username={username}/>
            }
        </div>
    )
}
export default Home
