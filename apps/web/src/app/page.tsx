'use client';

import { SearchIcon, Plus, TrendingUp, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CreditCards } from './components/credit-cards';
import { WeeklyActivity } from './components/weekly-activity';
import { QuickTransfer } from './components/quick-transfer';
import { BalanceHistory } from './components/balance-history';
import { RecentTransactions } from './components/recent-transactions';
import { ExpenseStatistics } from './components/expense-statistics';
import DashboardWrapper from './DashboardWrapper';

// Animation variants for staggered children
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

export default function DashboardPage() {
  return (
    <DashboardWrapper>
      <motion.div
        className='min-h-screen bg-neutral-50 dark:bg-neutral-950'
        initial='hidden'
        animate='visible'
        variants={containerVariants}
      >
        {/* Mobile Header with Enhanced Search */}
        <motion.div
          className='block lg:hidden bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 p-4 sticky top-0 z-sticky'
          variants={itemVariants}
        >
          <div className='flex items-center justify-between mb-4'>
            <div>
              <h1 className='text-financial-heading'>Dashboard</h1>
              <p className='text-financial-caption'>
                Welcome back, manage your finances
              </p>
            </div>
            <Button
              size='sm'
              className='rounded-xl bg-primary-500 hover:bg-primary-600 text-white shadow-sm'
              aria-label='Add new transaction'
            >
              <Plus className='h-4 w-4' />
            </Button>
          </div>

          <div className='relative'>
            <SearchIcon className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400' />
            <Input
              className='w-full pl-9 pr-4 py-3 bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200'
              placeholder='Search transactions, cards...'
              aria-label='Search dashboard'
            />
          </div>
        </motion.div>

        {/* Main Content Container */}
        <div className='p-4 lg:p-8 space-y-6 lg:space-y-8'>
          {/* Quick Stats Row - Mobile First - Money-Centric Psychology */}
          <motion.div
            className='grid grid-cols-2 lg:hidden gap-4 mb-6'
            variants={itemVariants}
          >
            <div className='bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-4 text-white shadow-lg'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-blue-100 text-xs font-medium'>
                    Total Wealth
                  </p>
                  <p className='text-xl font-bold'>$12,345.67</p>
                  <p className='text-blue-200 text-xs mt-1'>
                    ↗ Growing Strong
                  </p>
                </div>
                <TrendingUp className='h-6 w-6 text-green-400' />
              </div>
            </div>
            <div className='bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-green-200 dark:border-green-800 shadow-lg'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-neutral-600 text-xs font-medium'>
                    Monthly Growth
                  </p>
                  <p className='text-lg font-bold text-green-600'>+$2,340</p>
                  <p className='text-green-500 text-xs mt-1'>
                    🎯 Goal Progress
                  </p>
                </div>
                <ArrowUpRight className='h-6 w-6 text-green-500' />
              </div>
            </div>
          </motion.div>

          {/* Cards and Recent Transactions Row */}
          <motion.div
            className='grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-6 gap-6'
            variants={itemVariants}
          >
            {/* My Cards Section - Trust & Security Focus */}
            <div className='lg:col-span-2 xl:col-span-4 space-y-4'>
              <div className='flex items-center justify-between'>
                <h2 className='text-financial-heading text-blue-900 font-semibold'>
                  💳 My Cards
                </h2>
                <Button
                  variant='ghost'
                  size='sm'
                  className='text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg font-medium'
                >
                  Manage All
                </Button>
              </div>
              <CreditCards />
            </div>

            {/* Recent Transactions Section - Money Flow Tracking */}
            <div className='lg:col-span-1 xl:col-span-2 space-y-4'>
              <div className='flex items-center justify-between'>
                <h2 className='text-financial-heading text-slate-800 font-semibold'>
                  📊 Money Flow
                </h2>
                <Button
                  variant='ghost'
                  size='sm'
                  className='text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950 rounded-lg font-medium lg:hidden'
                >
                  Track All
                </Button>
              </div>
              <RecentTransactions />
            </div>
          </motion.div>

          {/* Analytics Row - Responsive Layout */}
          <motion.div
            className='grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-6 gap-6'
            variants={itemVariants}
          >
            {/* Weekly Activity - Growth Visualization */}
            <div className='lg:col-span-2 xl:col-span-4 space-y-4'>
              <div className='flex items-center justify-between'>
                <h2 className='text-financial-heading text-blue-900 font-semibold'>
                  📈 Wealth Growth
                </h2>
                <div className='flex items-center space-x-2 text-financial-caption'>
                  <span className='w-3 h-3 bg-green-500 rounded-full'></span>
                  <span>Income</span>
                  <span className='w-3 h-3 bg-blue-500 rounded-full ml-4'></span>
                  <span>Expenses</span>
                </div>
              </div>
              <WeeklyActivity />
            </div>

            {/* Expense Statistics - Smart Spending */}
            <div className='lg:col-span-1 xl:col-span-2 space-y-4'>
              <h2 className='text-financial-heading text-amber-800 font-semibold'>
                💰 Smart Spending
              </h2>
              <ExpenseStatistics />
            </div>
          </motion.div>

          {/* Transfer and Balance History Row */}
          <motion.div
            className='grid grid-cols-1 lg:grid-cols-7 gap-6'
            variants={itemVariants}
          >
            {/* Quick Transfer - Secure Money Movement */}
            <div className='lg:col-span-3 space-y-4'>
              <h2 className='text-financial-heading text-green-800 font-semibold'>
                🚀 Quick Transfer
              </h2>
              <QuickTransfer />
            </div>

            {/* Balance History - Financial Journey */}
            <div className='lg:col-span-4 space-y-4'>
              <div className='flex items-center justify-between'>
                <h2 className='text-financial-heading text-purple-800 font-semibold'>
                  🎯 Financial Journey
                </h2>
                <select className='text-sm text-purple-600 bg-purple-50 border border-purple-200 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer'>
                  <option>Last 6 months</option>
                  <option>Last year</option>
                  <option>All time</option>
                </select>
              </div>
              <BalanceHistory />
            </div>
          </motion.div>

          {/* Mobile Bottom Navigation Spacing */}
          <div className='h-20 lg:hidden' aria-hidden='true' />
        </div>
      </motion.div>
    </DashboardWrapper>
  );
}
