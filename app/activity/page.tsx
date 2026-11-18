import { ActivityLog } from '@/components/ActivityLog'

/** Every call and callback, in order, so the whole flow can be walked through. */
export default function ActivityPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Activity</h1>
      <p className="mt-1 mb-6 text-slate-600">
        Every request, response and callback in the order it happened. Access tokens and the
        client secret are hidden.
      </p>
      <ActivityLog />
    </div>
  )
}
