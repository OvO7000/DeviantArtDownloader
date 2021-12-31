import React, {FC} from 'react';
import {Tabs} from 'antd';
import Download from './Download';
import Settings from './Settings';

const {TabPane} = Tabs

const Home: FC = () => {

    return (
        <>
            <div className="header">
                <h4>Deviant Art Downloader</h4>
            </div>
            <Tabs>
                <TabPane tab={
                    <span className='tab-title'>download</span>
                } key="1">
                    <Download/>
                </TabPane>
                <TabPane tab={
                    <span className='tab-title'>settings</span>
                } key="2">
                    <Settings/>
                </TabPane>
            </Tabs>
        </>
    )
}

export default Home
