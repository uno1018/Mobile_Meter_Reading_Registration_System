import { Building2, Gauge, ShieldCheck } from 'lucide-react'
import { NavLink } from 'react-router'
import { cn } from '../utils/cn'

const navigationItems = [
  {
    icon: Gauge,
    label: 'Dashboard',
    to: '/',
  },
]

export default function Sidebar() {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-200 bg-white px-5 py-6 dark:border-neutral-800 dark:bg-neutral-950 lg:flex lg:flex-col">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-700 text-white shadow-lg shadow-teal-700/20">
            <Building2 className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
              Registration
            </p>
            <p className="text-base font-semibold text-slate-950 dark:text-white">Meter Console</p>
          </div>
        </div>

        <nav className="mt-10 space-y-2">
          {navigationItems.map((item) => (
            <NavLink
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-teal-50 text-teal-800 dark:bg-teal-400/10 dark:text-teal-200'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-neutral-900 dark:hover:text-white',
                )
              }
              end
              key={item.to}
              to={item.to}
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-teal-700 dark:text-teal-300" aria-hidden="true" />
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Admin RLS Ready</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Updates are routed through Supabase clients created from the selected registry row.
          </p>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-2 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95 lg:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around">
          <NavLink
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 rounded-lg px-4 py-2 text-xs font-medium',
                isActive
                  ? 'text-teal-700 dark:text-teal-300'
                  : 'text-slate-500 dark:text-slate-400',
              )
            }
            end
            to="/"
          >
            <Gauge className="h-5 w-5" aria-hidden="true" />
            Dashboard
          </NavLink>
        </div>
      </nav>
    </>
  )
}
