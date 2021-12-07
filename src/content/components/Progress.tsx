import React, {FC} from 'react';
import classnames from "classnames";

export interface ProgressProps {
    percent?: number;
}

const Progress: FC<ProgressProps> = (props) => {
    const {percent = 0} = props
    return (
        <div className='dad-cs-progress'>
            <div className='dad-cs-progress-inner' style={{width: `${percent}%`}}>
            </div>
        </div>
    )
}
export default Progress
