import React, {FC, useEffect, useReducer} from 'react'
import classnames from 'classnames'
import MessageSender = chrome.runtime.MessageSender
import { _chrome, getPageType, mapLimit, getDownloadLink, sendMessagePromise} from '../../common/js/utils'
import MapLimit from '../../common/js/MapLimit'
import {getFolders, getDeviations} from '../../common/js/apis'
import {date} from '../../common/js/utils'
import {panelReducer, PanelState} from "../reducers/panelReducer";
import {dataReducer, DataState} from "../reducers/dataReducer";

import Progress from './Progress'

const initialDataState: DataState = {
    username: '',
    // 选中的 folder
    folders: [],
    // 通过 api 获取的 deviations 列表
    deviations: [],
    settings: {
        downloadDownloadable: false,
        startTime: '',
        endTime: '',
        filename: '',
        conflictAction: 'uniquify'
    }
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
    },
}

let folderMapLimit:MapLimit
let deviationMapLimit:MapLimit

const Panel: FC = () => {
    const [stateData, dispatchData] = useReducer(dataReducer, initialDataState)
    const [statePanel, dispatchPanel] = useReducer(panelReducer, initialPanelState)


    // 监听 popup/background 事件
    const events = (message: any, sender: MessageSender, sendResponse: any) => {
        // 抓取、下载作品
        if (message.type === 'download') {
            const {galleries, favourites, username} = message.data
            const folders = galleries.concat(favourites)
            dispatchData({
                type: 'init',
                data: {
                    username,
                    folders
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
                const res = await getDeviations(username, item.type, item.folderId)

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
                chrome.storage.sync.get(['settings'], ({settings})=>{
                    dispatchData({
                        type: 'setSettings',
                        data: settings
                    })
                    dispatchPanel({
                        type: 'setDownload',
                        data: {
                            download: true
                        }
                    })
                })
            })
        }
        else if (message.type === 'cancel') {
            deviationMapLimit && deviationMapLimit.cancel()
            folderMapLimit && folderMapLimit.cancel()
        }
        else if (message.type === 'stop') {
            deviationMapLimit && deviationMapLimit.stop()
            folderMapLimit && folderMapLimit.stop()
        }
        else if (message.type === 'continue') {
            deviationMapLimit && deviationMapLimit.continue()
            folderMapLimit && folderMapLimit.continue()
        }
    }
    useEffect(() => {

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
        const { username, settings } = stateData
        console.log('settings', settings)
        folderMapLimit = new MapLimit(stateData.deviations, 1)
        await folderMapLimit.execute(async (folder) => {
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

            deviationMapLimit = new MapLimit(deviations, 3)
            await deviationMapLimit.execute(async (deviation) => {
                // 设置 current
                dispatchPanel({
                    type: 'setPanel',
                    data: {
                        current: deviation.deviation.title
                    }
                })
                // 没有下载按钮的 deviation 不下载
                if (settings.downloadDownloadable && !deviation.deviation.isDownloadable) return
                // 检查时间范围
                const startTime = new Date(settings.startTime)
                const endTime = new Date(settings.endTime)
                const publishedTime = new Date(deviation.deviation.publishedTime)

                const startTimeValid = date.isDateFormat(settings.startTime)
                const endTimeValid = date.isDateFormat(settings.endTime)
                if (startTimeValid && endTimeValid) {
                    if (publishedTime < startTime || publishedTime > endTime) return
                }
                else if (startTimeValid) {
                    if (publishedTime < startTime) return
                }
                else if (endTimeValid) {
                    if (publishedTime > startTime) return
                }
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
                    deviation,
                    settings
                })
                dispatchPanel({
                    type: 'addCurrent',
                    data: {
                        target: 'group',
                        progress: 'group'
                    }
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

        if (statePanel.download) {
            download().then(() => {
                dispatchData({
                    type: 'clear'
                })
                dispatchPanel({
                    type: 'setDownload',
                    data: {
                        download: false
                    }
                })
                // 通知 popup 下载完成
                _chrome.sendMessage({
                    type: 'finished'
                })
                chrome.storage.sync.set({
                    status: 'finished'
                })
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
