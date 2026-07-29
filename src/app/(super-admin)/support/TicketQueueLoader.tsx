'use client'

import dynamic from 'next/dynamic'

const TicketQueue = dynamic(
  () => import('@/components/super-admin/TicketQueue'),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    ),
  }
)

export default TicketQueue