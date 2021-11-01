import React, {FC, useState} from 'react';
import {Collapse, Checkbox, Space, Button} from 'antd'
import {Action, ActionDataType} from '../pages/download'
import {CheckboxValueType} from 'antd/lib/checkbox/Group';

const {Panel} = Collapse

export interface Props {
    requested: boolean;
    username: string;
    galleries: string[],
    favourites: string[],
    selectedGalleries: string[],
    selectedFavourites: string[],
    dispatch: (action: Action) => void
}

const Userinfo: FC<Props> = (props) => {
    const {requested = false, username = '', galleries, favourites, selectedGalleries, selectedFavourites, dispatch} = props
    const getCheckboxGroup = (type: ActionDataType, list: any[]) => {
        const value = type === 'galleries'?selectedGalleries:selectedFavourites
        return (
            <div className='userinfo-checkboxGroup'>
                <Checkbox.Group
                    value={value}
                    onChange={(checkedValues) => {
                        dispatch({
                            type: 'select',
                            data: {
                                type: type,
                                list: checkedValues
                            }
                        })
                    }}
                >
                    <Space direction='vertical'>
                        {
                            list.map((item) => {
                                return (
                                    <Checkbox value={item}>{item}</Checkbox>
                                )
                            })
                        }
                    </Space>
                </Checkbox.Group>
            </div>
        )
    }
    const selectAll = (type: ActionDataType)=>{
        const selectedList = type==='galleries'?selectedGalleries:selectedFavourites
        const comparedList = type==='galleries'?galleries:favourites
        const set = (list: string[])=>{
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
            set(comparedList)
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
                                    onClick={()=>{selectAll('galleries')}}
                                >all galleries</Button>
                                <Button
                                    className='userinfo-btn_selectAllFavourites'
                                    size='small'
                                    onClick={()=>{selectAll('favourites')}}
                                >all favourites</Button>
                            </Space>

                        </div>
                        <div className='userinfo-tab'>
                            <Collapse bordered={false} className="collapse">
                                <Panel header="Galleries" key="1" className="collapse-panel">
                                    {getCheckboxGroup('galleries', galleries)}
                                </Panel>
                                <Panel header="Favourites" key="2" className="collapse-panel">
                                    {getCheckboxGroup('favourites', favourites)}
                                </Panel>
                            </Collapse>
                        </div>
                    </>
                )
            }
        </div>
    )
}
export default Userinfo
