import React, {FC} from 'react';
import ReactDOM from 'react-dom';
import './content.styl'
import Panel from './components/App'

// content-script 入口、根组件
const App: FC = (props) => {
    return (
        <div className='dad-app'>
            <Panel/>
        </div>
    )
}

const app = document.createElement('div')
app.id = 'dad-container'
document.body.appendChild(app)
ReactDOM.render(<App/>, app)

export {}
