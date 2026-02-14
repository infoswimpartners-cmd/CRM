export default function DashboardLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <div className="h-8 w-48 bg-slate-200 rounded-lg"></div>
                    <div className="h-4 w-32 bg-slate-200 rounded-lg"></div>
                </div>
                <div className="h-10 w-40 bg-slate-200 rounded-lg"></div>
            </div>

            {/* KPI Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 h-40 border border-slate-100">
                        <div className="h-4 w-24 bg-slate-200 rounded mb-4"></div>
                        <div className="h-10 w-32 bg-slate-200 rounded"></div>
                    </div>
                ))}
            </div>

            {/* Main Content Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-2xl h-[500px] border border-slate-100"></div>
                <div className="lg:col-span-1 bg-white rounded-2xl h-[500px] border border-slate-100"></div>
            </div>
        </div>
    )
}
