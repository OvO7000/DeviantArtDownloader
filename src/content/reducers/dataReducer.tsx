import {Deviation, Folder, FolderType} from "../../common/js/apis";
import _ from "lodash";
import {SettingsState} from '../../popup/reducers/settingsReducer'

export interface DataState {
    username: string,
    folders: Folder[],
    deviations: {
        name: string,
        type: FolderType,
        folderId: number,
        deviations: Deviation[],
    }[],
    settings: SettingsState,
}

export type DataAction = {
    type: 'init';
    data: {
        // favourites: Folder[]
        // username: string,
        folders: Folder[],
        username: string
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
    } |
    {
        data: SettingsState;
        type: 'setSettings'
    } |
    {
    type: 'clear'
};

export const dataReducer = (state: DataState, action: DataAction) => {
    if (action.type === 'init') {
        const _state = _.cloneDeep(state)

        // _state.username = action.data.username
        _state.username = action.data.username
        _state.folders = action.data.folders
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
    // 设置 settings
    else if (action.type === 'setSettings') {
        const _state = _.cloneDeep(state)
        _state.settings = action.data
        return _state
    }
    else if (action.type === 'clear') {
        const _state: DataState = {
            username: '',
            folders: [],
            deviations: [],
            settings: {
                downloadDownloadable: false,
                startTime: '',
                endTime: '',
                filename: '',
                conflictAction: 'uniquify',
                autoRenameIfHasError: false
            }
        }
        return _state
    }
    return state
}
