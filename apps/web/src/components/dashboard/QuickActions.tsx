'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QuickAddTransaction } from '@/components/transactions/QuickAddTransaction';

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


interface QuickActionLinkProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  href: string;
  variant?: 'default' | 'secondary' | 'outline';
}

interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  variant?: 'default' | 'secondary' | 'outline';
}

const variantStyles = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
} as const;

function QuickActionLink({
  icon,
  label,
  description,
  href,
  variant = 'default',
}: QuickActionLinkProps) {
  return (
    <Link
      href={href}
      className={`block w-full h-auto py-4 px-4 rounded-md flex items-center gap-3 justify-start transition-colors ${variantStyles[variant]}`}
    >
      <div className="flex-shrink-0" aria-hidden="true">{icon}</div>
      <div className="text-left">
        <p className="font-medium">{label}</p>
        <p className="text-xs opacity-80">{description}</p>
      </div>
    </Link>
  );
}

function QuickActionButton({
  icon,
  label,
  description,
  onClick,
  variant = 'default',
}: QuickActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full h-auto py-4 px-4 rounded-md flex items-center gap-3 justify-start transition-colors ${variantStyles[variant]}`}
    >
      <div className="flex-shrink-0" aria-hidden="true">{icon}</div>
      <div className="text-left">
        <p className="font-medium">{label}</p>
        <p className="text-xs opacity-80">{description}</p>
      </div>
    </button>
  );
}

function CalendarIcon() {
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
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}

export function QuickActions() {
  return (
    <Card className="min-h-[340px] flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QuickActionLink
            icon={<LinkIcon />}
            label="Add Account"
            description="Connect bank account"
            href="/banking"
          />
          <QuickAddTransaction
            trigger={({ onClick }) => (
              <QuickActionButton
                icon={<PlusIcon />}
                label="Add Transaction"
                description="Record income or expense"
                onClick={onClick}
                variant="secondary"
              />
            )}
          />
          <QuickActionLink
            icon={<TargetIcon />}
            label="Set Budget"
            description="Set spending limits"
            href="/budgets?action=new"
            variant="outline"
          />
          <QuickActionLink
            icon={<CalendarIcon />}
            label="Schedule Payment"
            description="Plan future payments"
            href="/payments?action=schedule"
            variant="outline"
          />
        </div>
      </CardContent>
    </Card>
  );
}
