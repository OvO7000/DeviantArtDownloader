import {getDownloadFileType, checkFilename} from '../common/js/utils'
import DownloadOptions = chrome.downloads.DownloadOptions

console.log('bg called')
chrome.runtime.onInstalled.addListener(() => {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
        chrome.declarativeContent.onPageChanged.addRules([{
            conditions: [new chrome.declarativeContent.PageStateMatcher({pageUrl: {hostEquals: 'www.deviantart.com'}})],
            actions: [new chrome.declarativeContent.ShowPageAction()]
        }])
    })
    console.log('bg called2')
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('bg download called')
        if (message.type === 'download') {
            const {username, deviation, folder, link} = message
            const fileType = getDownloadFileType(link) as string
            const cf = checkFilename
            const fileName = `deviantArtDownloader/${cf(username)}/${cf(folder.name)}/${cf(deviation.deviation.title)}.${cf(fileType)}`
            console.log(fileName)
            const options:DownloadOptions = {
                url: link,
                filename: fileName,
                conflictAction: 'uniquify'
            }
            chrome.downloads.download(options, (res) => {
                console.log('bg download finished')
                sendResponse({complete: true})
            })
            return true
        }
    })
    // isDownloadable false
    // const notDownloadable = 'https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/61a5bf18-09b0-4cb9-9cd0-7a791870f17e/detk64o-9a467877-7f9a-4ac2-9d2f-4a10ae0e559e.jpg?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7InBhdGgiOiJcL2ZcLzYxYTViZjE4LTA5YjAtNGNiOS05Y2QwLTdhNzkxODcwZjE3ZVwvZGV0azY0by05YTQ2Nzg3Ny03ZjlhLTRhYzItOWQyZi00YTEwYWUwZTU1OWUuanBnIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmZpbGUuZG93bmxvYWQiXX0.r3ERUeSrYMZ8PuSE26jzxmRIwohPnA0FuwP_hPheSkY'
    // isDownloadable true
    // const downloadable = 'https://www.deviantart.com/download/896176392/detk64o-9a467877-7f9a-4ac2-9d2f-4a10ae0e559e.jpg?token=ccfe968366b763288266c1d4d1be4ab579204fff&ts=1635434184'
})

export {}
