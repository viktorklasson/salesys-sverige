
import { createRoot } from 'react-dom/client'
import { AuthProvider } from '@/components/Authentication'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
