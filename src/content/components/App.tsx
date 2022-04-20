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
    validateFilename as validateFilenameUtil,
    INVALID_DEVICE_NAMES
} from '../../common/js/utils'
import {getFolders, getDeviations} from '../../common/js/apis'
import MapLimit from '../../common/js/MapLimit'
import RequestLimit from '../../common/js/RequestLimit'
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
let deviationRequestLimit: RequestLimit<Deviation>

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
    const events = async (message: Message, sender: MessageSender, sendResponse: any) => {
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
                if (_publishedTime > _endTime) return false
            }
            return true
        }

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
            folders.forEach(folder => {
                folder.folderType = folder.type === 'gallery' ? 'gallery' : 'favourite'
            })
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
                        current: 0,
                        total: galleries.length
                    },
                    subGroup: {
                        title: 'Favourites',
                        current: 0,
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

            const {settings} = await chrome.storage.sync.get(['settings'])
            dispatchData({
                type: 'setSettings',
                data: settings
            })
            // 抓取作品列表
            const limit = 3
            await mapLimit(folders, limit, async (item: Folder) => {

                // 设置 panel 的 current
                dispatchPanel({
                    type: 'setPanel',
                    data: {
                        current: item.name
                    }
                })

                // 获取单个 folder 下 deviation
                const deviations = await getDeviations(username, item.type, item.folderId!)
                const filteredDeviations = deviations.filter(deviation=>{
                    // 检查时间范围
                    return validateTimeRange(settings.startTime, settings.endTime, deviation.deviation.publishedTime)
                })
                dispatchData({
                    type: 'setDeviation',
                    data: {
                        folderName: item.name,
                        folderId: item.folderId!,
                        folderType: item.type,
                        isSubFolder: item.parentId !== null,
                        parentFolderName: item.parentFolderName ? item.parentFolderName : '',
                        deviations: filteredDeviations
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


            })
            dispatchPanel({
                type: 'setDownload',
                data: {
                    download: true
                }
            })
        }
        else if (message.type === 'cancel') {
            deviationRequestLimit && deviationRequestLimit.cancel()
            folderMapLimit && folderMapLimit.cancel()
            dispatchPanel({
                type: 'setShow',
                data: {
                    show: false
                }
            })
        }
        else if (message.type === 'stop') {
            deviationRequestLimit && deviationRequestLimit.stop()
            folderMapLimit && folderMapLimit.stop()
        }
        else if (message.type === 'continue') {
            deviationRequestLimit && deviationRequestLimit.continue()
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
            username: string
            author: string,
            folderType: string,
            folderName: string,
            deviation: string,
            deviationId: number,
            error: string
        }

        interface DeviationInfo {
            username: string,
            author: string
            folderName: string,
            folderType: string,
            isSubFolder: boolean,
            parentFolderName: string,
            title: string,
            deviationId: number,
            publishedDate: string,
            isDownloadable: boolean,
        }

        const errors: IError[] = []
        const {username, settings} = stateData
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
                // 替换 {user} 等变量
                const folderWithSubFolderName = deviation.isSubFolder ? `${deviation.parentFolderName}_${deviation.folderName}` : deviation.folderName
                let _dir = dir
                    .replaceAll('{user}', deviation.username)
                    .replaceAll('{deviationId}', deviation.deviationId.toString())
                    .replaceAll('{author}', deviation.author)
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
                    if (validateFilenameUtil.hasInvalidChar(_dir)) {
                        const map: { [key: string]: string } = {
                            ':': '：',
                            '*': '＊',
                            '?': '？',
                            '"': '＂',
                            '<': '＜',
                            '>': '＞',
                            '|': '｜',
                            '/': '／'
                        }
                        for (let char of Object.keys(map)) {
                            _dir = _dir.replaceAll(char, map[char])
                        }
                    }
                    //替换非法设备名
                    if (validateFilenameUtil.isInvalidDeviceName(_dir)) {
                        _dir = `${_dir}_`
                    }
                    // 验证 dir 是否为空
                    if (validateFilenameUtil.isEmpty(_dir)) {
                        _dir = '_'
                    }
                    // 截取超长字符串
                    if (validateFilenameUtil.exceedsMaxlength(_dir)) {
                        _dir = _dir.substr(0, 240)
                    }
                    // 去除文件夹末尾 .
                    if (validateFilenameUtil.endsWithDecimalPoint(_dir) && index !== dirs.length - 1) {
                        _dir = _dir.substr(0, _dir.length - 1)
                    }
                }
                else {
                    // 验证 是否存在非法字符
                    if (validateFilenameUtil.hasInvalidChar(_dir)) {
                        dirIsValidate = false
                        text = "folder or file name can't include \\/:*?\"<>|"
                    }
                    // 验证 是否存在非法设备名
                    else if (validateFilenameUtil.isInvalidDeviceName(_dir)) {
                        dirIsValidate = false
                        text = "folder or file name has invalid device name"
                    }
                    // 验证 dir 是否为空
                    else if (validateFilenameUtil.isEmpty(_dir)) {
                        dirIsValidate = false
                        text = "folder or file name can't be empty"
                    }
                    // 验证 是否超长
                    else if (validateFilenameUtil.exceedsMaxlength(_dir)) {
                        dirIsValidate = false
                        text = "folder or file name length exceed 250"
                    }
                    // 验证 文件夹末尾是否是 .
                    else if (validateFilenameUtil.endsWithDecimalPoint(_dir) && index !== dirs.length - 1) {
                        dirIsValidate = false
                        text = "folder name can't ends with ."
                    }
                }

                // 存在异常
                if (!dirIsValidate) {
                    errors.push({
                        username: deviation.username,
                        author: deviation.author,
                        folderType: deviation.folderType,
                        folderName: deviation.folderName,
                        deviation: deviation.title,
                        deviationId: deviation.deviationId,
                        error: `download failed: ${text}`
                    })
                    filenameIsValidate = false
                }
                dirs[index] = _dir.trim()
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

            const time = deviations.length > 100 ? 2000 : 500
            deviationRequestLimit = new RequestLimit(deviations, time)
            await deviationRequestLimit.execute(async (deviation: Deviation) => {
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

                    // 获取下载链接
                    const link = await getDownloadLink(deviation)
                    const fileType = getDownloadFileType(link!) as string

                    // 生成 filename
                    const deviationInfo: DeviationInfo = {
                        username,
                        author: deviation.deviation.author.username,
                        folderName,
                        folderType,
                        isSubFolder,
                        parentFolderName,
                        deviationId: deviation.deviation.deviationId,
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
                    }).catch((error) => {
                        errors.push({
                            username,
                            author: deviation.deviation.author.username,
                            folderType,
                            folderName,
                            deviation: deviation.deviation.title,
                            deviationId: deviation.deviation.deviationId,
                            error
                        })
                    })
                } catch (error: any) {
                    errors.push({
                        username,
                        author: deviation.deviation.author.username,
                        folderType,
                        folderName,
                        deviation: deviation.deviation.title,
                        deviationId: deviation.deviation.deviationId,
                        error
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
        let error_text: string = errors.map((err, index) => {
            const {username, author, folderType, folderName, deviation, deviationId, error} = err
            return `${index}. username: ${username}
author: ${author}
folderType: ${folderType}
folderName: ${folderName}
deviation: ${deviation}
deviationId: ${deviationId}
error: ${error}
---------------------------------------
`
        }).join('')
        const blob = new Blob([error_text], {type: "text/plain"})
        const url = window.URL.createObjectURL(blob)
        console.log('errors', errors)
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
