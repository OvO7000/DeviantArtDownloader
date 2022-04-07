import React, {FC} from 'react';
import {UserOutlined, QuestionCircleFilled} from '@ant-design/icons';

const Hint:FC= ()=>{
    return (
        <div className='hint'>
            <div className='hint-icons'>
                <UserOutlined className='hint-icons-user'/>
                <div className='hint-icons-container'>
                    <QuestionCircleFilled className='hint-icons-question' />
                </div>
            </div>
            <p className='hint-title'>Unknown</p>
            <p className='hint-desc'>Deviant art downloader only works on an artist's homepage</p>
        </div>
    )
}
export default Hint
