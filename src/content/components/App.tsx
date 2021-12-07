import React, {FC, useEffect, useReducer} from 'react'
import classnames from 'classnames'
import MessageSender = chrome.runtime.MessageSender
import {getPageType, mapLimit, getDownloadLink, sendMessagePromise} from '../../common/js/utils'
import {getFolders, getDeviations} from '../../common/js/apis'
import {panelReducer, PanelState} from "../reducers/panelReducer";
import {dataReducer} from "../reducers/dataReducer";

import Progress from './Progress'

const initialDataState = {
    username: '',
    // 所有的 folder
    _folders: [],
    // 选中的 folder
    folders: [],
    selected: {
        galleries: [],
        favourites: [],
    },
    // 通过 api 获取的 deviations 列表
    deviations: [],
}
const initialPanelState: PanelState = {
    show: true,
    download: false,
    status: 'crawling',
    current: '',
    progress: 0,
    group: {
        title: 'gallery',
        current: 0,
        total: 0
    },
    subGroup: {
        title: 'favourite',
        current: 0,
        total: 0
    }
}

const Panel: FC = () => {
    const [stateData, dispatchData] = useReducer(dataReducer, initialDataState)
    const [statePanel, dispatchPanel] = useReducer(panelReducer, initialPanelState)

    // 获取页面用户信息
    const init = () => {
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
                    }, () => {
                        dispatchData({
                            type: 'init',
                            data: {
                                username,
                                galleries,
                                favourites
                            }
                        })
                    })
                })
            })
        }
    }
    useEffect(() => {
        console.log('init useEffect called')
        init()
    }, [])

    // 监听 popup/background 事件
    const events = (message: any, sender: MessageSender, sendResponse: any) => {
        console.log('events() called')
        // 抓取、下载作品
        if (message.type === 'download') {
            const {galleries, favourites} = message.data

            // 获取选中的 folders
            const folders = stateData._folders.filter((item, index) => {
                if (item.type === 'gallery' && galleries.includes(item.name)) return true
                else if (item.type === 'collection' && favourites.includes(item.name)) return true
                else return false
            })
            if (folders.length <= 0) return
            dispatchData({
                type: 'setSelected',
                data: {
                    folders,
                    galleries,
                    favourites
                }
            })
            // 设置 Panel
            dispatchPanel({
                type: 'setPanel',
                data: {
                    status: 'crawling',
                    group: {
                        title: 'Galleries',
                        total: galleries.length
                    },
                    subGroup: {
                        title: 'Favourites',
                        total: favourites.length
                    },
                }
            })

            // 抓取作品列表
            const limit = 3
            mapLimit(folders, limit, async (item) => {

                // 设置 panel 的 current
                dispatchPanel({
                    type: 'setPanel',
                    data: {
                        current: item.name
                    }
                })

                // 获取单个 folder 下 deviation
                const res = await getDeviations(stateData.username, item.type, item.folderId)

                dispatchData({
                    type: 'setDeviation',
                    data: {
                        name: item.name,
                        folderId: item.folderId,
                        type: item.type,
                        deviations: res
                    }
                })
                const type = item.type === 'gallery'?'group':'subGroup'
                dispatchPanel({
                    type: 'addCurrent',
                    data: {
                        target: type,
                        progress: type
                    }
                })

            }).then((res) => {
                console.log('crawl finished')
                dispatchPanel({
                    type: 'setDownload'
                })
            })
        }
    }
    useEffect(() => {
        console.log('event useEffect called')

        chrome.runtime.onMessage.addListener(events)
        return () => {
            chrome.runtime.onMessage.removeListener(events)
        }

    }, [stateData])

    // 下载图片
    const download = async () => {
        // 设置 panel
        dispatchPanel({
            type: 'setPanel',
            data: {
                status: 'downloading',
                current: '',
                progress: 0,
                group: {
                    title: '',
                    current: 0,
                    total: 0
                },
                subGroup: {
                    title: 'Folders',
                    current: 0,
                    total: stateData.folders.length
                }
            }
        })
        // 下载 folders
        const username = stateData.username
        await mapLimit(stateData.deviations, 1, async (folder) => {
            const {deviations, name, folderId, type} = folder
            // 设置 group
            dispatchPanel({
                type: 'setPanel',
                data: {
                    group: {
                        title: name,
                        total: deviations.length
                    }
                }
            })
            await mapLimit(deviations, 3, async (deviation) => {
                // 设置 current
                dispatchPanel({
                    type: 'setPanel',
                    data: {
                        current: deviation.title
                    }
                })
                const link = await getDownloadLink(deviation)
                await sendMessagePromise({
                    type: 'download',
                    link,
                    username,
                    folder: {
                        name,
                        folderId,
                        type
                    },
                    deviation
                }).then(() => {
                    dispatchPanel({
                        type: 'addCurrent',
                        data: {
                            target: 'group',
                            progress: 'group'
                        }
                    })
                })
            })
            // 清空 group
            dispatchPanel({
                type: 'setPanel',
                data: {
                    current: '',
                    progress: 0,
                    group: {
                        title: '',
                        current: 0,
                        total: 0
                    }
                },
            })
            // subGroup.current + 1
            dispatchPanel({
                type: 'addCurrent',
                data: {
                    target: 'subGroup'
                },
            })
        })
    }
    useEffect(() => {
        console.log('download useEffect called')

        if (statePanel.download) {
            console.log('download called')
            download().then(() => {
                console.log('download finished')
            })
        }
    }, [statePanel.download])

    const classes = classnames('dad-cs-panel', {
        show: statePanel.show
    })

    return (
        <div className={classes}>
            <Progress percent={statePanel.progress}/>
            <div className='dad-cs-info'>
                <div className='dad-cs-status'>
                    <span className='dad-cs-status-l'>{statePanel.status}</span>
                    <span className='dad-cs-status-r'>{statePanel.current}</span>
                </div>
                <div className='dad-cs-group'>
                    <span className='dad-cs-group-l'>{statePanel.group.title}</span>
                    <span>{`${statePanel.group.current} / ${statePanel.group.total}`}</span>
                </div>
                <div className='dad-cs-subGroup'>
                    <span>{statePanel.subGroup.title}</span>
                    <span>{`${statePanel.subGroup.current} / ${statePanel.subGroup.total}`}</span>
                </div>
            </div>
        </div>
    )
}

export default Panel
