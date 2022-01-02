import React, {FC, useEffect, useState} from 'react';
import { Checkbox } from "antd";
import {CheckboxChangeEvent} from 'antd/lib/checkbox/Checkbox';
export interface SettingsProps {}

const Settings: FC<SettingsProps> = (props) => {
    const [downloadDownloadable, setDownloadDownloadable] = useState(false)

    useEffect(() => {
        chrome.storage.sync.get(['settings'],
            ({settings}) => {
                settings.downloadDownloadable && setDownloadDownloadable(settings.downloadDownloadable)
            })
    }, [])

    const handleCheckboxClick = (e: CheckboxChangeEvent) => {
        const checked = e.target.checked
        chrome.storage.sync.get(['settings'], ({settings})=>{
            chrome.storage.sync.set({
                settings: {
                    ...settings,
                    downloadDownloadable: checked
                }
            })
            setDownloadDownloadable(checked)
        })
    }
    return (
        <>
            <Checkbox
                checked={downloadDownloadable}
                onChange={handleCheckboxClick}
            >
                only download deviations with download icon
            </Checkbox>
        </>
    )
}
export default Settings
