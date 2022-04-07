import React, {FC, useEffect, useReducer, useState, ChangeEvent} from 'react';
import {Checkbox, Input, Select, Dropdown, Menu, Button, Popover} from "antd";
import {DownOutlined, InfoOutlined} from '@ant-design/icons';
import {CheckboxChangeEvent} from 'antd/lib/checkbox/Checkbox';
import {MenuInfo} from "rc-menu/lib/interface";

import {ConflictAction, SettingsAction, settingsReducer, SettingsState} from '../reducers/settingsReducer'
import {date, validate as _v} from "../../common/js/utils";

const {Option} = Select

const settingsState: SettingsState = {
    downloadDownloadable: false,
    startTime: '',
    endTime: '',
    filename: '',
    conflictAction: 'uniquify',
    autoRenameIfHasError: false
}

const Settings: FC = () => {
    const [
        {
            downloadDownloadable,
            startTime,
            endTime,
            filename,
            conflictAction,
            autoRenameIfHasError
        },
        dispatch
    ] = useReducer(settingsReducer, settingsState)
    const [timeRangeHint, setTimeRangeHint] = useState('')
    const [filenameHint, setFilenameHint] = useState('')
    // 从 storage 获取 settings
    useEffect(() => {
        chrome.storage.sync.get(['settings'],
            ({settings}) => {
                const timeRangeValidate = validateTimeRange(settings.startTime, settings.endTime)
                const filenameValidate = validateFilename(settings.filename)
                const startTime = timeRangeValidate.isValidate ? settings.startTime : ''
                const endTime = timeRangeValidate.isValidate ? settings.endTime : ''
                const filename = filenameValidate.isValidate ? settings.filename : ''
                dispatch({
                    type: 'setSettings',
                    downloadDownloadable: settings.downloadDownloadable,
                    startTime,
                    endTime,
                    filename,
                    conflictAction: settings.conflictAction,
                    autoRenameIfHasError: settings.autoRenameIfHasError,
                })
            })
        // 将存在错误的 setting 项置空
        return () => {
            // 验证时间范围，设置 hint
            const timeRangeValidate = validateTimeRange(startTime, endTime)
            // 验证 filename
            const filenameValidate = validateFilename(filename)
            if (!timeRangeValidate.isValidate) {
                dispatch({
                    type: 'setSettings',
                    startTime: '',
                    endTime: '',
                })
            }
            if (!filenameValidate.isValidate) {
                dispatch({
                    type: 'setSettings',
                    filename: '',
                })
            }
        }
    }, [])


    // 多选框被点击
    const handleDownloadDownloadableCheckboxClick = (e: CheckboxChangeEvent) => {
        dispatch({
            type: 'setSettings',
            downloadDownloadable: e.target.checked
        })
    }
    // 开始时间被修改
    const handleTimeChange = (startTime: string, endTime: string) => {
        dispatch({
            type: 'setSettings',
            startTime,
            endTime
        })
        const validate = validateTimeRange(startTime, endTime)
        console.log('time validate', validate)
        if (!validate.isValidate) setTimeRangeHint(validate.text)
        else setTimeRangeHint('')
    }
    // 自动重命名被修改
    const handleAutoRenameIfHasErrorCheckboxClick = (e: CheckboxChangeEvent)=>{
        dispatch({
            type: 'setSettings',
            autoRenameIfHasError: e.target.checked
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
        const validate = validateFilename(filename)
        if (!validate.isValidate) setFilenameHint(validate.text)
        else setFilenameHint('')
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
                    <p>2. this string should be split by '/', the last part will be used as filename, and other parts
                        will
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

    const validateTimeRange = (startTime: string, endTime: string) => {
        const result = {
            isValidate: true,
            text: ''
        }
        // 验证 startTime 格式
        if (startTime !== '' && !date.isDateFormat(startTime)) {
            result.isValidate = false
            result.text = "start time must be format of 'xxxx-xx-xx'"
        }
        // 验证 endTime 格式
        else if (endTime !== '' && !date.isDateFormat(endTime)) {
            result.isValidate = false
            result.text = "end time must be format of 'xxxx-xx-xx'"
        }
        // 验证 endTime > startTime
        else if (startTime !== '' && endTime !== '' && new Date(endTime) < new Date(startTime)) {
            result.isValidate = false
            result.text = "end time must be greater than start time"
        }

        return result
    }
    const validateFilename = (filename: string) => {
        const result = {
            isValidate: true,
            text: ''
        }

        const dirs = filename.split('/')
        for (let [index, dir] of dirs.entries()) {
            // 替换 {user} {folder} {folderType} {deviation} {publishDate} {downloadDate} {downloadBy}
            const _dir = dir.replace(/{user}|{folder}|{folderType}|{deviation}|{publishDate}|{downloadDate}|{downloadBy}/ig, '-')
            // 验证 dir 是否为空
            if (_v.filename.isEmpty(_dir) && index !== 0) {
                result.isValidate = false
                result.text = "folder or file name can't be empty"
            }
            // 验证 是否存在非法设备名
            else if (_v.filename.deviceName(_dir)) {
                result.isValidate = false
                result.text = "folder or file name has invalid device name"
            }
            // 验证 是否存在非法字符
            else if (_v.filename.char(_dir)) {
                result.isValidate = false
                result.text = "folder or file can't include \\/:*?\"<>|"
            }
        }

        return result
    }

    return (
        <div className='settings'>
            <div className='settings-group settings-downloadDownloadable'>
                <Checkbox
                    checked={downloadDownloadable}
                    onChange={handleDownloadDownloadableCheckboxClick}
                >
                    only download deviations with download icon
                </Checkbox>
            </div>
            <div className='settings-group settings-timeRange'>
                <span>time range</span>
                <div className='settings-group-inner'>
                    <Input.Group compact size="small" className='settings-timeRange-group'>
                        <Input className="settings-timeRange-input" placeholder="start time" value={startTime}
                               onChange={(e) => {
                                   handleTimeChange(e.target.value, endTime)
                               }}/>
                        <Input className="settings-timeRange-split" placeholder="~" disabled/>
                        <Input className="settings-timeRange-input" placeholder="end time" value={endTime}
                               onChange={(e) => {
                                   handleTimeChange(startTime, e.target.value)
                               }}/>
                    </Input.Group>
                    {getTooltip('timeRange')}
                </div>
                {
                    timeRangeHint && (
                        <div className='settings-hint'>
                            <span className='settings-hint-text'>{timeRangeHint}</span>
                        </div>
                    )
                }
            </div>

            <div className='settings-group settings-filename'>
                <span>filename</span>
                <div className='settings-group-inner'>
                    <Input
                        value={filename}
                        onChange={handleFilenameChange}
                        className='settings-filename-input'
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
                        <Button size='small' className='settings-filename-button'>
                            <DownOutlined/>
                        </Button>
                    </Dropdown>
                    {getTooltip('filename')}
                </div>
                {
                    filenameHint && (
                        <div className='settings-hint'>
                            <span className='settings-hint-text'>{filenameHint}</span>
                        </div>
                    )
                }
            </div>
            <div className='settings-group settings-conflictAction'>
                <span>filename conflict action</span>
                <Select<ConflictAction>
                    value={conflictAction}
                    onChange={handleSelectChange}
                    className='settings-conflictAction-select'
                    size='small'
                >
                    <Option value='uniquify' className='settings-conflictAction-option'>rename with a counter</Option>
                    <Option value='overwrite' className='settings-conflictAction-option'>overwrite the existing
                        file</Option>
                </Select>
            </div>
            <div className='settings-group settings-autoRenameIfHasError'>
                <Checkbox
                    checked={autoRenameIfHasError}
                    onChange={handleAutoRenameIfHasErrorCheckboxClick}
                >
                    auto rename if has error in filename
                </Checkbox>
            </div>

        </div>
    )
}
export default Settings
