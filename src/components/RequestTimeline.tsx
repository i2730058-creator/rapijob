import type { RequestEvent, RequestStatus, ServiceRequest } from '@/types';
import { STATUS_FLOW, STATUS_META } from '@/lib/constants';
import { cn, formatDateTime } from '@/lib/utils';

interface RequestTimelineProps {
  request: ServiceRequest;
  compact?: boolean;
}

export function RequestTimeline({ request, compact = false }: RequestTimelineProps) {
  const canceled = request.status === 'cancelada';
  const flow: RequestStatus[] = canceled ? ['pendiente', 'cancelada'] : STATUS_FLOW;
  const historyMap = new Map<string, RequestEvent>();
  request.history.forEach((event) => {
    if (!historyMap.has(event.status)) historyMap.set(event.status, event);
  });
  const currentIndex = flow.indexOf(request.status);

  return (
    <ol className={cn('relative space-y-0', compact ? 'text-xs' : 'text-sm')}>
      {flow.map((status, index) => {
        const event = historyMap.get(status);
        const isDone = index < currentIndex || status === 'completada' || canceled;
        const isCurrent = index === currentIndex;
        const active = isDone || isCurrent;
        const meta = STATUS_META[status];
        const isLast = index === flow.length - 1;
        const isCancelledStep = status === 'cancelada';

        return (
          <li key={status} className="relative flex gap-3.5 pb-5 last:pb-0">
            {!isLast && (
              <span
                className={cn(
                  'absolute left-[11px] top-6 h-[calc(100%-12px)] w-0.5 rounded-full',
                  isDone && !isCancelledStep ? 'bg-brand-500' : 'bg-slate-200',
                )}
                aria-hidden="true"
              />
            )}
            <span
              className={cn(
                'relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition',
                isCancelledStep && canceled
                  ? 'border-rose-500 bg-rose-500'
                  : active
                    ? isCurrent
                      ? 'border-brand-500 bg-white'
                      : 'border-brand-500 bg-brand-500'
                    : 'border-slate-200 bg-white',
              )}
            >
              {active && !(isCurrent && !isCancelledStep) && !isCancelledStep && (
                <svg viewBox="0 0 12 12" className="h-3 w-3 text-white" fill="none" aria-hidden="true">
                  <path
                    d="M2 6.2 4.6 8.8 10 3.4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              {isCurrent && (
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    isCancelledStep ? 'bg-white' : isDone ? 'bg-white' : 'bg-brand-500',
                  )}
                >
                  {!isDone && !isCancelledStep && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-brand-400 opacity-60" />
                  )}
                </span>
              )}
              {isCancelledStep && !isCurrent && (
                <span className="h-2 w-2 rounded-full bg-rose-500" />
              )}
            </span>
            <div className={cn('min-w-0 flex-1', !active && 'opacity-55')}>
              <div className="flex flex-wrap items-center justify-between gap-1">
                <p
                  className={cn(
                    'font-semibold',
                    isCancelledStep && canceled ? 'text-rose-600' : isCurrent ? 'text-brand-700' : 'text-ink',
                  )}
                >
                  {meta.label}
                </p>
                {event && (
                  <time className="text-[10px] font-medium text-slate-500">
                    {formatDateTime(event.at)}
                  </time>
                )}
              </div>
              {!compact && (
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                  {event?.note || meta.description}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
