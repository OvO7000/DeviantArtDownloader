import {date} from '../common/js/utils'
import DownloadOptions = chrome.downloads.DownloadOptions


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('download called')
    if (message.type === 'download')    {
        try {
            const {url, filename, conflictAction} = message
            const options: DownloadOptions = {
                url,
                filename,
                conflictAction
            }
            console.log(url)
            console.log(filename)
            console.log(conflictAction)

            // @ts-ignore
            chrome.downloads.download(options).then((value) => {
                console.log('download value', value)
                sendResponse({complete: true})
            }).catch((err: any) => {
                console.log('download failed', err)
                sendResponse({
                    complete: false,
                    error: 'download failed: error occurred when downloading the file via browser'
                })
            })
        } catch (e) {
            console.log('download failed2',e)
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
            console.log('resultFile err', err)
            sendResponse({
                complete: false,
                error: 'download failed'
            })
        })
        return true
    }
})
