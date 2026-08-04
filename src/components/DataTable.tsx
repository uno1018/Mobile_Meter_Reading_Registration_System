import { zodResolver } from '@hookform/resolvers/zod'
import {
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { InstallationRequest } from '../types'
import { cn } from '../utils/cn'
import { formatDateTime } from '../utils/date'
import StatusBadge from './StatusBadge'
import { TableSkeleton } from './LoadingSkeleton'

const requestTableFeatures = tableFeatures({
  paginatedRowModel: createPaginatedRowModel(),
  rowPaginationFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
})

const columnHelper = createColumnHelper<typeof requestTableFeatures, InstallationRequest>()

const searchSchema = z.object({
  query: z.string().max(120),
})

type SearchValues = z.infer<typeof searchSchema>

type DataTableProps = {
  actionPendingId?: number | null
  canMutate: boolean
  data: InstallationRequest[]
  isLoading?: boolean
  isRefreshing?: boolean
  onApprove: (request: InstallationRequest) => void
  onDeny: (request: InstallationRequest) => void
  onRefresh: () => void
  onViewDetails: (request: InstallationRequest) => void
}

const emptyRequests: InstallationRequest[] = []

export default function DataTable({
  actionPendingId = null,
  canMutate,
  data,
  isLoading = false,
  isRefreshing = false,
  onApprove,
  onDeny,
  onRefresh,
  onViewDetails,
}: DataTableProps) {
  const [openActionId, setOpenActionId] = useState<number | null>(null)
  const { register, watch } = useForm<SearchValues>({
    defaultValues: {
      query: '',
    },
    resolver: zodResolver(searchSchema),
  })
  const query = watch('query')

  const filteredData = useMemo(() => {
    const parsedSearch = searchSchema.safeParse({ query })
    const searchTerm = parsedSearch.success ? parsedSearch.data.query.trim().toLowerCase() : ''
    const sourceData = data ?? emptyRequests

    if (!searchTerm) {
      return sourceData
    }

    return sourceData.filter((request) => {
      const searchableText = [
        request.device_id,
        request.manufacturer,
        request.device_model,
        request.registration_status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return searchableText.includes(searchTerm)
    })
  }, [data, query])

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor('id', {
          cell: ({ getValue }) => <span className="font-mono text-xs">{getValue()}</span>,
          header: 'ID',
        }),
        columnHelper.accessor('device_id', {
          cell: ({ getValue }) => <span className="font-medium">{getValue() || '-'}</span>,
          header: 'Device ID',
          sortUndefined: 'last',
        }),
        columnHelper.accessor('manufacturer', {
          cell: ({ getValue }) => getValue() || '-',
          header: 'Manufacturer',
          sortUndefined: 'last',
        }),
        columnHelper.accessor('device_model', {
          cell: ({ getValue }) => getValue() || '-',
          header: 'Model',
          sortUndefined: 'last',
        }),
        columnHelper.accessor('os_version', {
          cell: ({ getValue }) => getValue() || '-',
          header: 'Android Version',
          sortUndefined: 'last',
        }),
        columnHelper.accessor('sdk_int', {
          cell: ({ getValue }) => getValue() ?? '-',
          header: 'SDK',
          sortUndefined: 'last',
        }),
        columnHelper.accessor('app_version', {
          cell: ({ getValue }) => getValue() || '-',
          header: 'App Version',
          sortUndefined: 'last',
        }),
        columnHelper.accessor('installed_at', {
          cell: ({ getValue }) => formatDateTime(getValue()),
          header: 'Installed Date',
          sortUndefined: 'last',
        }),
        columnHelper.accessor('registration_status', {
          cell: ({ getValue }) => <StatusBadge status={getValue()} />,
          header: 'Registration Status',
          sortUndefined: 'last',
        }),
        columnHelper.accessor('updated_at', {
          cell: ({ getValue }) => formatDateTime(getValue()),
          header: 'Updated Date',
          sortUndefined: 'last',
        }),
        columnHelper.display({
          cell: ({ row }) => {
            const request = row.original
            const menuOpen = openActionId === request.id
            const isPending = actionPendingId === request.id

            return (
              <div className="relative flex justify-end">
                <button
                  aria-expanded={menuOpen}
                  aria-label={`Actions for request ${request.id}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-300 dark:hover:bg-neutral-800 dark:hover:text-white"
                  onClick={() => setOpenActionId((current) => (current === request.id ? null : request.id))}
                  type="button"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>

                {menuOpen ? (
                  <div className="absolute right-0 top-10 z-30 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-neutral-800"
                      onClick={() => {
                        setOpenActionId(null)
                        onViewDetails(request)
                      }}
                      type="button"
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      View Details
                    </button>
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-emerald-700 transition hover:bg-emerald-50 disabled:text-slate-400 dark:text-emerald-300 dark:hover:bg-emerald-400/10 dark:disabled:text-slate-500"
                      disabled={!canMutate || isPending}
                      onClick={() => {
                        setOpenActionId(null)
                        onApprove(request)
                      }}
                      type="button"
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      Approve
                    </button>
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-700 transition hover:bg-red-50 disabled:text-slate-400 dark:text-red-300 dark:hover:bg-red-400/10 dark:disabled:text-slate-500"
                      disabled={!canMutate || isPending}
                      onClick={() => {
                        setOpenActionId(null)
                        onDeny(request)
                      }}
                      type="button"
                    >
                      <XCircle className="h-4 w-4" aria-hidden="true" />
                      Deny
                    </button>
                  </div>
                ) : null}
              </div>
            )
          },
          enableSorting: false,
          header: 'Actions',
          id: 'actions',
        }),
      ]),
    [actionPendingId, canMutate, onApprove, onDeny, onViewDetails, openActionId],
  )

  const table = useTable(
    {
      columns,
      data: filteredData,
      features: requestTableFeatures,
      getRowId: (row) => String(row.id),
      initialState: {
        pagination: {
          pageIndex: 0,
          pageSize: 10,
        },
        sorting: [
          {
            desc: true,
            id: 'installed_at',
          },
        ],
      },
    },
    (state) => ({
      pagination: state.pagination,
      sorting: state.sorting,
    }),
  )

  const pagination = table.state.pagination
  const pageCount = table.getPageCount()
  const rowCount = table.getPrePaginatedRowModel().rows.length

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-4 dark:border-neutral-800 lg:flex-row lg:items-center lg:justify-between">
        <form className="relative w-full max-w-xl" onSubmit={(event) => event.preventDefault()}>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-600 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
            maxLength={120}
            placeholder="Search devices, manufacturers, models, or status"
            {...register('query')}
          />
        </form>

        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-70 dark:border-neutral-700 dark:bg-neutral-950 dark:text-slate-200 dark:hover:bg-neutral-800"
          disabled={isRefreshing}
          onClick={onRefresh}
          type="button"
        >
          <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} aria-hidden="true" />
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1120px] w-full border-collapse">
          <thead className="bg-slate-50 text-left dark:bg-neutral-950">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()

                  return (
                    <th
                      className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-neutral-800 dark:text-slate-400"
                      key={header.id}
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          className={cn(
                            'inline-flex items-center gap-1 text-left',
                            canSort && 'hover:text-slate-950 dark:hover:text-white',
                          )}
                          disabled={!canSort}
                          onClick={header.column.getToggleSortingHandler()}
                          type="button"
                        >
                          <table.FlexRender header={header} />
                          {sorted ? (
                            <span aria-hidden="true">{sorted === 'asc' ? '↑' : '↓'}</span>
                          ) : null}
                        </button>
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-4 py-5" colSpan={columns.length}>
                  <TableSkeleton />
                </td>
              </tr>
            ) : table.getPaginatedRowModel().rows.length ? (
              table.getPaginatedRowModel().rows.map((row) => (
                <tr
                  className="border-b border-slate-100 transition hover:bg-slate-50/70 dark:border-neutral-800 dark:hover:bg-neutral-800/60"
                  key={row.id}
                >
                  {row.getAllCells().map((cell) => (
                    <td
                      className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200"
                      key={cell.id}
                    >
                      <table.FlexRender cell={cell} />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400" colSpan={columns.length}>
                  No installation requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Showing {table.getPaginatedRowModel().rows.length} of {rowCount} requests
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
            onChange={(event) => table.setPageSize(Number(event.target.value))}
            value={pagination.pageSize}
          >
            {[10, 25, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Page {pagination.pageIndex + 1} of {Math.max(pageCount, 1)}
          </span>
          <button
            aria-label="First page"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 dark:border-neutral-700 dark:text-slate-300"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.firstPage()}
            type="button"
          >
            <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            aria-label="Previous page"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 dark:border-neutral-700 dark:text-slate-300"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            type="button"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            aria-label="Next page"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 dark:border-neutral-700 dark:text-slate-300"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            type="button"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            aria-label="Last page"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 dark:border-neutral-700 dark:text-slate-300"
            disabled={!table.getCanNextPage()}
            onClick={() => table.lastPage()}
            type="button"
          >
            <ChevronsRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  )
}
