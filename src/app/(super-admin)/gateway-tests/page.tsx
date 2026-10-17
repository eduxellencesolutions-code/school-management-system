import GatewayTestPanel from '@/components/super-admin/GatewayTestPanel'

export default function GatewayTestsPage() {
  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <h1 className="page-title">Gateway Tests</h1>
        <p className="page-subtitle">
          Verify that each payment gateway is correctly wired end-to-end. Each test charges a small real amount on live keys — use test keys, or refund the charge afterwards.
        </p>
      </div>
      <GatewayTestPanel />
    </div>
  )
}