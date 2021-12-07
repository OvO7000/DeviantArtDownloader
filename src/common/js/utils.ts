import {Deviation, getHTML} from './apis'

type PageType = 'user' | undefined

interface PageInfo {
    username?: string
}

type Page = {
    pageType: PageType;
    pageInfo: PageInfo
}

export const getPageType = (url: string): Page => {
    let pageType: PageType
    let pageInfo: PageInfo = {}
    // todo: 通过url正则判断页面类型
    const u = new URL(url)
    // user
    if (u.host === 'www.deviantart.com') {
        pageType = 'user'
        pageInfo.username = u.pathname.split('/')[1]
    }

    return {
        pageType,
        pageInfo
    }
}

export const mapLimit = (list: any[], limit: number, asyncHandle: (...rest: any[]) => Promise<any>) => {
    let recursion = (arr: any[]): Promise<any> => {
        return asyncHandle(arr.shift())
            .then(() => {
                if (arr.length !== 0) return recursion(arr)   // 数组还未迭代完，递归继续进行迭代
                else return 'finish';
            })
    };

    let listCopy = ([] as any[]).concat(list);
    let asyncList = []; // 正在进行的所有并发异步操作
    let _limit = list.length < limit ? list.length : limit
    while (_limit--) {
        asyncList.push(recursion(listCopy));
    }
    return Promise.all(asyncList);  // 所有并发异步操作都完成后，本次并发控制迭代完成
}

export const getDownloadLink = async (item: Deviation) => {
    const {isDownloadable, url} = item.deviation
    const doc = await getHTML(url)

    if (isDownloadable) {
        const selector = 'a[data-hook="download_button"]'
        const link = doc.querySelector(selector) as HTMLAnchorElement
        if (!link) return
        return link.href
    }
    else {
        const selector = 'link[href^="https://images-wixmp-"][rel="preload"]'
        const link = doc.querySelector(selector) as HTMLLinkElement
        if (!link) return
        return link.href
    }
}

export const getDownloadFileType = (link: string) => {
    const url = new URL(link)
    const {pathname} = url
    return pathname.split('.').pop()
}

interface SendMessageItem {
    [propName: string]: any;
}

export const sendMessagePromise = (item: SendMessageItem): Promise<void> => {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(chrome.runtime.id, item, response => {
            if (response.complete) {
                resolve()
            }
            else {
                reject('download failed');
            }
        });
    });
}

export const checkFilename = (name: string) => {
    const deviceName = [
        'CON',
        'PRN',
        'AUX',
        'NUL',
        'COM1',
        'COM2',
        'COM3',
        'COM4',
        'COM5',
        'COM6',
        'COM7',
        'COM8',
        'COM9',
        'LPT1',
        'LPT2',
        'LPT3',
        'LPT4',
        'LPT5',
        'LPT6',
        'LPT7',
        'LPT8',
        'LPT9']
    let _name = name.trim().replace(/[\\/:*?"<>|]/g, ' ')
    if (deviceName.includes(_name)) _name = 'auto renamed by deviant art downloader extension'
    return _name.slice(0, 250)
}
