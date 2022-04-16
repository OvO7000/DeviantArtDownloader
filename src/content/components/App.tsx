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
    validate as _v,
    INVALID_DEVICE_NAMES
} from '../../common/js/utils'
import {getFolders, getDeviations} from '../../common/js/apis'
import MapLimit from '../../common/js/MapLimit'
import {panelReducer, PanelState} from "../reducers/panelReducer"
import {dataReducer, DataState, SimpleFolder} from "../reducers/dataReducer"

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

let folderMapLimit: MapLimit<SimpleFolder>
let deviationMapLimit: MapLimit<Deviation>

type Message = {
    type: 'download',
    data: {
        username: string,
        galleries: Folder[],
        favourites: Folder[]
    }
} | {
    type: 'cancel'
} | {
    type: 'stop'
} | {
    type: 'continue'
}

const Panel: FC = () => {
    const [stateData, dispatchData] = useReducer(dataReducer, initialDataState)
    const [statePanel, dispatchPanel] = useReducer(panelReducer, initialPanelState)


    // 监听 popup/background 事件
    const events = (message: Message, sender: MessageSender, sendResponse: any) => {
        // 抓取、下载作品
        if (message.type === 'download') {
            const {galleries, favourites, username} = message.data
            let subFolders: Folder[] = []
            galleries.forEach(gallery => {
                if (gallery.subfolders && gallery.subfolders.length) {
                    const subFolderWithParentName = gallery.subfolders.map(subFolder => ({
                        ...subFolder,
                        parentFolderName: gallery.name
                    }))
                    subFolders = subFolders.concat(subFolderWithParentName)
                }
            })
            const folders = galleries.concat(favourites, subFolders)
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
            mapLimit(folders, limit, async (item: Folder) => {

                // 设置 panel 的 current
                dispatchPanel({
                    type: 'setPanel',
                    data: {
                        current: item.name
                    }
                })

                // 获取单个 folder 下 deviation
                const res = await getDeviations(username, item.type, item.folderId!)

                dispatchData({
                    type: 'setDeviation',
                    data: {
                        folderName: item.name,
                        folderId: item.folderId!,
                        folderType: item.type,
                        isSubFolder: item.parentId !== null,
                        parentFolderName: item.parentFolderName ? item.parentFolderName : '',
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


            }).then(async ()=>{
                const {settings} = await chrome.storage.sync.get(['settings'])
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
            }).catch(err => {
                console.log(err)
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
        return true
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
            isSubFolder: boolean,
            parentFolderName: string,
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
            filename = filename || '/deviantArtDownloader/{user}/{folderType}/{folder}/{deviation}'
            if (deviation.isSubFolder) {
                filename = filename
                    .replaceAll('/{folder}/', '/{_parentFolderName}/{folder}/')
                    .replace(/^{folder}\//, '/{_parentFolderName}/{folder}/')
                    .replace(/\/{folder}$/, '/{_parentFolderName}/{folder}/')
            }
            const dirs = filename.split('/')
            let filenameIsValidate = true
            // 处理 / 开头的 filename
            if (dirs[0] === '') dirs.shift()
            for (let [index, dir] of dirs.entries()) {
                // 替换 {user} {folder} {folderType} {deviation} {publishDate} {downloadDate} {downloadBy}
                const folderWithSubFolderName = deviation.isSubFolder?`${deviation.folderName}_${deviation.parentFolderName}`:deviation.folderName
                let _dir = dir
                    .replaceAll('{user}', deviation.username)
                    .replaceAll('{folder}', deviation.folderName)
                    .replaceAll('{_parentFolderName}', deviation.parentFolderName)
                    .replaceAll('{folderWithSubFolderName}', folderWithSubFolderName)
                    .replaceAll('{folderType}', deviation.folderType)
                    .replaceAll('{deviation}', deviation.title)
                    .replaceAll('{publishDate}', deviation.publishedDate.slice(0, 10))
                    .replaceAll('{downloadDate}', date.format(new Date(), 'yyyy-mm-dd'))
                    .replaceAll('{downloadBy}', deviation.isDownloadable ? 'downloadByDownloadLink' : 'downloadByWebImage')

                // 验证 filename
                let dirIsValidate = true,
                    text = ''

                if (autoRenameIfHasError) {
                    // 替换非法字符
                    if (_v.filename.char(_dir)) {
                        const map: { [key: string]: string } = {
                            ':': '：',
                            '*': '＊',
                            '?': '？',
                            '"': '＂',
                            '<': '＜',
                            '>': '＞',
                            '|': '｜',
                        }
                        for (let char of Object.keys(map)) {
                            _dir = _dir.replace(char, map[char])
                        }
                    }
                    //替换非法设备名
                    if (_v.filename.deviceName(_dir)) {
                        for (let deviceName of INVALID_DEVICE_NAMES) {
                            _dir = _dir.replace(deviceName, `${deviceName}_`)
                        }
                    }
                    // 验证 dir 是否为空
                    if (_v.filename.isEmpty(_dir)) {
                        _dir = '_'
                    }
                    // 截取超长字符串
                    if (_v.filename.length(_dir)) {
                        _dir = _dir.substr(0, 240)
                    }
                }
                else {
                    // 验证 是否存在非法字符
                    if (_v.filename.char(_dir)) {
                        dirIsValidate = false
                        text = "folder or file name can't include \\/:*?\"<>|"
                    }
                    // 验证 是否存在非法设备名
                    else if (_v.filename.deviceName(_dir)) {
                        dirIsValidate = false
                        text = "folder or file name has invalid device name"
                    }
                    // 验证 dir 是否为空
                    else if (_v.filename.isEmpty(_dir)) {
                        dirIsValidate = false
                        text = "folder or file name can't be empty"
                    }
                    // 验证 是否超长
                    else if (_v.filename.length(_dir)) {
                        dirIsValidate = false
                        text = "folder or file name length exceed 250"
                    }
                }

                // 存在异常
                if (!dirIsValidate) {
                    errors.push({
                        artist: deviation.username,
                        type: deviation.folderType,
                        folder: deviation.folderName,
                        deviation: deviation.title,
                        error: `download failed: ${text}`
                    })
                    filenameIsValidate = false
                }
                dirs[index] = _dir
            }

            return [`${dirs.join('/')}.${fileType}`, filenameIsValidate]
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
                    total: stateData.deviations.length
                }
            }
        })

        // 下载 folders
        folderMapLimit = new MapLimit(stateData.deviations, 1)
        await folderMapLimit.execute(async (folder) => {
            const {deviations, folderName, folderType, isSubFolder, parentFolderName} = folder
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
                    const deviationInfo: DeviationInfo = {
                        username,
                        folderName,
                        folderType,
                        isSubFolder,
                        parentFolderName,
                        title: deviation.deviation.title,
                        publishedDate: deviation.deviation.publishedTime.slice(0, 10),
                        isDownloadable: deviation.deviation.isDownloadable
                    }
                    const [filename, filenameIsValidate] = getFilename(settings.filename, fileType, settings.autoRenameIfHasError, deviationInfo)
                    if (!filenameIsValidate) return
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
        const blob = new Blob([error_text], {type: "text/plain"})
        const url = window.URL.createObjectURL(blob)
        await _chrome.sendMessage({
            type: 'resultFile',
            url
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

                chrome.runtime.sendMessage({type: 'finished'})
                    // @ts-ignore
                    .catch(err => {
                        console.log(err)
                    })
                // @ts-ignore
                //     .catch(err=>{
                //         console.log('err', err)
                // })
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
