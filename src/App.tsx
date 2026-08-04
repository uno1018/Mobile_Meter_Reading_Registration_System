import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import WaterDistrict from './pages/WaterDistrict'
import { getAdminSession } from './services/registrationService'
import { getCentralConfigError } from './services/supabaseFactory'

type ThemeMode = 'light' | 'dark'

const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const storedTheme = window.localStorage.getItem('meter-registration-theme')
  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const getPageTitle = (pathname: string) => {
  if (pathname.startsWith('/district/')) {
    return {
      title: 'Installation Requests',
      subtitle: 'Review Android devices and update registration status.',
    }
  }

  return {
    title: 'Water Districts',
    subtitle: 'Connect to a Water District Supabase project from the central registry.',
  }
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme)
  const location = useLocation()
  const centralConfigError = getCentralConfigError()
  const pageTitle = useMemo(() => getPageTitle(location.pathname), [location.pathname])

  const adminSessionQuery = useQuery({
    queryKey: ['admin-session'],
    queryFn: getAdminSession,
    enabled: !centralConfigError,
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    window.localStorage.setItem('meter-registration-theme', theme)
  }, [theme])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 antialiased dark:bg-neutral-950 dark:text-slate-100">
      <Sidebar />
      <div className="min-h-screen lg:pl-72">
        <Navbar
          adminSession={adminSessionQuery.data ?? null}
          authLoading={adminSessionQuery.isLoading}
          configError={centralConfigError}
          onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
          subtitle={pageTitle.subtitle}
          theme={theme}
          title={pageTitle.title}
        />
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/district/:districtId" element={<WaterDistrict />} />
            <Route path="*" element={<Navigate replace to="/" />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
