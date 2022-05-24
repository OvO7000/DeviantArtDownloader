import axios, {AxiosResponse} from 'axios'
import {getCsrfToken} from "./utils";


export type FolderType = 'gallery' | 'collection'
export interface Folder {
    // [propName: string]: any;
    type: FolderType;
    folderType: 'gallery' | 'favourite';
    name: string;
    folderId: null | number;
    totalItemCount: number;
    parentId: null | number;
    parentFolderName?: string;
    subfolders: Folder[];
}

export interface Deviation {
    deviation: {
        deviationId: number,
        isDownloadable: boolean,
        isVideo: boolean,
        title: string,
        url: string,
        publishedTime: string,
        author: {
            username: string
        },
        type: 'literature' | 'image' | 'film',
        legacyTextEditUrl: string | null,
        premiumFolderData: {
            galleryId: number,
            galleryUrl: string,
            hasAccess: boolean,
            type: string
        }
    }
}

interface FolderResponse {
    hasMore: boolean,
    nextOffset: number | null,
    results: Folder[]
}
interface DeviationResponse {
    hasMore: boolean;
    nextOffset: number | null;
    results: Deviation[]
}

/**
 * 获取folders
 * @param username
 * @param type
 * @param limit
 * @param offset
 */
const _getFolders = async (username: string, type:FolderType='gallery', limit: number, offset: number) =>{
    console.log('api/getFolders')
    // const _type = type === 'gallery'? 'gallery': 'favourites'
    // const url = `https://www.deviantart.com/_napi/da-user-profile/api/init/${_type}?username=${username}&deviations_limit=${limit}&offset=${offset}&with_subfolders=true`
    const url = `https://www.deviantart.com/_napi/shared_api/gallection/folders?type=${type}&username=${username}&limit=${limit}&offset=${offset}&with_subfolders=true`
    const result:AxiosResponse<FolderResponse> = await axios({
        method: 'get',
        url,
        responseType: 'json'
    })
    return result.data
}
export const getFolders = async (username: string, type:FolderType='gallery'):Promise<Folder[]>=>{
    let list: Folder[] = []
    const fun = async (offset:number=0) =>{
        const result = await _getFolders(username, type, 50, offset)
        list = list.concat(result.results)
        console.log(offset)
        console.log(result.results)
        console.log(result.hasMore)
        if (result.hasMore) {
            await fun(offset+50)
        }
    }
    await fun()
    return list
}

/**
 * 获取deviations
 * @param username
 * @param type
 * @param offset
 * @param limit
 * @param folderId
 */
const _getDeviations = async (username: string, type: FolderType, offset: number, limit: number, folderId: number) =>{
    console.log('api/getDeviations')
    let query: string
    if (folderId === -1) query = '&all_folder=true'
    else if  (folderId === -2) query = '&scraps_folder=true'
    else query = `&folderid=${folderId}`
    const url = `https://www.deviantart.com/_napi/da-user-profile/api/${type}/contents?username=${username}&offset=${offset}&limit=${limit}${query}`
    const result:AxiosResponse<DeviationResponse> = await axios({
        method: 'get',
        url,
        responseType: 'json'
    })
    return result.data
}
export const getDeviations = async (username: string, type: FolderType, folderId: number):Promise<Deviation[]>=>{
    let list: Deviation[] = []
    const fun = async (offset: number=0) =>{
        const result = await _getDeviations(username, type, offset, 48, folderId)
        list = list.concat(result.results)
        if (result.hasMore) {
            await fun(offset+48)
        }
    }
    await fun()
    return list
}
/**
 * 获取 HTML 页面
 * @param url
 */
export const getHTML = async (url: string)=>{
    // console.log('getHTML called', url)
    const result:AxiosResponse<HTMLElement> = await axios({
        method: 'get',
        url,
        responseType: 'document'
    })
    return result.data
}

interface MyWindow extends Window {
    __CSRF_TOKEN__: string;
}

declare var window: MyWindow;


export const watch = async(username: string, csrfToken?: string)=>{
    console.log('watch called')
    if (!csrfToken) csrfToken = getCsrfToken(document.documentElement)
    const result:AxiosResponse<any> = await axios({
        method: 'post',
        url: 'https://www.deviantart.com/_napi/shared_api/watch',
        data: {
            username,
            csrf_token: csrfToken
        }
    })
    return result
}
export const unwatch = async(username: string, csrfToken?: string)=>{
    console.log('unwatch called')
    if (!csrfToken) csrfToken = getCsrfToken(document.documentElement)
    const result:AxiosResponse<any> = await axios({
        method: 'post',
        url: 'https://www.deviantart.com/_napi/shared_api/unwatch',
        data: {
            username,
            csrf_token: csrfToken
        }
    })
    return result
}
