import React, {FC, useEffect, useReducer, useState, ChangeEvent} from 'react';
import {Checkbox, Input, Select, Dropdown, Menu, Button, Popover} from "antd";
import {DownOutlined, InfoOutlined} from '@ant-design/icons';
import {CheckboxChangeEvent} from 'antd/lib/checkbox/Checkbox';
import {MenuInfo} from "rc-menu/lib/interface";

import {ConflictAction, SettingsAction} from '../reducers/settingsReducer'

const {Option} = Select

export interface SettingsProps {
    downloadDownloadable: boolean,
    startTime: string,
    endTime: string,
    filename: string,
    conflictAction: ConflictAction,
    dispatch: (action: SettingsAction) => void,
    hint: string
}


const Settings: FC<SettingsProps> = (props) => {
    const {
        downloadDownloadable,
        startTime,
        endTime,
        filename,
        conflictAction,
        hint,
        dispatch
    } = props

    // 从 storage 获取 settings
    useEffect(() => {
        chrome.storage.sync.get(['settings'],
            ({settings}) => {
                dispatch({
                    type: 'init',
                    settings: {
                        downloadDownloadable: settings.downloadDownloadable || false,
                        startTime: settings.startTime || '',
                        endTime: settings.endTime || '',
                        filename: settings.filename || '',
                        conflictAction: settings.conflictAction || 'uniquify'
                    }
                })
            })
    }, [])

    // 多选框被点击
    const handleCheckboxClick = (e: CheckboxChangeEvent) => {
        dispatch({
            type: 'setSettings',
            downloadDownloadable: e.target.checked
        })
    }
    // 开始时间被修改
    const handleStartTimeChange = (e: ChangeEvent<HTMLInputElement>) => {
        dispatch({
            type: 'setSettings',
            startTime: e.target.value
        })
    }
    // 结束时间被修改
    const handleEndTimeChange = (e: ChangeEvent<HTMLInputElement>) => {
        dispatch({
            type: 'setSettings',
            endTime: e.target.value
        })
    }
    // conflictAction 下拉框改变
    const handleSelectChange = (value: ConflictAction) => {
        dispatch({
            type: 'setSettings',
            conflictAction: value
        })
    }
    // filename 输入框修改
    const handleFilenameChange = (e: ChangeEvent<HTMLInputElement>) => {
        dispatch({
            type: 'setSettings',
            filename: e.target.value
        })
    }
    // 选择预设的文本
    // filename menu 被点击
    // 修改 filename state
    const handleMenuClick = (info: MenuInfo) => {
        const {key} = info
        dispatch({
            type: 'setSettings',
            filename: `${filename}{${key}}`
        })
    }
    // 获取提示信息
    const getTooltip = (type: 'timeRange' | 'filename') => {
        let content = (<div>info</div>)
        if (type === 'timeRange') {
            content = (
                <div>
                    <p>1. when end time and start time both are empty, extension will download all deviations.</p>
                    <p>2. when start time is empty, extension will download all deviations publishedDate before end
                        time.</p>
                    <p>3. when end time is empty, extension will download all deviations publishedDate after start
                        time.</p>
                </div>
            )
        }
        else if (type === 'filename') {
            content = (
                <div>
                    <p>1. deviations will be downloaded to the download folder.</p>
                    <p>2. this string should be split by '/', the last part will be used as filename, and other parts will
                        be used as folder name.</p>
                    <p>3. deviations without download icon, will be downloaded from the web page, you can
                        use {'\u007b'}downloadBy{'\u007d'} to identify it.</p>
                    <p>4. the extension provides some variables, below is the explanation of these variables.</p>
                    <ul>
                        <li>user: name of artist's account</li>
                        <li>folder: name of gallery or favourite</li>
                        <li>folderType: 'gallery' or 'favourite'</li>
                        <li>deviation: name of deviation</li>
                        <li>publishDate: published date of deviation</li>
                        <li>downloadDate: download date</li>
                        <li>downloadBy: 'downloadByDownloadLink' or 'downloadByWebImage'</li>
                    </ul>
                </div>
            )
        }
        return (
            <Popover content={content}>
                <Button shape="circle" size="small" className='settings-info' icon={<InfoOutlined/>}/>
            </Popover>

        )

    }
    return (
        <div className='settings'>
            <div className='group downloadDownloadable'>
                <Checkbox
                    checked={downloadDownloadable}
                    onChange={handleCheckboxClick}
                >
                    only download deviations with download icon
                </Checkbox>
            </div>
            <div className='group timeRange'>
                <span>time range</span>
                <div className='group-inner'>
                    <Input.Group compact size="small" className='timeRange-group'>
                        <Input className="timeRange-input" placeholder="start time" value={startTime}
                               onChange={handleStartTimeChange}/>
                        <Input className="timeRange-split" placeholder="~" disabled/>
                        <Input className="timeRange-input" placeholder="end time" value={endTime}
                               onChange={handleEndTimeChange}/>
                    </Input.Group>
                    {getTooltip('timeRange')}
                </div>

            </div>
            <div className='group filename'>
                <span>filename</span>
                <div className='group-inner'>
                    <Input
                        value={filename}
                        onChange={handleFilenameChange}
                        className='filename-input'
                        size='small'
                    />
                    <Dropdown overlay={
                        <Menu onClick={handleMenuClick}>
                            <Menu.Item key="user">user</Menu.Item>
                            <Menu.Item key="folder">folder</Menu.Item>
                            <Menu.Item key="folderType">folderType</Menu.Item>
                            <Menu.Item key="deviation">deviation</Menu.Item>
                            <Menu.Item key="publishDate">publishDate</Menu.Item>
                            <Menu.Item key="downloadDate">downloadDate</Menu.Item>
                            <Menu.Item key="downloadBy">downloadBy</Menu.Item>
                        </Menu>
                    }>
                        <Button size='small' className='filename-button'>
                            <DownOutlined/>
                        </Button>
                    </Dropdown>
                    {getTooltip('filename')}
                </div>

            </div>
            <div className='group conflictAction'>
                <span>filename conflict action</span>
                <Select<ConflictAction>
                    value={conflictAction}
                    onChange={handleSelectChange}
                    className='conflictAction-select'
                    size='small'
                >
                    <Option value='uniquify' className='conflictAction-option'>rename with a counter</Option>
                    <Option value='overwrite' className='conflictAction-option'>overwrite the existing file</Option>
                </Select>
            </div>
            <div className='hint'>
                <span className='hint-text'>{hint}</span>
            </div>
        </div>
    )
}
export default Settings
