import {Deviation, Folder, FolderType} from "../../common/js/apis";
import _ from "lodash";


export interface PanelState {
    show: boolean,
    download: boolean,
    status: 'crawling' | 'downloading',
    current: string,
    progress: number,
    group: {
        title: string,
        current: number,
        total: number
    },
    subGroup: {
        title: string,
        current: number,
        total: number
    }
}

export type PanelAction = {
    type: 'setDownload'
} |
    {
        type: 'setShow',
        data: {
            show: boolean
        }
    } |
    {
        type: 'setPanel',
        data: {
            status?: 'crawling' | 'downloading';
            current?: string;
            progress?: number;
            group?: {
                title?: string;
                current?: number;
                total?: number;
            },
            subGroup?: {
                title?: string;
                current?: number;
                total?: number;
            }
        }
    } |
    {
        type: 'addCurrent',
        data: {
            target: 'group' | 'subGroup',
            progress?: 'group' | 'subGroup'
        }
    }

export const panelReducer = (state: PanelState, action: PanelAction) => {
    if (action.type === 'setDownload') {
        const _state = _.cloneDeep(state)
        _state.download = true
        return _state
    }
    else if (action.type === 'setShow') {
        const _state = _.cloneDeep(state)
        _state.show = action.data.show
        return _state
    }
    else if (action.type === 'setPanel') {
        const _state = _.cloneDeep(state)
        const {status, current, progress, group, subGroup} = action.data
        console.log('setPanel called', progress)
        status && (_state.status = status)
        current && (_state.current = current)
        if (progress !== undefined) _state.progress = progress
        if (group) {
            const {title, current, total} = group
            title && (_state.group.title = title)
            if (current !== undefined) _state.group.current = current
            if (total !== undefined) _state.group.total = total
        }
        if (subGroup) {
            const {title, current, total} = subGroup
            title && (_state.subGroup.title = title)
            if (current !== undefined) _state.subGroup.current = current
            if (total !== undefined) _state.subGroup.total = total
        }
        return _state
    }
    else if (action.type === 'addCurrent') {
        const _state = _.cloneDeep(state)
        const {target, progress} = action.data
        console.log('addCurrent called')
        // current + 1
        if (_state[target].current >= _state[target].total) {
            _state[target].current = _state[target].total
        }
        else if (_state[target].current < 0) {
            _state[target].current = 1
        }
        else {
            _state[target].current += 1
        }

        // 计算 progress
        if (progress) {
            _state.progress = Math.floor(_state[progress].current / _state[progress].total * 100)
        }
        return _state
    }

    return state
}
