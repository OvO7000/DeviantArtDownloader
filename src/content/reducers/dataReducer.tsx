import {Deviation, Folder, FolderType} from "../../common/js/apis";
import _ from "lodash";

export interface DataState {
    username: string,
    _folders: Folder[],
    selected: {
        galleries: string[],
        favourites: string[],
    },
    folders: Folder[],
    deviations: {
        name: string;
        type: FolderType;
        folderId: number;
        deviations: Deviation[];
    }[],
}

export type DataAction = {
    type: 'init';
    data: {
        username: string,
        galleries: Folder[],
        favourites: Folder[]
    };
} |
    {
        type: 'setSelected';
        data: {
            folders: Folder[],
            galleries: string[],
            favourites: string[]
        };
    } |
    {
        data: {
            name: string;
            folderId: number;
            type: FolderType;
            deviations: Deviation[]
        };
        type: 'setDeviation'
    }

export const dataReducer = (state: DataState, action: DataAction) => {
    if (action.type === 'init') {
        const _state = _.cloneDeep(state)

        _state.username = action.data.username
        _state._folders = action.data.galleries.concat(action.data.favourites)
        return _state
    }
    else if (action.type === 'setSelected') {
        const _state = _.cloneDeep(state)

        const {galleries, favourites, folders} = action.data
        _state.selected.galleries = galleries
        _state.selected.favourites = favourites
        _state.folders = folders
        return _state
    }
    // 添加抓取到的作品列表
    else if (action.type === 'setDeviation') {
        const _state = _.cloneDeep(state)

        const {name, deviations, type, folderId} = action.data
        _state.deviations.push({
            name,
            type,
            folderId,
            deviations
        })
        return _state
    }
    return state
}
