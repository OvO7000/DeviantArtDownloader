import React, {FC, useEffect, useReducer} from 'react'
import _ from 'lodash'
import MessageSender = chrome.runtime.MessageSender
import {getPageType, mapLimit, getDownloadLink} from '../../utils'
import {getFolders, getDeviations, Deviation, Folder, FolderType} from '../../apis'

interface State {
    username: string,
    _folders: Folder[],
    selected: {
        galleries: string[],
        favourites: string[],
    },
    folders: Folder[],
    deviations: {
        name: string;
        type: FolderType;
        folderId: number;
        deviations: Deviation[];
    }[],
    show: boolean,
    status: number,
    statusText: string,
    current: string,
    group: {
        title: string,
        current: number,
        total: number
    },
    subGroup: {
        title: string,
        current: number,
        total: number
    }
}

export interface Action {
    data: {
        [propName: string]: any;
    };
    type: 'init' | 'setSelected' | 'setDeviation' | 'setStatus'
}

const initialState = {
    username: '',
    _folders: [],
    selected: {
        galleries: [],
        favourites: [],
    },
    deviations: [],
    // 通过 api 获取的 deviations 列表
    folders: [],

    show: false,
    // 0 未初始化
    // 1 初始化完成
    // 2 抓取中 crawling
    // 3 抓取完成
    // 4 下载中 download
    // 5 下载完成 finished
    status: 0,
    statusText: '',
    current: '',
    group: {
        title: '',
        current: 0,
        total: 0
    },
    subGroup: {
        title: '',
        current: 0,
        total: 0
    }
}

const reducer = (state: State, action: Action) => {
    if (action.type === 'init') {
        const _state = _.cloneDeep(state)
        _state.username = action.data.username
        _state._folders = action.data.galleries.concat(action.data.favourites)
        return _state
    }
    else if (action.type === 'setSelected') {
        const _state = _.cloneDeep(state)
        _state.selected.galleries = action.data.galleries
        _state.selected.favourites = action.data.favourites
        _state.folders = action.data.folders
        return _state
    }
    else if (action.type === 'setDeviation') {
        const _state = _.cloneDeep(state)
        _state.deviations.push({
            name: action.data.name,
            type: action.data.type,
            folderId: action.data.folderId,
            deviations: action.data.deviations,
        })
        return _state
    }
    else if (action.type === 'setStatus') {
        const status = action.data.status
        const _state = _.cloneDeep(state)

        _state.status = status
        if (status === 2) _state.statusText = 'crawling'
        else if (status === 4) _state.statusText = 'downloading'
        else if (status === 5) _state.statusText = 'finished'
        else _state.statusText = ''
        return _state
    }
    return state
}


const Panel: FC = () => {
    const [state, dispatch] = useReducer(reducer, initialState)

    const init = ()=>{
        // 检查页面类型
        const url = window.location.href
        const {pageType, pageInfo} = getPageType(url)
        // 获取用户 gallery 列表
        if (pageType === 'user' && pageInfo.username) {
            const username = pageInfo.username
            getFolders(username).then((galleries) => {
                getFolders(username, 'collection').then((favourites) => {
                    chrome.storage.sync.set({
                        username,
                        galleries: galleries.map((item) => item.name),
                        favourites: favourites.map((item) => item.name)
                    }, ()=>{
                        dispatch({
                            type: 'init',
                            data: {
                                username,
                                galleries,
                                favourites
                            }
                        })
                        dispatch({
                            type: 'setStatus',
                            data: {
                                status: 1
                            }
                        })
                    })

                })

            })
        }
        return true
    }
    useEffect(()=>{
        init()
    }, [])

    const events = (message: any, sender: MessageSender, sendResponse: any) => {
        console.log('events() called')
        if (message.type === 'download') {
            const {galleries, favourites} = message.data
            dispatch({
                type: 'setStatus',
                data: {
                    status: 2
                }
            })
            // 获取选中的 folders
            const folders = state._folders.filter((item, index)=>{
                if (item.type === 'gallery' && galleries.includes(item.name)) return true
                else if (item.type === 'collection' && favourites.includes(item.name)) return true
                else return false
            })
            dispatch({
                type: 'setSelected',
                data: {
                    folders,
                    galleries,
                    favourites
                }
            })

            // 异步请求并发控制
            const limit = 3
            mapLimit(folders, limit, async (item) => {
                // 获取单个 folder 下 deviation
                const res = await getDeviations(state.username, item.type, item.folderId)
                dispatch({
                    type: 'setDeviation',
                    data: {
                        name: item.name,
                        folderId: item.folderId,
                        type: item.type,
                        deviations: res
                    }
                })

            }).then((res)=>{
                console.log('finished')
                dispatch({
                    type: 'setStatus',
                    data: {
                        status: 3
                    }
                })
            })
        }
    }
    const download = async () => {
        dispatch({
            type: 'setStatus',
            data: {
                status: 4
            }
        })
        console.log('download called')
        const limit = 3
        const username = state.username
        await mapLimit(state.deviations, limit, async(folder)=>{
            const { deviations, name, folderId, type } = folder
            await mapLimit(deviations, limit, async (deviation) => {
                const link = await getDownloadLink(deviation)
                chrome.runtime.sendMessage({
                    type: 'download',
                    link,
                    username,
                    folder: {
                        name,
                        folderId,
                        type
                    },
                    deviation
                })
            })
        })
    }
    useEffect(() => {
        console.log('useEffect called')
        if (state.status === 3) {
            download().then(() => {})
        }
        chrome.runtime.onMessage.addListener(events)
        return ()=>{
            chrome.runtime.onMessage.removeListener(events)
        }
    })

    return (
        <div className='dad-panel'>
            test
        </div>
    )
}

export default Panel
