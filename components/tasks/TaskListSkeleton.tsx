'use client'

const GRID = 'minmax(0, 1fr) 96px 30px 78px 78px 86px'

function SkeletonRow({ indent = false }: { indent?: boolean }) {
  return (
    <div className="border-b border-gray-100/60">
      <div
        className="grid items-center h-[35px]"
        style={{ gridTemplateColumns: GRID }}
      >
        <div className={`flex items-center gap-2 ${indent ? 'pl-[50px]' : 'pl-[38px]'}`}>
          <span className="w-[10px] h-[10px] rounded-full bg-gray-200 animate-pulse shrink-0" />
          <span className="h-[10px] bg-gray-200 rounded animate-pulse w-[60%]" />
        </div>
        <div className="flex justify-end pr-2">
          <span className="h-[10px] bg-gray-200 rounded animate-pulse w-[50px]" />
        </div>
        <div className="flex justify-center">
          <span className="w-[7px] h-[7px] rounded-[2px] bg-gray-200 animate-pulse" />
        </div>
        <div className="flex justify-center">
          <span className="h-[10px] bg-gray-200 rounded animate-pulse w-[36px]" />
        </div>
        <div className="flex justify-center">
          <span className="h-[10px] bg-gray-200 rounded animate-pulse w-[40px]" />
        </div>
        <div className="flex justify-end pr-2">
          <span className="h-[10px] bg-gray-200 rounded animate-pulse w-[50px]" />
        </div>
      </div>
    </div>
  )
}

function SkeletonGroup() {
  return (
    <div className="mb-0.5">
      {/* Status header */}
      <div className="flex items-center gap-2 h-[30px] pl-2">
        <span className="w-[10px] h-[10px] bg-gray-200 rounded animate-pulse" />
        <span className="h-[14px] bg-gray-200 rounded animate-pulse w-[70px]" />
        <span className="h-[10px] bg-gray-200 rounded animate-pulse w-[16px]" />
      </div>

      {/* Column headers */}
      <div
        className="grid items-center h-[22px] border-b border-gray-200/50"
        style={{ gridTemplateColumns: GRID }}
      >
        <div className="pl-[60px]">
          <span className="h-[8px] bg-gray-100 rounded animate-pulse w-[30px] block" />
        </div>
        <div />
        <div />
        <div />
        <div />
        <div />
      </div>

      {/* Skeleton rows */}
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </div>
  )
}

export function TaskListSkeleton() {
  return (
    <div className="px-3 py-2">
      <SkeletonGroup />
      <SkeletonGroup />
    </div>
  )
}
