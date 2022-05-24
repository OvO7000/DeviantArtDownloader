import {Deviation, getHTML} from './apis'
import {LiteratureDownloadType} from "../../popup/reducers/settingsReducer"
// let DownloadOptions = chrome.downloads.DownloadOptions

interface PageInfo {
    username?: string
}

type Page = {
    pageType: string,
    pageInfo: PageInfo
}

export const INVALID_DEVICE_NAMES: string[] = [
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

export const GITHUB_URL: string = 'https://github.com/OvO7000/DeviantArtDownloader'

export const getPageType = (url: string): Page => {
    let pageType: string = 'unknown'
    let pageInfo: PageInfo = {}
    // 通过 url 判断页面类型
    const u = new URL(url)
    if (u.host === 'www.deviantart.com') {
        if (u.pathname === '/') pageType = 'home'
        else if (u.pathname.startsWith('/watch/')) pageType = 'watch'
        else if (u.pathname.startsWith('/daily-deviations/')) pageType = 'daily-deviations'
        else if (u.pathname.startsWith('/topic/')) pageType = 'topic'
        else if (u.pathname.startsWith('/popular/')) pageType = 'popular'
        else if (u.pathname.startsWith('/grouphub/')) pageType = 'grouphub'
        else if (u.pathname.startsWith('/groups/')) pageType = 'groups'
        else if (u.pathname.startsWith('/chat/')) pageType = 'chat'
        else if (u.pathname.startsWith('/shop/')) pageType = 'shop'
        else if (u.pathname.startsWith('/forum/')) pageType = 'forum'
        else if (u.pathname.startsWith('/muro/')) pageType = 'muro'
        else if (u.pathname.startsWith('/posts/')) pageType = 'posts'
        else {
            pageType = 'user'
            pageInfo.username = u.pathname.split('/')[1]
        }
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

export const checkPage = async (doc: HTMLElement, selector: string, time: number = 1) => {
    const stopper = (time: number = 1000): Promise<void> => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve()
            }, time)
        })
    }

    while (time > 0) {
        if (doc.querySelector(selector)) return true
        time--
        await stopper()
    }
    return false
}

export const decodeString = (str: string) => {
    return str.replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\&/g, "&")
        .replace(/\\\\/g, "\\")
}

interface InitialState {
    '@@entities': {
        deviation: {
            [propNames: number]: {
                textContent: {
                    html: {
                        markup: string
                    }
                }
            }
        }
        deviationExtended: {
            [propNames: number]: {
                download: {
                    url: string
                },
                descriptionText: {
                    html: {
                        markup: string
                    }
                }
            }
        }
    },
    '@@config': {
        csrfToken: string
    }
}

export const getInitialState = (doc: HTMLElement): InitialState => {
    const scripts = Array.from(doc.querySelectorAll('script'))
    let targetScript = scripts[scripts.length - 2].innerText
    let index1 = targetScript.indexOf('window.__INITIAL_STATE__')
    let index2 = targetScript.indexOf('window.__URL_CONFIG__')
    targetScript = targetScript.slice(index1, index2)

    index1 = targetScript.indexOf('"')
    index2 = targetScript.lastIndexOf('"')
    targetScript = targetScript.slice(index1 + 1, index2)

    return JSON.parse(decodeString(targetScript))
}

export const getCsrfToken = (doc: HTMLElement): string => {
    const json = getInitialState(doc)
    return json['@@config'].csrfToken
}

// export const getLiterature =  async (item: Deviation): Promise<string> => {
//     const {url, deviationId} = item.deviation
//
//     const getLiteratureFromScript = (doc: HTMLElement, deviationId: number):[string, string]=>{
//         const json = getInitialState(doc)
//         console.log('state', json)
//         const text = json['@@entities'].deviation[deviationId].textContent.html.markup
//         const descriptionText = json['@@entities'].deviationExtended[deviationId].descriptionText.html.markup
//         return [text, descriptionText]
//     }
//     const doc = await getHTML(url)
//     const [text, descriptionText] = getLiteratureFromScript(doc, deviationId)
//
//     return `${text}\n${descriptionText}`
// }

export const getLiterature = async (item: Deviation, fileType: LiteratureDownloadType = 'txt'): Promise<string> => {
    const {url, legacyTextEditUrl} = item.deviation
    const isLegacy = !(legacyTextEditUrl === null)
    const isTxt = fileType === 'txt'
    const doc = await getHTML(url)

    function getNodes(doc: HTMLElement, isLegacy: boolean) {
        let textContentNodes
        let descriptionNodes
        if (isLegacy) {
            textContentNodes = doc.querySelector('.legacy-journal')!.childNodes
            descriptionNodes = doc.querySelector('main > div > div > div > div.legacy-journal')!.childNodes
        }
        else {
            textContentNodes = doc.querySelector('.da-editor-journal>div>div>div')!.childNodes
            descriptionNodes = doc.querySelector('main > div > div > div > div.legacy-journal')!.childNodes
        }

        return [textContentNodes, descriptionNodes]
    }

    function getText(nodes: NodeListOf<ChildNode>, isTxt: boolean) {
        let result: string = ''
        for (let node of nodes) {
            const {nodeType, nodeName, nodeValue} = node as HTMLElement
            // 文本节点
            if (nodeType === 3) {
                result += nodeValue!.trim()
            }
            else if (nodeType === 1 && nodeName === 'UL') {
                for (let li of node.childNodes) {
                    result += `* ${getText(li.childNodes, isTxt)}`
                }
            }
            else if (nodeType === 1 && nodeName === 'OL') {
                for (let i = 0; i < node.childNodes.length; i++) {
                    result += `${i + 1}. ${getText(node.childNodes[i].childNodes, isTxt)}`
                }
            }
            else if (nodeType === 1 && nodeName === 'H2') {
                const childText = getText(node.childNodes, isTxt)
                if (childText === '') result += '  \n'
                else result += isTxt ? `${childText}\n` : `## ${childText}  \n`
            }
            else if (nodeType === 1 && nodeName === 'P') {
                const childText = getText(node.childNodes, isTxt)
                result += isTxt ? `${childText}\n` : `${childText}  \n`
            }
            else if (nodeType === 1 && nodeName === 'LI') {
                const childText = getText(node.childNodes, isTxt)
                result += isTxt ? `${childText}\n` : `${childText}  \n`
            }
            else if (nodeType === 1 && nodeName === 'EM') {
                const childText = getText(node.childNodes, isTxt)
                result += isTxt ? childText : `*${childText}*`
            }
            else if (nodeType === 1 && nodeName === 'A') {
                const childText = getText(node.childNodes, isTxt)
                const head = result.endsWith('!')?' ':''
                const tail = (node as HTMLElement).querySelector('img')?'  \n':''
                result += isTxt ? childText : `${head}[${childText}](${(node as HTMLAnchorElement).href})${tail}`
            }
            else if (nodeType === 1 && nodeName === 'SPAN') {
                const childText = getText(node.childNodes, isTxt)
                result += childText
            }
            else if (nodeType === 1 && nodeName === 'STRONG') {
                const childText = getText(node.childNodes, isTxt)
                result += isTxt ? childText : `**${childText}**`
            }
            else if (nodeType === 1 && nodeName === 'U') {
                const childText = getText(node.childNodes, isTxt)
                result += isTxt ? childText : `<u>${childText}</u>`
            }
            else if (nodeType === 1 && nodeName === 'BLOCKQUOTE') {
                const childText = getText(node.childNodes, isTxt)
                result += isTxt ? `${childText}\n` : `> ${childText}  \n  \n`
            }
            else if (nodeType === 1 && nodeName === 'IMG') {
                result += isTxt ? '' : `![${getText(node.childNodes, isTxt)}](${(node as HTMLImageElement).src})`
            }
            else if (nodeType === 1 && nodeName === 'DIV') {
                result += isTxt ? '' : getText(node.childNodes, isTxt)
            }
            else if (nodeType === 1 && nodeName === 'svg') {
                result += isTxt ? '\n' : '\n---  \n'
            }

        }
        return result
    }

    function getLegacyText(nodes: NodeListOf<ChildNode>, isTxt: boolean) {
        let result: string = ''
        for (let node of nodes) {
            const {nodeType, nodeName, nodeValue, innerText} = node as HTMLElement
            // 文本节点
            if (nodeType === 3) {
                result += nodeValue!.trim()
            }
            else if (nodeType === 1 && nodeName === 'B') {
                result += isTxt ? innerText : `**${innerText}**`
            }
            else if (nodeType === 1 && nodeName === 'I') {
                result += isTxt ? innerText : `*${innerText}*`
            }
            else if (nodeType === 1 && nodeName === 'A') {
                const childText = getLegacyText(node.childNodes, isTxt)
                result += isTxt ? innerText : `${result.endsWith('!')?' ':''}[${childText}](${(node as HTMLAnchorElement).href})`
            }
            else if (nodeType === 1 && nodeName === 'IMG') {
                result += isTxt ? '' : `![${(node as HTMLImageElement).alt}](${(node as HTMLImageElement).src})`
            }
            else if (nodeType === 1 && nodeName === 'BR') {
                result += isTxt ? '\n' : '  \n'
            }
            else if (nodeType === 1 && nodeName === 'DIV') {
                const childText = getLegacyText(node.childNodes, isTxt)
                result += isTxt ? `${childText}\n`: `${childText}  \n`
            }
        }
        return result
    }

    const [textContentNodes, descriptionNodes] = getNodes(doc, isLegacy)
    let result: string = ''
    if (isLegacy) {
        result = getLegacyText(textContentNodes, isTxt) + getLegacyText(descriptionNodes, isTxt)
    }
    else {
        result = getText(textContentNodes, isTxt) + getLegacyText(descriptionNodes, isTxt)
    }

    return result
}


export const getDownloadLink = async (item: Deviation): Promise<string> => {
    const {isDownloadable, url, deviationId} = item.deviation
    /**
     * 通过页面的 __INITIAL_STATE__ 获得下载链接
     * @param doc
     */
    const getLinkFromScript = (doc: HTMLElement): string => {
        const json = getInitialState(doc)
        return json['@@entities'].deviationExtended[deviationId].download.url
    }
    // console.log('getDownloadLink called')

    const doc = await getHTML(url)
    try {
        if (isDownloadable) {
            const selector = 'a[data-hook="download_button"]'
            let link = doc.querySelector(selector) as HTMLAnchorElement
            // 可能同时存在付费、免费下载
            if (!link) return getLinkFromScript(doc)
            // 直接下载
            return link.href
        }
        else {
            // const selector = 'link[href^="https://images-wixmp-"][rel="preload"]'
            const selector = item.deviation.isVideo ? 'video[src^="https://wixmp-"]' : 'img[src^="https://images-wixmp-"]'
            const link = doc.querySelector(selector) as HTMLImageElement | HTMLVideoElement
            return link.src
        }
    } catch (err) {
        console.log(err, 'err')
        throw new Error("can't get download link")
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

export const sendMessageToTab = (type: string, data?: any) => {
    chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
        if (tabs && tabs[0] && tabs[0].id) {
            interface Message {
                type: string,
                data?: any
            }

            const message: Message = {
                type
            }

            if (data !== undefined && data !== null) message.data = data
            chrome.tabs.sendMessage(
                tabs[0].id,
                message
            )
        }
    })
}


export const _chrome = {
    sendMessageP: (item: SendMessageItem): Promise<void> => {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(chrome.runtime.id, item, response => {
                if (response.complete) {
                    resolve()
                }
                else {
                    reject(response.error);
                }
            });
        });
    },
    sendMessage: (item: SendMessageItem) => {
        // @ts-ignore
        return chrome.runtime.sendMessage(item).then((response) => {
            response.complete ? Promise.resolve(response) : Promise.reject(response)
        }).catch((err: any) => {
            console.log('err', err)
        })
    },
    sendMessageToTabP: (type: string, data?: any): Promise<void> => {
        return new Promise((resolve, reject) => {
            chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
                if (tabs && tabs[0] && tabs[0].id) {
                    interface Message {
                        type: string,
                        data?: any
                    }

                    const message: Message = {
                        type
                    }

                    if (data !== undefined && data !== null) message.data = data
                    chrome.tabs.sendMessage(
                        tabs[0].id,
                        message
                    )
                    resolve()
                }
                else {
                    reject()
                }
            })
        })
    },
    sendMessageToTab: async (type: string, data?: any): Promise<void> => {
        const [tab] = await chrome.tabs.query({currentWindow: true, active: true})

        if (tab && tab.id) {
            interface Message {
                type: string,
                data?: any
            }

            const message: Message = {
                type,
                data
            }
            await chrome.tabs.sendMessage(tab.id, message)
        }
    },
    getTabInfoP: (): Promise<chrome.tabs.Tab> => {
        return new Promise((resolve, reject) => {
            chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
                if (tabs && tabs[0] && tabs[0].id) {
                    resolve(tabs[0])
                }
                else {
                    reject()
                }
            })
        })
    },
    getStorageP: (list: string[]): Promise<any> => {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.get(list, (data) => {
                resolve(data)
            })
        })
    },
}

export const validateFilename = {
    isEmpty: (filename: string) => {
        return !filename.trim().length
    },
    isInvalidDeviceName: (filename: string) => {
        // console.log('folder', filename.trim().toUpperCase())
        return INVALID_DEVICE_NAMES.includes(filename.trim().toUpperCase())
    },
    hasInvalidChar: (filename: string) => {
        const reg = /[\\/:*?"<>|~]/g
        return reg.test(filename.trim())
    },
    exceedsMaxlength: (filename: string) => {
        return filename.trim().length > 240
    },
    endsWithDecimalPoint: (filename: string) => {
        return filename.trim().endsWith('.')
    }
}

export const date = {
    format: function (date: Date, formatStr: string) {
        var str = formatStr;
        var Week = ['日', '一', '二', '三', '四', '五', '六']

        str = str.replace(/yyyy|YYYY/, date.getFullYear().toString())
        str = str.replace(/yy|YY/, (date.getFullYear() % 100) > 9 ? (date.getFullYear() % 100).toString() : '0' + (date.getFullYear() % 100))
        str = str.replace(/MM/, date.getMonth() > 8 ? (date.getMonth() + 1).toString() : '0' + (date.getMonth() + 1))
        str = str.replace(/M/g, date.getMonth().toString())
        str = str.replace(/w|W/g, Week[date.getDay()])
        str = str.replace(/dd|DD/, date.getDate() > 9 ? date.getDate().toString() : '0' + date.getDate())
        str = str.replace(/d|D/g, date.getDate().toString())
        str = str.replace(/hh|HH/, date.getHours() > 9 ? date.getHours().toString() : '0' + date.getHours())
        str = str.replace(/h|H/g, date.getHours().toString())
        str = str.replace(/mm/, date.getMinutes() > 9 ? date.getMinutes().toString() : '0' + date.getMinutes())
        str = str.replace(/m/g, date.getMinutes().toString())
        str = str.replace(/ss|SS/, date.getSeconds() > 9 ? date.getSeconds().toString() : '0' + date.getSeconds())
        str = str.replace(/s|S/g, date.getSeconds().toString())
        return str
    },
    isDateFormat: (val: string) => {
        if (val === '' || val === undefined || val === null) return false
        const reg = /^(\d{4})(-|\/)(\d{1,2})\2(\d{1,2})$/
        if (!reg.test(val)) return false
        const date = new Date(val) as (Date | "Invalid Date")
        return !(date === null || date.toString() === "Invalid Date")
    },
}
