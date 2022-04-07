import React, {FC, useEffect, useReducer} from 'react'
import classnames from 'classnames'
import MessageSender = chrome.runtime.MessageSender
import {
    _chrome,
    getPageType,
    mapLimit,
    getDownloadLink,
    date,
    getDownloadFileType,
    validate as _v
} from '../../common/js/utils'
import {getFolders, getDeviations} from '../../common/js/apis'
import MapLimit from '../../common/js/MapLimit'
import {panelReducer, PanelState} from "../reducers/panelReducer";
import {dataReducer, DataState} from "../reducers/dataReducer";

import Progress from './Progress'
import {ConflictAction} from "../../popup/reducers/settingsReducer";
import {Folder, Deviation} from "../../common/js/apis";

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
        conflictAction: 'uniquify',
        autoRenameIfHasError: false
    }
}
const initialPanelState: PanelState = {
    show: false,
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

let folderMapLimit: MapLimit
let deviationMapLimit: MapLimit

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
            dispatchPanel({
                type: 'setShow',
                data: {
                    show: true
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
                const type = item.type === 'gallery' ? 'group' : 'subGroup'
                dispatchPanel({
                    type: 'addCurrent',
                    data: {
                        target: type,
                        progress: type
                    }
                })

            }).then((res) => {
                chrome.storage.sync.get(['settings'], ({settings}) => {
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
            dispatchPanel({
                type: 'setShow',
                data: {
                    show: false
                }
            })
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
        interface IError {
            artist: string,
            type: string,
            folder: string,
            deviation: string,
            error: string
        }

        interface DeviationInfo {
            username: string,
            folderName: string,
            folderType: string,
            title: string,
            publishedDate: string,
            isDownloadable: boolean
        }

        const errors: IError[] = []
        const {username, settings} = stateData
        const validateTimeRange = (startTime: string, endTime: string, publishedTime: string) => {
            const _startTime = new Date(startTime)
            const _endTime = new Date(endTime)
            const _publishedTime = new Date(publishedTime)

            const startTimeValid = date.isDateFormat(startTime)
            const endTimeValid = date.isDateFormat(endTime)
            if (startTimeValid && endTimeValid) {
                if (_publishedTime < _startTime || _publishedTime > _endTime) return false
            }
            else if (startTimeValid) {
                if (_publishedTime < _startTime) return false
            }
            else if (endTimeValid) {
                if (_publishedTime > _startTime) return false
            }
            return true
        }
        const getFilename = (filename: string, fileType: string, autoRenameIfHasError: boolean, deviation: DeviationInfo) => {
            filename = filename || '/deviantArtDownloader/{user}/{folder}/{deviation}'
            const dirs = filename.split('/')
            // 处理 / 开头的 filename
            if (dirs[0] === '') dirs.shift()
            for (let [index, dir] of dirs.entries()) {
                // 替换 {user} {folder} {folderType} {deviation} {publishDate} {downloadDate} {downloadBy}
                let _dir = dir
                    .replace('{user}', deviation.username)
                    .replace('{folder}', deviation.folderName)
                    .replace('{folderType}', deviation.folderType)
                    .replace('{deviation}', deviation.title)
                    .replace('{publishDate}', deviation.publishedDate.slice(0, 10))
                    .replace('{downloadDate}', date.format(new Date(), 'yyyy-mm-dd'))
                    .replace('{downloadBy}', deviation.isDownloadable ? 'downloadByDownloadLink' : 'downloadByWebImage')

                // 验证 filename
                let isValidate = true,
                    text = ''


                // 验证 是否存在非法字符
                if (_v.filename.char(dir)) {
                    if (autoRenameIfHasError) {
                        _dir.replace(/[\\/:*?"<>|]/g, ' ')
                    }
                    else {
                        isValidate = false
                        text = "folder or file name can't include \\/:*?\"<>|"
                    }
                }
                // 验证 是否存在非法设备名
                else if (_v.filename.deviceName(dir)) {
                    if (autoRenameIfHasError) {
                        _dir = '_'
                    }
                    else {
                        isValidate = false
                        text = "folder or file name has invalid device name"
                    }

                }

                // 验证 dir 是否为空
                if (_v.filename.isEmpty(dir)) {
                    isValidate = false
                    text = "folder or file name can't be empty"
                }
                // 验证 是否超长
                if (_v.filename.length(dir)) {
                    isValidate = false
                    text = "folder or file name length exceed 250"
                }
                // 存在异常
                if (!isValidate) {
                    errors.push({
                        artist: deviation.username,
                        type: deviation.folderType,
                        folder: deviation.folderName,
                        deviation: deviation.title,
                        error: `download failed: ${text}`
                    })
                }

                dirs[index] = _dir
            }

            return `${dirs.join('/')}.${fileType}`
        }

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
        folderMapLimit = new MapLimit(stateData.deviations, 1)
        await folderMapLimit.execute(async (folder: Folder) => {
            const {deviations, name:folderName, folderId, folderType} = folder
            // 设置 group
            dispatchPanel({
                type: 'setPanel',
                data: {
                    group: {
                        title: folderName,
                        total: deviations.length
                    }
                }
            })

            deviationMapLimit = new MapLimit(deviations, 3)
            await deviationMapLimit.execute(async (deviation: Deviation) => {
                // 设置 current
                dispatchPanel({
                    type: 'setPanel',
                    data: {
                        current: deviation.deviation.title
                    }
                })

                try {
                    // 没有下载按钮的 deviation 不下载
                    if (settings.downloadDownloadable && !deviation.deviation.isDownloadable) return
                    // 检查时间范围
                    if (!validateTimeRange(settings.startTime, settings.endTime, deviation.deviation.publishedTime)) return

                    // 获取下载链接
                    const link = await getDownloadLink(deviation)
                    const fileType = getDownloadFileType(link!) as string

                    // 生成 filename
                    // todo
                    const deviationInfo: DeviationInfo = {
                        username,
                        folderName,
                        folderType,
                        title: deviation.deviation.title,
                        publishedDate: deviation.deviation.publishedTime.slice(0, 10),
                        isDownloadable: deviation.deviation.isDownloadable
                    }
                    const filename = getFilename(settings.filename, fileType, settings.autoRenameIfHasError, deviationInfo)

                    await _chrome.sendMessageP({
                        type: 'download',
                        url: link,
                        filename,
                        conflictAction: settings.conflictAction
                    }).catch((err) => {
                        errors.push({
                            artist: username,
                            type: folderType,
                            folder: folderName,
                            deviation: deviation.deviation.title,
                            error: err
                        })
                    })
                } catch (e: any) {
                    errors.push({
                        artist: username,
                        type: folderType,
                        folder: folderName,
                        deviation: deviation.deviation.title,
                        error: e.message
                    })
                }

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

        // 下载结果文件
        let error_text: string = errors.map((err) => {
            const {artist, type, folder, deviation, error} = err
            return `${artist}/${type}/${folder}/${deviation}\n${error}`
        }).join('\n\n')
        await _chrome.sendMessageP({
            type: 'resultFile',
            text: error_text
        })

    }
    useEffect(() => {

        if (statePanel.download) {
            download().then(() => {
                dispatchPanel({
                    type: 'setShow',
                    data: {
                        show: false
                    }
                })
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
        <>
            {
                statePanel.show && (
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
        </>
    )
}

export default Panel
