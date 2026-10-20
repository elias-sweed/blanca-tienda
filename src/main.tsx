import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ToastProvider } from './components/ui/Toast.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { AuthProvider } from './context/AuthProvider.tsx'
import { PWAProvider } from './context/PWAProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <PWAProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </PWAProvider>
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
)
