import React, { FC, useState } from 'react';
import {HashRouter, Route, Switch, Redirect, NavLink} from 'react-router-dom';
import { Menu } from 'antd';
import Download from '../download';
import Settings from '../settings';
import { MenuInfo } from 'rc-menu/lib/interface';
import './popup.styl'

const Home: FC = () => {
    const [selectedMenu, setSelectedMenu] = useState('download')
    const handleClick = (e:MenuInfo) => {
        setSelectedMenu(e.key);
    };

    return (
        <>
            <div className="header">
                <h4>Deviant Art Downloader</h4>
            </div>
            <HashRouter>
                <Menu onClick={handleClick} selectedKeys={[selectedMenu]} mode="horizontal">
                    <Menu.Item key="download">
                        <NavLink to='/home/download' className="navLink">下载</NavLink>
                    </Menu.Item>
                    <Menu.Item key="settings">
                        <NavLink to='/home/settings' className="navLink">设置</NavLink>
                    </Menu.Item>
                </Menu>
                <Switch>
                    <Route path="/home/download" exact component={Download} />
                    <Route path="/home/settings" exact component={Settings} />
                    <Redirect  to={'/home/download'} />
                </Switch>
            </HashRouter>
        </>
    )
}

export default Home
