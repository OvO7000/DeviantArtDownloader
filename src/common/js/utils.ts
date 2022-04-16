import {Deviation, getHTML} from './apis'

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

// export const sendMessagePromise = (item: SendMessageItem): Promise<void> => {
//     return new Promise((resolve, reject) => {
//         chrome.runtime.sendMessage(chrome.runtime.id, item, response => {
//             console.log('response', response)
//             if (response.complete) {
//                 resolve()
//             }
//             else {
//                 reject('download failed')
//             }
//         });
//     });
// }

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

export const validate = {
    filename: {
        isEmpty: (filename: string) => {
            return !filename.trim().length
        },
        deviceName: (filename: string) => {
            // console.log('folder', filename.trim().toUpperCase())
            return INVALID_DEVICE_NAMES.includes(filename.trim().toUpperCase())
        },
        char: (filename: string) => {
            const reg = /[\\/:*?"<>|]/g
            return reg.test(filename.trim())
        },
        length: (filename: string) => {
            return filename.trim().length > 240
        },
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
