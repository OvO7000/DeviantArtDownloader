import _ from "lodash";

export type ConflictAction = 'uniquify' | 'overwrite'

export interface SettingsState {
    downloadDownloadable: boolean,
    startTime: string,
    endTime: string,
    filename: string,
    conflictAction: ConflictAction,
    autoRenameIfHasError: boolean
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
}

export const settingsReducer = (state: SettingsState, action: SettingsAction) => {
    // if (action.type === 'init') {
    //     const _state = _.cloneDeep(state)
    //     const {downloadDownloadable, startTime, endTime, filename, conflictAction, autoRenameIfHasError} = action.settings
    //     _state.downloadDownloadable = downloadDownloadable
    //     _state.startTime = startTime
    //     _state.endTime = endTime
    //     _state.filename = filename
    //     _state.conflictAction = conflictAction
    //     _state.autoRenameIfHasError = autoRenameIfHasError
    //     return _state
    // }
    if (action.type === 'setSettings') {
        const _state = _.cloneDeep(state)
        const {downloadDownloadable, startTime, endTime, conflictAction, filename, autoRenameIfHasError} = action
        if(downloadDownloadable !== undefined) _state.downloadDownloadable = downloadDownloadable
        if(startTime !== undefined) _state.startTime = startTime
        if(endTime !== undefined) _state.endTime = endTime
        if(conflictAction !== undefined) _state.conflictAction = conflictAction
        if(filename !== undefined) _state.filename = filename
        if(autoRenameIfHasError !== undefined) _state.autoRenameIfHasError = autoRenameIfHasError
        chrome.storage.sync.set({settings: _state})
        return _state
    }
    return state
}
