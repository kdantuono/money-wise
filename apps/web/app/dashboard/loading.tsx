/**
 * Dashboard Loading State
 *
 * Next.js automatically shows this during page transitions within /dashboard/*.
 * Uses Zecca-branded animation for premium feel.
 */

export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="flex justify-center mb-5">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-pulse">
              <span className="text-white text-[20px] font-bold">Z</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-card border-2 border-background flex items-center justify-center">
              <div className="w-2.5 h-2.5 animate-spin rounded-full border border-border border-t-primary" />
            </div>
          </div>
        </div>
        <p className="text-[13px] text-muted-foreground animate-pulse">Caricamento...</p>
      </div>
    </div>
  );
}
