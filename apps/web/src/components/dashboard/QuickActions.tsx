'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Icons as inline SVG
function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  href: string;
  variant?: 'default' | 'secondary' | 'outline';
}

function QuickActionButton({
  icon,
  label,
  description,
  href,
  variant = 'default',
}: QuickActionButtonProps) {
  return (
    <a href={href} className="block">
      <Button
        variant={variant}
        className="w-full h-auto py-4 px-4 flex items-center gap-3 justify-start"
      >
        <div className="flex-shrink-0">{icon}</div>
        <div className="text-left">
          <p className="font-medium">{label}</p>
          <p className="text-xs opacity-80">{description}</p>
        </div>
      </Button>
    </a>
  );
}

export function QuickActions() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QuickActionButton
            icon={<PlusIcon />}
            label="Add Transaction"
            description="Record income or expense"
            href="/transactions?action=new"
          />
          <QuickActionButton
            icon={<TargetIcon />}
            label="New Budget"
            description="Set spending limits"
            href="/budgets?action=new"
            variant="secondary"
          />
          <QuickActionButton
            icon={<LinkIcon />}
            label="Link Account"
            description="Connect bank account"
            href="/banking"
            variant="outline"
          />
          <QuickActionButton
            icon={<DownloadIcon />}
            label="Export Report"
            description="Download summary"
            href="/reports?action=export"
            variant="outline"
          />
        </div>
      </CardContent>
    </Card>
  );
}
