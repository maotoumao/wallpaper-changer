import { useState } from 'react';
import { MemoryRouter as Router, Switch, Route } from 'react-router-dom';
import './App.css';

function Setting(){
  const [inputText, setInputText] = useState<string>('');

  const onClick=()=>{
    // @ts-ignore
    window.electron.events.updateCurrentApp(inputText);
  }

  return <>
    <div>
      输入窗口名: 
      <input value={inputText} onChange={e => {setInputText(e.target.value)}}></input>
    </div>
    <button onClick={onClick}>确定</button>
  </>;
}

export default function App() {
  return (
    <Router>
      <Switch>
        <Route path="/" component={Setting} />
      </Switch>
    </Router>
  );
}
