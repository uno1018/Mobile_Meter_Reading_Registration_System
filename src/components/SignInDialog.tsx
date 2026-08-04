import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Lock, Mail } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { signInAdmin } from '../services/registrationService'
import { useToast } from '../hooks/useToast'

const signInSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Enter your administrator password'),
})

type SignInValues = z.infer<typeof signInSchema>

type SignInDialogProps = {
  onClose: () => void
  open: boolean
}

export default function SignInDialog({ onClose, open }: SignInDialogProps) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<SignInValues>({
    defaultValues: {
      email: '',
      password: '',
    },
    resolver: zodResolver(signInSchema),
  })

  const signInMutation = useMutation({
    mutationFn: (values: SignInValues) => signInAdmin(values.email, values.password),
    onError: (error) => {
      addToast({
        message: error instanceof Error ? error.message : 'Unable to authenticate administrator.',
        title: 'Sign in failed',
        type: 'error',
      })
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-session'] }),
        queryClient.invalidateQueries({ queryKey: ['water-districts'] }),
      ])
      addToast({
        title: 'Signed in',
        type: 'success',
      })
      reset()
      onClose()
    },
  })

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <form
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950"
        onSubmit={handleSubmit((values) => signInMutation.mutate(values))}
      >
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Administrator Sign In</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Use the administrator account from the central Supabase project.
          </p>
        </div>

        <label className="mt-6 block">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Email</span>
          <span className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 focus-within:border-teal-600 dark:border-neutral-700 dark:bg-neutral-900">
            <Mail className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              autoComplete="email"
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              placeholder="admin@example.com"
              type="email"
              {...register('email')}
            />
          </span>
          {errors.email ? <span className="mt-1 block text-sm text-red-600">{errors.email.message}</span> : null}
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Password</span>
          <span className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 focus-within:border-teal-600 dark:border-neutral-700 dark:bg-neutral-900">
            <Lock className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              autoComplete="current-password"
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              placeholder="Password"
              type="password"
              {...register('password')}
            />
          </span>
          {errors.password ? (
            <span className="mt-1 block text-sm text-red-600">{errors.password.message}</span>
          ) : null}
        </label>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-neutral-700 dark:text-slate-200 dark:hover:bg-neutral-900"
            disabled={signInMutation.isPending}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-80"
            disabled={signInMutation.isPending}
            type="submit"
          >
            {signInMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Sign In
          </button>
        </div>
      </form>
    </div>
  )
}
