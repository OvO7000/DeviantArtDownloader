import _ from "lodash";

export type ConflictAction = 'uniquify' | 'overwrite'
export type LiteratureDownloadType = 'md' | 'txt'

export interface SettingsState {
    downloadDownloadable: boolean,
    startTime: string,
    endTime: string,
    filename: string,
    conflictAction: ConflictAction,
    autoRenameIfHasError: boolean,
    literatureDownloadType: LiteratureDownloadType
}

export type SettingsAction = {
    type: 'init',
    settings: SettingsState
} | {
    type: 'setSettings',
    downloadDownloadable?: boolean,
    startTime?: string,
    endTime?: string
    conflictAction?: ConflictAction,
    filename?: string,
    autoRenameIfHasError?: boolean
    literatureDownloadType?: 'md' | 'txt'
}

export const settingsReducer = (state: SettingsState, action: SettingsAction) => {

    if (action.type === 'setSettings') {
        const _state = _.cloneDeep(state)
        const {downloadDownloadable, startTime, endTime, conflictAction, filename, autoRenameIfHasError, literatureDownloadType} = action
        if(downloadDownloadable !== undefined) _state.downloadDownloadable = downloadDownloadable
        if(startTime !== undefined) _state.startTime = startTime
        if(endTime !== undefined) _state.endTime = endTime
        if(conflictAction !== undefined) _state.conflictAction = conflictAction
        if(filename !== undefined) _state.filename = filename
        if(autoRenameIfHasError !== undefined) _state.autoRenameIfHasError = autoRenameIfHasError
        if(literatureDownloadType !== undefined) _state.literatureDownloadType = literatureDownloadType
        chrome.storage.sync.set({settings: _state})
        return _state
    }
    return state
}
