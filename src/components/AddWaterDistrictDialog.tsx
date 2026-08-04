import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Loader2, Plug, XCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { createWaterDistrict, testWaterDistrictConnection } from '../services/registrationService'
import { useToast } from '../hooks/useToast'

const waterDistrictSchema = z.object({
  active: z.boolean(),
  description: z.string().max(200, 'Keep the description under 200 characters'),
  supabase_anon_key: z.string().min(20, 'Paste the district project anon key'),
  supabase_url: z
    .string()
    .url('Enter the full project URL')
    .refine((value) => value.startsWith('https://'), 'The URL must start with https://'),
  water_district: z.string().min(2, 'Enter the Water District name').max(120, 'Name is too long'),
})

type WaterDistrictValues = z.infer<typeof waterDistrictSchema>

type AddWaterDistrictDialogProps = {
  onClose: () => void
  open: boolean
}

type TestState = { message: string; ok: boolean } | null

const inputClass =
  'mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white'

const labelClass = 'text-sm font-medium text-slate-700 dark:text-slate-200'

const errorClass = 'mt-1 block text-sm text-red-600'

export default function AddWaterDistrictDialog({ onClose, open }: AddWaterDistrictDialogProps) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [testState, setTestState] = useState<TestState>(null)
  const {
    formState: { errors },
    getValues,
    handleSubmit,
    register,
    reset,
  } = useForm<WaterDistrictValues>({
    defaultValues: {
      active: true,
      description: '',
      supabase_anon_key: '',
      supabase_url: '',
      water_district: '',
    },
    resolver: zodResolver(waterDistrictSchema),
  })

  const closeAndReset = () => {
    reset()
    setTestState(null)
    onClose()
  }

  const testMutation = useMutation({
    mutationFn: () => {
      const { supabase_anon_key, supabase_url } = getValues()

      if (!supabase_url || !supabase_anon_key) {
        throw new Error('Enter the project URL and anon key first.')
      }

      return testWaterDistrictConnection(supabase_url, supabase_anon_key)
    },
    onError: (error) => {
      setTestState({
        message: error instanceof Error ? error.message : 'The district project could not be reached.',
        ok: false,
      })
    },
    onSuccess: () => {
      setTestState({ message: 'Connected. The district schema is in place.', ok: true })
    },
  })

  const createMutation = useMutation({
    mutationFn: (values: WaterDistrictValues) =>
      createWaterDistrict({
        active: values.active,
        description: values.description.trim() || null,
        supabase_anon_key: values.supabase_anon_key.trim(),
        supabase_url: values.supabase_url.trim().replace(/\/+$/, ''),
        water_district: values.water_district.trim(),
      }),
    onError: (error) => {
      addToast({
        message: error instanceof Error ? error.message : 'The registry row could not be created.',
        title: 'Could not add Water District',
        type: 'error',
      })
    },
    onSuccess: async (district) => {
      await queryClient.invalidateQueries({ queryKey: ['water-districts'] })
      addToast({
        message: `${district.water_district} was added to the registry.`,
        title: 'Water District added',
        type: 'success',
      })
      closeAndReset()
    },
  })

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <form
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950"
        onSubmit={handleSubmit((values) => createMutation.mutate(values))}
      >
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Add Water District</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Registers a district Supabase project. Use that project's own URL and anon key, not the
            central project's.
          </p>
        </div>

        <label className="mt-6 block">
          <span className={labelClass}>Water District</span>
          <input
            className={inputClass}
            placeholder="North Water District"
            type="text"
            {...register('water_district')}
          />
          {errors.water_district ? (
            <span className={errorClass}>{errors.water_district.message}</span>
          ) : null}
        </label>

        <label className="mt-4 block">
          <span className={labelClass}>Description</span>
          <input className={inputClass} placeholder="Production" type="text" {...register('description')} />
          {errors.description ? <span className={errorClass}>{errors.description.message}</span> : null}
        </label>

        <label className="mt-4 block">
          <span className={labelClass}>Project URL</span>
          <input
            className={inputClass}
            placeholder="https://your-district-ref.supabase.co"
            type="url"
            {...register('supabase_url')}
          />
          {errors.supabase_url ? <span className={errorClass}>{errors.supabase_url.message}</span> : null}
        </label>

        <label className="mt-4 block">
          <span className={labelClass}>Anon Key</span>
          <textarea
            className={`${inputClass} min-h-24 resize-y font-mono text-xs`}
            placeholder="Paste the anon key from the district project's API settings"
            {...register('supabase_anon_key')}
          />
          {errors.supabase_anon_key ? (
            <span className={errorClass}>{errors.supabase_anon_key.message}</span>
          ) : null}
        </label>

        <label className="mt-4 flex items-center gap-2">
          <input
            className="h-4 w-4 rounded border-slate-300 text-teal-700 dark:border-neutral-600"
            type="checkbox"
            {...register('active')}
          />
          <span className="text-sm text-slate-700 dark:text-slate-200">
            Active — inactive districts cannot be connected
          </span>
        </label>

        <div className="mt-5 rounded-lg border border-slate-200 p-3 dark:border-neutral-800">
          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-70 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-neutral-800"
            disabled={testMutation.isPending}
            onClick={() => {
              setTestState(null)
              testMutation.mutate()
            }}
            type="button"
          >
            {testMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plug className="h-4 w-4" aria-hidden="true" />
            )}
            Test Connection
          </button>

          {testState ? (
            <p
              className={
                testState.ok
                  ? 'mt-3 flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-300'
                  : 'mt-3 flex items-start gap-2 text-sm text-red-700 dark:text-red-300'
              }
              role="status"
            >
              {testState.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              {testState.message}
            </p>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Optional, but it catches a wrong key or a project missing the district schema before the
              row is saved.
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-neutral-700 dark:text-slate-200 dark:hover:bg-neutral-900"
            disabled={createMutation.isPending}
            onClick={closeAndReset}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-80"
            disabled={createMutation.isPending}
            type="submit"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            Add Water District
          </button>
        </div>
      </form>
    </div>
  )
}
