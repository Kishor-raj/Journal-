import AppRouter from './router/AppRouter'
import { ToastProvider } from './shared/components/Toast'

function App() {
  return (
    <ToastProvider>
      <AppRouter />
    </ToastProvider>
  )
}

export default App
