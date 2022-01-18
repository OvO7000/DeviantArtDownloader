import React, {FC, useEffect, useReducer, useState} from 'react'
import _ from 'lodash'
import {Button, Space, Tabs} from 'antd'

import Userinfo from './Userinfo'
import Settings from './Settings'
import {_chrome, getPageType, sendMessageToTab, validate as _v, date} from '../../common/js/utils'
import {UserInfoState, userInfoReducer} from '../reducers/userInfoReducer'
import {SettingsState, settingsReducer} from '../reducers/settingsReducer'
import {getFolders, Folder} from "../../common/js/apis";

const {TabPane} = Tabs

const userInfoState: UserInfoState = {
    username: '',
    _galleries: [],
    galleries: [],
    _favourites: [],
    favourites: [],
    selected: {
        galleries: [],
        favourites: []
    },
    status: 'beforeInit'
}

const settingsState: SettingsState = {
    downloadDownloadable: false,
    startTime: '',
    endTime: '',
    filename: '',
    conflictAction: 'uniquify'
}

const Home: FC = () => {
    const [
        {
            username,
            _galleries,
            galleries,
            _favourites,
            favourites,
            selected,
            status
        },
        dispatchUserInfo
    ] = useReducer(userInfoReducer, userInfoState)
    const [
        {
            downloadDownloadable,
            startTime,
            endTime,
            filename,
            conflictAction
        },
        dispatchSettings
    ] = useReducer(settingsReducer, settingsState)
    const [hint, setHint] = useState('')

    // 获取 user 信息
    // 获取 popup 页面信息
    const init = () => {
        _chrome.getTabInfoP().then((tab) => {
            // 检查页面类型
            if (tab.url) {
                const {pageType, pageInfo} = getPageType(tab.url)
                if (pageType === 'user' && pageInfo.username) {
                    const newUsername = pageInfo.username

                    chrome.storage.sync.get(['username', 'galleries', 'favourites', 'selected', 'status'],
                        ({username, galleries, favourites, selected, status}) => {
                            // 未初始化、初始化状态，重新获取用户信息
                            if (status === 'beforeInit' || status === 'initialed') {
                                getFolders(newUsername).then((galleries) => {
                                    getFolders(newUsername, 'collection').then((favourites) => {

                                        // 用户已变化，清空选择内容
                                        if (username !== newUsername) {
                                            dispatchUserInfo({
                                                type: 'setData',
                                                data: {
                                                    username: newUsername,
                                                    _galleries: galleries,
                                                    galleries: galleries.map(item => ({
                                                        name: item.name,
                                                        count: item.totalItemCount
                                                    })),
                                                    _favourites: favourites,
                                                    favourites: favourites.map(item => ({
                                                        name: item.name,
                                                        count: item.totalItemCount
                                                    })),
                                                    selected: {
                                                        galleries: [],
                                                        favourites: []
                                                    },
                                                    status: 'initialed'
                                                }
                                            })
                                        }
                                        // 用户未变化，对 selected 和新获取的 folders 进行比对
                                        else {

                                            const _selected = {
                                                galleries: selected.galleries.filter((item: string) => {
                                                    return galleries.find(gallery => gallery.name === item)
                                                }),
                                                favourites: selected.favourites.filter((item: string) => {
                                                    return favourites.find(favourite => favourite.name === item)
                                                })
                                            }
                                            dispatchUserInfo({
                                                type: 'setData',
                                                data: {
                                                    username: newUsername,
                                                    _galleries: galleries,
                                                    galleries: galleries.map(item => ({
                                                        name: item.name,
                                                        count: item.totalItemCount
                                                    })),
                                                    _favourites: favourites,
                                                    favourites: favourites.map(item => ({
                                                        name: item.name,
                                                        count: item.totalItemCount
                                                    })),
                                                    selected: _selected,
                                                    status: 'initialed'
                                                }
                                            })
                                        }
                                    })
                                })
                            }
                            // 下载、暂停、完成状态，直接使用 storage 内信息
                            else {
                                dispatchUserInfo({
                                    type: 'setData',
                                    data: {
                                        username,
                                        galleries,
                                        _galleries: [],
                                        favourites,
                                        _favourites: [],
                                        selected,
                                        status
                                    }
                                })
                            }
                        })

                }
                else {
                    // todo:不是用户页面，显示提醒
                }
            }

        })
    }
    useEffect(() => {
        if (status === 'beforeInit') {
            init()
        }
    }, [status])

    const event = (message: any) => {
        if (message.type === 'finished') {
            dispatchUserInfo({
                type: 'setStatus',
                data: {
                    status: 'finished'
                }
            })
        }
    }
    useEffect(() => {
        init()
        chrome.runtime.onMessage.addListener(event)
        return () => {
            chrome.runtime.onMessage.removeListener(event)
        }
    }, [])

    const validate = (startTime: string, endTime: string, filename: string) => {
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
        // 验证 filename 格式
        else {
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
        }

        return result
    }
    const getButtonGroup = () => {
        // 下载选中 folders
        const download = () => {
            if (status === 'initialed') {
                const {isValidate, text} = validate(startTime, endTime, filename)
                if (!isValidate) {
                    setHint(text)
                    return
                }
                sendMessageToTab('download', {
                    username,
                    galleries: _galleries.filter(item => selected.galleries.includes(item.name)),
                    favourites: _favourites.filter(item => selected.favourites.includes(item.name))
                })
                dispatchUserInfo({
                    type: 'setStatus',
                    data: {
                        status: 'downloading'
                    }
                })
            }
        }
        const stop = () => {
            sendMessageToTab('stop')
            dispatchUserInfo({
                type: 'setStatus',
                data: {
                    status: 'paused'
                }
            })
        }
        const cancel = () => {
            sendMessageToTab('cancel')
            dispatchUserInfo({
                type: 'setStatus',
                data: {
                    status: 'finished'
                }
            })
        }
        const _continue = () => {
            sendMessageToTab('continue')
            dispatchUserInfo({
                type: 'setStatus',
                data: {
                    status: 'downloading'
                }
            })
        }
        const reset = () => {
            chrome.storage.sync.set({
                username: '',
                selected: {
                    galleries: [],
                    favourites: []
                },
                galleries: {},
                favourites: {},
                status: 'beforeInit'
            }, () => {
                dispatchUserInfo({
                    type: 'setStatus',
                    data: {
                        status: 'beforeInit'
                    }
                })
            })
        }


        if (status === 'beforeInit' || status === 'initialed') {
            return (
                <Button
                    type='primary'
                    onClick={download}
                >
                    download
                </Button>
            )
        }
        else if (status === 'downloading') {
            return (
                <>
                    <Button type='primary' onClick={stop}>stop</Button>
                    <Button onClick={cancel}>cancel</Button>
                </>
            )
        }
        else if (status === 'paused') {
            return (
                <>
                    <Button type='primary' onClick={_continue}>continue</Button>
                    <Button onClick={cancel}>cancel</Button>
                </>
            )
        }
        else if (status === 'finished') {
            return (
                <>
                    <Button type='primary' onClick={reset}>reset</Button>
                </>
            )
        }
    }
    return (
        <>
            <div className="header">
                <h4>Deviant Art Downloader</h4>
            </div>
            <Userinfo
                requested={status !== 'beforeInit'}
                username={username}
                galleries={galleries}
                favourites={favourites}
                selectedGalleries={selected.galleries}
                selectedFavourites={selected.favourites}
                dispatch={dispatchUserInfo}
            />
            <Settings
                downloadDownloadable={downloadDownloadable}
                startTime={startTime}
                endTime={endTime}
                filename={filename}
                conflictAction={conflictAction}
                dispatch={dispatchSettings}
                hint={hint}
            />
            <div className='btns'>
                <Space>
                    {getButtonGroup()}
                </Space>
            </div>
        </>
    )
}

export default Home
