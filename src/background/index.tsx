import {date} from '../common/js/utils'
import DownloadOptions = chrome.downloads.DownloadOptions


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // console.log('background called')
    if (message.type === 'download')    {
        // console.log('download called')
        try {
            const {url, filename, conflictAction} = message
            const options: DownloadOptions = {
                url,
                filename,
                conflictAction
            }

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
        }).catch((err: any)=>{
            sendResponse({
                complete: false,
                error: 'download failed'
            })
        })
        return true
    }
})
