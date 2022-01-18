import {Folder} from "../../common/js/apis";
import _ from "lodash";

export type ActionDataType = 'galleries' | 'favourites'
type Status = 'beforeInit' | 'initialed' | 'downloading' | 'paused' | 'finished'
export type UserInfoAction = {
    type: 'select',
    data: {
        type: ActionDataType,
        list: string[]
    };
} | {
    type: 'setData',
    data: UserInfoState;
} | {
    type: 'setStatus',
    data: {
        status: Status
    };
}

export interface UserInfoState {
    username: string,
    _galleries: Folder[],
    galleries: {
        count: number,
        name: string
    }[],
    _favourites: Folder[],
    favourites: {
        count: number,
        name: string
    }[],
    selected: {
        galleries: string[],
        favourites: string[]
    },
    status: Status
}
const setStorage = (_state:UserInfoState) => {
    chrome.storage.sync.set({
        username: _state.username,
        galleries: _state.galleries,
        favourites: _state.favourites,
        status: _state.status,
        selected: _state.selected,
    })
}

export const userInfoReducer = (state: UserInfoState, action: UserInfoAction) => {
    if (action.type === 'setData') {
        const {username, _galleries, _favourites, galleries, favourites, selected, status} = action.data
        return {
            username,
            _galleries,
            galleries,
            // galleries: _galleries.map(item=>({name: item.name, count: item.totalItemCount})),
            _favourites,
            favourites,
            selected: selected,
            status: status
        }
    }
    else if (action.type === 'select') {
        const {type, list} = action.data
        const _state = _.cloneDeep(state)
        if (type === 'galleries' || type === 'favourites') {
            _state.selected[type] = list
            setStorage(_state)
            return _state
        }
    }
    else if (action.type === 'setStatus') {
        const {status} = action.data
        const _state = _.cloneDeep(state)
        _state.status = status
        setStorage(_state)
        return _state
    }
    return state
}
