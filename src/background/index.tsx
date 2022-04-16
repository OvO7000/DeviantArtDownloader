import {_chrome, getDownloadFileType, date, validate as _v} from '../common/js/utils'
import DownloadOptions = chrome.downloads.DownloadOptions
import {ConflictAction} from '../popup/reducers/settingsReducer'

// const download = (options: chrome.downloads.DownloadOptions, cb: Function, times: number = 0) => {
//     // 下载次数 = 重试次数 + 1
//     let _times: number = times + 1
//     const _download = () => {
//         chrome.downloads.download(options, (downloadId: number | undefined) => {
//             _times--
//             if (downloadId === undefined && _times > 0) {
//                 _download()
//             }
//             else {
//                 cb(downloadId)
//             }
//         })
//     }
//     _download()
// }
const promiseRetry = function (promiseFn: Function, times = 1) {
    const fun = () => {
        return new Promise((resolve, reject) => {
            times--
            promiseFn().then((data: any) => {
                resolve(data)
            }).catch((err: any) => {
                if (!times) {
                    reject(err)
                }
                else {
                    resolve(fun())
                }
            })
        })
    }
    return fun()
}
const download = (options: chrome.downloads.DownloadOptions) => {
    return () => {
        return new Promise((resolve, reject) => {
            chrome.downloads.download(options, (downloadId: number | undefined) => {
                downloadId === undefined ? reject('download failed') : resolve(downloadId)
            })
        })
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'download') {
        try {
            const {url, filename, conflictAction} = message

            const options: DownloadOptions = {
                url,
                filename,
                conflictAction
            }

            // promiseRetry(download(options)).then((value) => {
            //     console.log(value)
            //     sendResponse({complete: true})
            // }).catch((err) => {
            //     sendResponse({
            //         complete: false,
            //         error: 'download failed: error occurred when downloading the file via browser'
            //     })
            // })

            // @ts-ignore
            chrome.downloads.download(options).then((value) => {
                sendResponse({complete: true})
            }).catch((err: any) => {
                sendResponse({
                    complete: false,
                    error: 'download failed: error occurred when downloading the file via browser'
                })
            })
        } catch (e) {
            sendResponse({
                complete: false,
                error: 'download failed'
            })
        }

        return true
    }
    else if (message.type === 'resultFile') {
        const {url} = message
        const dateStr = date.format(new Date(), 'yyyy-MM-dd')
        const options = {
            url,
            filename: `download result ${dateStr}.txt`,
            conflictAction: 'uniquify'
        }
        // @ts-ignore
        chrome.downloads.download(options).then(() => {
            sendResponse({complete: true})
        }).catch(()=>{
            sendResponse({
                complete: false,
                error: 'download failed'
            })
        })
        return true
    }
})
