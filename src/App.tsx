import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/electron-vite.animate.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [apiStatus, setApiStatus] = useState<string>('')

  const testApi = () => {
    try {
      if (window.api) {
        setApiStatus('✅ window.api is available')
        console.log('Available API methods:', Object.keys(window.api))
      } else {
        setApiStatus('❌ window.api is not available')
      }
    } catch (error) {
      setApiStatus(`❌ Error: ${error}`)
    }
  }

  return (
    <>
      <div>
        <a href="https://electron-vite.github.io" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>ClipForge - Electron Setup Test</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <button onClick={testApi} style={{ marginLeft: '10px' }}>
          Test IPC Bridge
        </button>
        <p>{apiStatus}</p>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
