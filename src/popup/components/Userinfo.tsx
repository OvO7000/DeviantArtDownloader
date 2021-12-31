import React, {FC, useState} from 'react';
import {Collapse, Checkbox, Space, Button, Row} from 'antd'
import {Action, ActionDataType} from './Download'
import {CheckboxValueType} from 'antd/lib/checkbox/Group';

const {Panel} = Collapse

export interface Props {
    requested: boolean;
    username: string;
    galleries: {
        name: string;
        count: number;
    }[],
    favourites: {
        name: string;
        count: number;
    }[],
    selectedGalleries: string[],
    selectedFavourites: string[],
    dispatch: (action: Action) => void
}

const Userinfo: FC<Props> = (props) => {
    const {requested = false, username = '', galleries, favourites, selectedGalleries, selectedFavourites, dispatch} = props

    const getCheckboxGroup = (type: ActionDataType) => {
        const value = type === 'galleries' ? selectedGalleries : selectedFavourites
        const list = type === 'galleries' ? galleries : favourites
        const folderType = type === 'galleries' ? 'gallery' : 'favourite'
        return (
            <Checkbox.Group
                className='userinfo-folderGroup'
                value={value}
                onChange={(checkedValues: CheckboxValueType[]) => {
                    console.log('checkedValues', checkedValues)
                    dispatch({
                        type: 'select',
                        data: {
                            type: type,
                            list: checkedValues as string[]
                        }
                    })
                }}
            >
                {
                    list.map((item) => {
                        return (
                            <Row>
                                <Checkbox value={item.name}>
                                    <span className='userinfo-folder'>
                                        <span className='userinfo-folder-l'>
                                            <span className='userinfo-folder-name'>{item.name}</span>
                                            <span className='userinfo-folder-count'>{item.count} deviations</span></span>
                                        <span className='userinfo-folder-type'>{folderType}</span>
                                    </span>
                                </Checkbox>
                            </Row>

                        )
                    })
                }
            </Checkbox.Group>
        )
    }

    const selectAll = (type: ActionDataType) => {
        const selectedList = type === 'galleries' ? selectedGalleries : selectedFavourites
        const comparedList = type === 'galleries' ? galleries : favourites
        const set = (list: string[]) => {
            dispatch({
                type: "select",
                data: {
                    type,
                    list
                }
            })
        }
        if (selectedList.length >= comparedList.length) {
            set([])
        }
        else {
            set(comparedList.map(item => item.name))
        }
    }
    return (
        <div className='userinfo'>
            {
                requested && (
                    <>
                        <div className='userinfo-header'>
                            <span className='userinfo-name'>{username}</span>
                            <Space>
                                <Button
                                    className='userinfo-btn_selectAllGalleries'
                                    size='small'
                                    onClick={() => {
                                        selectAll('galleries')
                                    }}
                                >all galleries</Button>
                                <Button
                                    className='userinfo-btn_selectAllFavourites'
                                    size='small'
                                    onClick={() => {
                                        selectAll('favourites')
                                    }}
                                >all favourites</Button>
                            </Space>
                        </div>
                        <div className='userinfo-folders'>
                            {getCheckboxGroup('galleries')}
                            {getCheckboxGroup('favourites')}
                        </div>
                    </>
                )
            }
        </div>
    )
}
export default Userinfo
