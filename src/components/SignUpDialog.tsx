import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, Loader2, Lock, Mail, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { signUpAdmin } from '../services/registrationService'
import { useToast } from '../hooks/useToast'

const signUpSchema = z
  .object({
    confirmPassword: z.string(),
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(8, 'Use at least 8 characters'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type SignUpValues = z.infer<typeof signUpSchema>

type SignUpDialogProps = {
  onClose: () => void
  onSwitchToSignIn: () => void
  open: boolean
}

type Registered = {
  email: string
  needsEmailConfirmation: boolean
}

const fieldWrapperClass =
  'mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 focus-within:border-teal-600 dark:border-neutral-700 dark:bg-neutral-900'

export default function SignUpDialog({ onClose, onSwitchToSignIn, open }: SignUpDialogProps) {
  const { addToast } = useToast()
  const [registered, setRegistered] = useState<Registered | null>(null)
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<SignUpValues>({
    defaultValues: {
      confirmPassword: '',
      email: '',
      password: '',
    },
    resolver: zodResolver(signUpSchema),
  })

  const closeAndReset = () => {
    reset()
    setRegistered(null)
    onClose()
  }

  const signUpMutation = useMutation({
    mutationFn: (values: SignUpValues) => signUpAdmin(values.email, values.password),
    onError: (error) => {
      addToast({
        message: error instanceof Error ? error.message : 'Unable to create the administrator account.',
        title: 'Registration failed',
        type: 'error',
      })
    },
    onSuccess: (result) => {
      setRegistered(result)
      reset()
      addToast({
        message: `${result.email} was created but has no administrator access yet.`,
        title: 'Account created',
        type: 'success',
      })
    },
  })

  if (!open) {
    return null
  }

  if (registered) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
          <div className="flex items-start gap-3">
            <CheckCircle2
              className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
            <div>
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Account created</h2>
              <p className="mt-2 break-words text-sm leading-6 text-slate-600 dark:text-slate-300">
                {registered.email}
              </p>
            </div>
          </div>

          <ol className="mt-6 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {registered.needsEmailConfirmation ? (
              <li className="flex gap-3">
                <span className="font-semibold text-teal-700 dark:text-teal-300">1.</span>
                <span>Open the confirmation email and follow the link to activate this account.</span>
              </li>
            ) : null}
            <li className="flex gap-3">
              <span className="font-semibold text-teal-700 dark:text-teal-300">
                {registered.needsEmailConfirmation ? '2.' : '1.'}
              </span>
              <span>
                Ask an existing administrator to grant the{' '}
                <code className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-neutral-800">
                  registration_admin
                </code>{' '}
                claim to this account.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-teal-700 dark:text-teal-300">
                {registered.needsEmailConfirmation ? '3.' : '2.'}
              </span>
              <span>Sign in. Water Districts stay hidden until the claim is present.</span>
            </li>
          </ol>

          <div className="mt-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              Registering does not grant access on its own. The claim can only be set by someone with
              service-role access to the central project.
            </p>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-neutral-700 dark:text-slate-200 dark:hover:bg-neutral-900"
              onClick={closeAndReset}
              type="button"
            >
              Close
            </button>
            <button
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
              onClick={() => {
                setRegistered(null)
                onSwitchToSignIn()
              }}
              type="button"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <form
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950"
        onSubmit={handleSubmit((values) => signUpMutation.mutate(values))}
      >
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            Register Administrator
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Creates an account on the central Supabase project. An existing administrator must grant
            access before this account can approve devices.
          </p>
        </div>

        <label className="mt-6 block">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Email</span>
          <span className={fieldWrapperClass}>
            <Mail className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              autoComplete="email"
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              placeholder="admin@example.com"
              type="email"
              {...register('email')}
            />
          </span>
          {errors.email ? (
            <span className="mt-1 block text-sm text-red-600">{errors.email.message}</span>
          ) : null}
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Password</span>
          <span className={fieldWrapperClass}>
            <Lock className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              autoComplete="new-password"
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              placeholder="At least 8 characters"
              type="password"
              {...register('password')}
            />
          </span>
          {errors.password ? (
            <span className="mt-1 block text-sm text-red-600">{errors.password.message}</span>
          ) : null}
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Confirm Password
          </span>
          <span className={fieldWrapperClass}>
            <Lock className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              autoComplete="new-password"
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              placeholder="Re-enter the password"
              type="password"
              {...register('confirmPassword')}
            />
          </span>
          {errors.confirmPassword ? (
            <span className="mt-1 block text-sm text-red-600">{errors.confirmPassword.message}</span>
          ) : null}
        </label>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-neutral-700 dark:text-slate-200 dark:hover:bg-neutral-900"
            disabled={signUpMutation.isPending}
            onClick={closeAndReset}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-80"
            disabled={signUpMutation.isPending}
            type="submit"
          >
            {signUpMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            Create Account
          </button>
        </div>

        <p className="mt-6 border-t border-slate-200 pt-4 text-center text-sm text-slate-600 dark:border-neutral-800 dark:text-slate-300">
          Already have an account?{' '}
          <button
            className="font-semibold text-teal-700 underline transition hover:text-teal-800 dark:text-teal-300"
            onClick={onSwitchToSignIn}
            type="button"
          >
            Sign in
          </button>
        </p>
      </form>
    </div>
  )
}
