import React, {FC, useState} from 'react';
import {Checkbox, Space, Button, Row, Tabs} from 'antd'
import {UserInfoAction, ActionDataType} from '../reducers/userInfoReducer'
import {CheckboxValueType} from 'antd/lib/checkbox/Group';

const {TabPane} = Tabs

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
    dispatch: (action: UserInfoAction) => void
}

const Userinfo: FC<Props> = (props) => {
    const {
        requested = false,
        galleries,
        favourites,
        selectedGalleries,
        selectedFavourites,
        dispatch
    } = props

    const getCheckboxGroup = (type: ActionDataType) => {
        const value = type === 'galleries' ? selectedGalleries : selectedFavourites
        const list = type === 'galleries' ? galleries : favourites
        return (
            <Checkbox.Group
                className='userinfo-folderGroup'
                value={value}
                onChange={(checkedValues: CheckboxValueType[]) => {
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
                                        <span className='userinfo-folder-name'>{item.name}</span>
                                        <span className='userinfo-folder-count'>{item.count} deviations</span>
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

    const buttons = (
        <>
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
        </>
    )
    return (
        <div className='userinfo'>
            {
                requested && (
                    <Tabs tabBarExtraContent={buttons}>
                        <TabPane key='galleries' tab={
                            <span className='tab-title'>Gallery</span>
                        }>
                            {getCheckboxGroup('galleries')}
                        </TabPane>
                        <TabPane key='favourites' tab={
                            <span className='tab-title'>Favourites</span>
                        }>
                            {getCheckboxGroup('favourites')}
                        </TabPane>
                    </Tabs>
                    // <>
                    //     <div className='userinfo-header'>
                    //         <span className='userinfo-name'>{username}</span>
                    //     </div>
                    //     <div className='userinfo-folders'>
                    //
                    //         {getCheckboxGroup('favourites')}
                    //     </div>
                    // </>
                )
            }
        </div>
    )
}
export default Userinfo
