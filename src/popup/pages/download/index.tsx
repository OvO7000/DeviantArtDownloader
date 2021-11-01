import React, {FC, useEffect, useReducer} from 'react';
import _ from 'lodash'
import {Button} from 'antd';
import Userinfo from '../../components/Userinfo'

export type ActionDataType = 'galleries' | 'favourites'

interface State {
    username: string;
    galleries: string[];
    favourites: string[];
    requested: boolean;
    selected: {
        galleries: string[],
        favourites: string[]
    }
}

export interface Action {
    data: {
        [propName: string]: any;
        type?: ActionDataType
    };
    type: 'setData' | 'select'
}


const initialState: State = {
    username: '',
    galleries: [],
    favourites: [],
    selected: {
        galleries: [],
        favourites: []
    },
    requested: false
}

const reducer = (state: State, action: Action) => {
    if (action.type === 'setData') {
        const {username, galleries, favourites} = action.data
        const result: State = {
            username,
            galleries,
            favourites,
            selected: {
                galleries: [],
                favourites: []
            },
            requested: true
        }
        return result
    }
    else if (action.type === 'select') {
        const {type, list} = action.data
        const _state = _.cloneDeep(state)
        if (type === 'galleries' || type === 'favourites') {
            _state.selected[type] = list
            return _state
        }

    }
    return state
}

const Download: FC = () => {
    const [
        {
            requested,
            username,
            galleries,
            favourites,
            selected
        },
        dispatch
    ] = useReducer(reducer, initialState)

    const getFolders = () => {
        chrome.storage.sync.get(['username', 'galleries', 'favourites'], (data)=>{
            console.log(data)
            if (data.username && data.galleries && data.favourites) {
                dispatch({
                    type: 'setData',
                    data
                })
            }
        })
    }
    const download = () => {
        if (!requested) return
        chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
            if (tabs && tabs[0] && tabs[0].id) {
                console.log(tabs)

                chrome.tabs.sendMessage(
                    tabs[0].id,
                    {
                        type: 'download',
                        data: {
                            galleries: selected.galleries,
                            favourites: selected.favourites
                        }
                    })
            }
        })
    }

    useEffect(() => {
        getFolders()
    }, [])

    return (
        <div className='download'>
            <Userinfo
                requested={requested}
                username={username}
                galleries={galleries}
                favourites={favourites}
                selectedGalleries={selected.galleries}
                selectedFavourites={selected.favourites}
                dispatch={dispatch}
            />
            <div className='btns'>
                <Button
                    type='primary'
                    onClick={download}
                >下载</Button>
            </div>

        </div>

    )
}

export default Download
