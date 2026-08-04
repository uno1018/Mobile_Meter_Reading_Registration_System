import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, LogOut, Moon, ShieldCheck, Sun, User } from 'lucide-react'
import type { AdminSession } from '../types'
import { signOutAdmin } from '../services/registrationService'
import { useToast } from '../hooks/useToast'
import SignInDialog from './SignInDialog'

type NavbarProps = {
  adminSession: AdminSession | null
  authLoading: boolean
  configError: string | null
  onToggleTheme: () => void
  subtitle: string
  theme: 'light' | 'dark'
  title: string
}

export default function Navbar({
  adminSession,
  authLoading,
  configError,
  onToggleTheme,
  subtitle,
  theme,
  title,
}: NavbarProps) {
  const [signInOpen, setSignInOpen] = useState(false)
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const signOutMutation = useMutation({
    mutationFn: signOutAdmin,
    onError: (error) => {
      addToast({
        message: error instanceof Error ? error.message : 'Unable to sign out.',
        title: 'Sign out failed',
        type: 'error',
      })
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-session'] }),
        queryClient.invalidateQueries({ queryKey: ['water-districts'] }),
      ])
      addToast({
        title: 'Signed out',
        type: 'success',
      })
    },
  })

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 px-4 py-4 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/85 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium text-teal-700 dark:text-teal-300 lg:hidden">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Meter Console
            </div>
            <h1 className="mt-1 truncate text-2xl font-semibold text-slate-950 dark:text-white lg:mt-0">
              {title}
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              aria-label="Toggle theme"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-neutral-800"
              onClick={onToggleTheme}
              type="button"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {authLoading ? (
              <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Checking session
              </span>
            ) : adminSession ? (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-900">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300">
                  <User className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="hidden max-w-48 truncate text-sm font-medium text-slate-700 dark:text-slate-200 sm:block">
                  {adminSession.email}
                </span>
                <button
                  aria-label="Sign out"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                  disabled={signOutMutation.isPending}
                  onClick={() => signOutMutation.mutate()}
                  type="button"
                >
                  {signOutMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            ) : (
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:bg-slate-300 dark:disabled:bg-neutral-700"
                disabled={Boolean(configError)}
                onClick={() => setSignInOpen(true)}
                type="button"
              >
                <User className="h-4 w-4" aria-hidden="true" />
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <SignInDialog onClose={() => setSignInOpen(false)} open={signInOpen} />
    </>
  )
}
