import React, {FC, useEffect, useReducer} from 'react'
import _ from 'lodash'
import {Button, Space, Tabs} from 'antd'
import Userinfo from './Userinfo'
import Settings from './Settings'
import {sendMessageToTab} from '../../common/js/utils'

const {TabPane} = Tabs

export type ActionDataType = 'galleries' | 'favourites'
type Status = 'beforeInit' | 'initialed' | 'downloading' | 'paused' | 'finished'
export type Action = {
    type: 'select',
    data: {
        type: ActionDataType,
        list: string[]
    };
} | {
    type: 'setData',
    data: State;
} | {
    type: 'setStatus',
    data: {
        status: Status
    };
}

interface State {
    username: string;
    galleries: {
        name: string;
        count: number;
    }[];
    favourites: {
        name: string;
        count: number;
    }[];
    selected: {
        galleries: string[],
        favourites: string[]
    },
    status: Status
}

const initialState: State = {
    username: '',
    galleries: [],
    favourites: [],
    selected: {
        galleries: [],
        favourites: []
    },
    status: 'beforeInit'
}
const reducer = (state: State, action: Action) => {
    if (action.type === 'setData') {
        const {username, galleries, favourites, selected, status} = action.data
        const result: State = {
            username,
            galleries,
            favourites,
            selected: {
                galleries: [],
                favourites: []
            },
            status: 'initialed'
        }
        selected && (result.selected = selected)
        status && (result.status = status)
        return result
    }
    else if (action.type === 'select') {
        const {type, list} = action.data
        const _state = _.cloneDeep(state)
        if (type === 'galleries' || type === 'favourites') {
            _state.selected[type] = list
            chrome.storage.sync.set(_state)
            return _state
        }
    }
    else if (action.type === 'setStatus') {
        const {status} = action.data
        const _state = _.cloneDeep(state)
        _state.status = status
        chrome.storage.sync.set(_state)
        return _state
    }
    return state
}


const Home: FC = () => {
    const [
        {
            username,
            galleries,
            favourites,
            selected,
            status
        },
        dispatch
    ] = useReducer(reducer, initialState)
    // 获取 user 信息
    const getFolders = () => {
        chrome.storage.sync.get(['username', 'galleries', 'favourites', 'selected', 'status'],
            (data) => {
                console.log(data)
                const _data = data as State
                if (data.username) {
                    dispatch({
                        type: 'setData',
                        data: _data
                    })
                }
            })
    }


    useEffect(() => {
        getFolders()
    }, [])

    const getButtonGroup = () => {
        // 下载选中 folders
        const download = () => {
            if (status !== 'initialed') return
            // chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
            //     if (tabs && tabs[0] && tabs[0].id) {
            //         console.log(tabs)
            //
            //         chrome.tabs.sendMessage(
            //             tabs[0].id,
            //             {
            //                 type: 'download',
            //                 data: {
            //                     galleries: selected.galleries,
            //                     favourites: selected.favourites
            //                 }
            //             })
            //     }
            // })
            sendMessageToTab('download', {
                galleries: selected.galleries,
                favourites: selected.favourites
            })
            dispatch({
                type: 'setStatus',
                data: {
                    status: 'downloading'
                }
            })
        }
        const stop = () => {
            sendMessageToTab('stop')
            dispatch({
                type: 'setStatus',
                data: {
                    status: 'paused'
                }
            })
        }
        const cancel = () => {
            sendMessageToTab('cancel')
            dispatch({
                type: 'setStatus',
                data: {
                    status: 'finished'
                }
            })
        }
        const _continue = () => {
            sendMessageToTab('continue')
            dispatch({
                type: 'setStatus',
                data: {
                    status: 'downloading'
                }
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
                    <Button type='primary'>download</Button>
                    <Button>download record</Button>
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
                dispatch={dispatch}
            />
            <Settings />
            <div className='btns'>
                <Space>
                    {getButtonGroup()}
                </Space>
            </div>
        </>
    )
}

export default Home
