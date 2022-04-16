import React, {FC, useEffect, useReducer} from 'react'
import {Button, Popover, Space} from 'antd'
import {InfoOutlined, WarningOutlined} from '@ant-design/icons';

import Userinfo from './Userinfo'
import {_chrome} from '../../common/js/utils'
import {UserInfoState, userInfoReducer} from '../reducers/userInfoReducer'
import {getFolders} from "../../common/js/apis";

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


interface HomeProps {
    username: string
}

const Download: FC<HomeProps> = (props) => {
    const {username} = props
    const [
        {
            _galleries,
            galleries,
            _favourites,
            favourites,
            selected,
            status
        },
        dispatch
    ] = useReducer(userInfoReducer, userInfoState)


    // 获取 popup 页面信息
    const init = () => {
        const newUsername = username

        chrome.storage.sync.get(['username', 'galleries', 'favourites', 'selected', 'status'],
            ({username, galleries, favourites, selected, status}) => {
                // 未初始化、初始化状态，重新获取用户信息
                if (status === 'beforeInit' || status === 'initialed') {
                    getFolders(newUsername).then((galleries) => {
                        getFolders(newUsername, 'collection').then((favourites) => {

                            // 用户已变化，清空选择内容
                            if (username !== newUsername) {
                                dispatch({
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
                                dispatch({
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
                    dispatch({
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
    useEffect(() => {
        if (status === 'beforeInit') {
            init()
        }
    }, [status])

    const event = (message: any) => {
        if (message.type === 'finished') {
            dispatch({
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

    const getButtonGroup = () => {
        // 下载选中 folders
        const download = () => {
            if (status === 'initialed') {
                _chrome.sendMessageToTab('download', {
                    username,
                    galleries: _galleries.filter(item => selected.galleries.includes(item.name)),
                    favourites: _favourites.filter(item => selected.favourites.includes(item.name))
                }).catch(err => {
                    console.log(err)
                })
                dispatch({
                    type: 'setStatus',
                    data: {
                        status: 'downloading'
                    }
                })
            }
        }
        const stop = () => {
            _chrome.sendMessageToTab('stop').catch(err => {
                console.log(err)
            })
            dispatch({
                type: 'setStatus',
                data: {
                    status: 'paused'
                }
            })
        }
        const cancel = () => {
            _chrome.sendMessageToTab('cancel').catch(err => {
                console.log(err)
            })
            dispatch({
                type: 'setStatus',
                data: {
                    status: 'finished'
                }
            })
        }
        const _continue = () => {
            _chrome.sendMessageToTab('continue').catch(err => {
                console.log(err)
            })
            dispatch({
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
                dispatch({
                    type: 'setStatus',
                    data: {
                        status: 'beforeInit'
                    }
                })
            })
        }


        if (status === 'beforeInit' || status === 'initialed') {
            return (
                <>
                    <Button
                        type='primary'
                        onClick={download}
                    >
                        download
                    </Button>
                    <Popover content={(
                        <div className='download-chromeSettingHint'>
                            <WarningOutlined className='download-warningIcon'/>
                            <span>please close Chrome's option in Settings-&gt;Downloads-&gt;Ask where to save each file before downloading</span>
                        </div>
                    )}>
                        <Button shape="circle" size="small" className='settings-info' icon={<InfoOutlined/>}/>
                    </Popover>

                </>
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
        <div className='download'>
            <p className='download-username'>{username}</p>
            <Userinfo
                requested={status !== 'beforeInit'}
                username={username}
                galleries={galleries}
                favourites={favourites}
                selectedGalleries={selected.galleries}
                selectedFavourites={selected.favourites}
                dispatch={dispatch}
            />
            <div className='download-footer'>
                <span className='download-status'>{status}</span>
                <div className='download-btns'>
                    <Space>
                        {getButtonGroup()}
                    </Space>
                </div>
            </div>

        </div>
    )
}

export default Download
