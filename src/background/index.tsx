import {_chrome, getDownloadFileType, date, validate as _v} from '../common/js/utils'
import DownloadOptions = chrome.downloads.DownloadOptions
import {ConflictAction} from '../popup/reducers/settingsReducer'

interface Data {
    settings: {
        downloadDownloadable: boolean
    }
}

const validate = (dir: string) => {
    const result = {
        isValidate: true,
        text: ''
    }
    // 验证 dir 是否为空
    if (_v.filename.isEmpty(dir)) {
        result.isValidate = false
        result.text = "folder or file name can't be empty"
    }
    // 验证 是否超长
    if (_v.filename.length(dir)) {
        result.isValidate = false
        result.text = "folder or file name length exceed 250"
    }
    // 验证 是否存在非法设备名
    else if (_v.filename.deviceName(dir)) {
        result.isValidate = false
        result.text = "folder or file name has invalid device name"
    }
    // 验证 是否存在非法字符
    else if (_v.filename.char(dir)) {
        result.isValidate = false
        result.text = "folder or file can include \\/:*?\"<>|"
    }
    return result
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
        chrome.declarativeContent.onPageChanged.addRules([{
            conditions: [new chrome.declarativeContent.PageStateMatcher({pageUrl: {hostEquals: 'www.deviantart.com'}})],
            actions: [new chrome.declarativeContent.ShowPageAction()]
        }])
    })

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'download') {
            const {username, deviation, folder, link, settings} = message
            const fileType = getDownloadFileType(link) as string

            // 检查 conflictAction
            let conflictAction: ConflictAction
            if (settings.conflictAction === 'overwrite') conflictAction = 'overwrite'
            else conflictAction = 'uniquify'

            // 生成 filename
            const filename = settings.filename || '/deviantArtDownloader/{user}/{folder}/{deviation}'
            const dirs = filename.split('/')
            // 处理 / 开头的 filename
            if (dirs[0] === '') dirs.shift()
            for (let [index, dir] of dirs.entries()) {
                // 替换 {user} {folder} {folderType} {deviation} {publishDate} {downloadDate} {downloadBy}
                let _dir = dir
                    .replace('{user}', username)
                    .replace('{folder}', folder.name)
                    .replace('{folderType}', folder.type)
                    .replace('{deviation}', deviation.deviation.title)
                    .replace('{publishDate}', deviation.deviation?.publishedTime.slice(0, 10))
                    .replace('{downloadDate}', date.format(new Date(), 'yyyy-mm-dd'))
                    .replace('{downloadBy}', deviation.deviation.isDownloadable ? 'downloadByDownloadLink' : 'downloadByWebImage')

                // 验证 filename
                const {isValidate, text} = validate(_dir)
                console.log('isValidate', isValidate, text)
                // todo: 通知 content 存在异常
                if (!isValidate) {
                    sendResponse({complete: true})
                    return
                }
                dirs[index] = _dir
            }

            const _filename = `${dirs.join('/')}.${fileType}`
            console.log('filename', _filename)
            const options: DownloadOptions = {
                url: link,
                filename: _filename,
                conflictAction
            }
            chrome.downloads.download(options, (res) => {
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
