'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth-store'
import {
  PiggyBank,
  CreditCard,
  TrendingUp,
  Target,
  DollarSign,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuthStore()

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6" data-testid="dashboard">
          {/* Welcome Section */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, <span data-testid="user-name">{user?.firstName}</span>!
            </h1>
            <p className="text-gray-600 mt-2">
              Here&apos;s an overview of your financial dashboard
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card data-testid="current-balance">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$12,345.67</div>
                <p className="text-xs text-muted-foreground">
                  <ArrowUpRight className="inline h-3 w-3 mr-1" />
                  +2.5% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Spending</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$2,456.78</div>
                <p className="text-xs text-muted-foreground">
                  <ArrowDownRight className="inline h-3 w-3 mr-1" />
                  -4.2% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Savings Goal</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">68%</div>
                <p className="text-xs text-muted-foreground">
                  $6,800 of $10,000 goal
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Investments</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$8,901.23</div>
                <p className="text-xs text-muted-foreground">
                  <ArrowUpRight className="inline h-3 w-3 mr-1" />
                  +12.3% from last month
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card data-testid="recent-transactions">
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>
                  Your latest financial activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'Grocery Store', amount: '-$67.45', date: 'Today', category: 'Food' },
                    { name: 'Salary Deposit', amount: '+$3,200.00', date: 'Yesterday', category: 'Income' },
                    { name: 'Netflix', amount: '-$15.99', date: '2 days ago', category: 'Entertainment' },
                    { name: 'Gas Station', amount: '-$45.20', date: '3 days ago', category: 'Transportation' },
                  ].map((transaction, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                          {transaction.amount.startsWith('+') ? (
                            <ArrowUpRight className="h-4 w-4 text-green-600" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{transaction.name}</p>
                          <p className="text-xs text-gray-500">{transaction.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          transaction.amount.startsWith('+') ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.amount}
                        </p>
                        <p className="text-xs text-gray-500">{transaction.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="category-breakdown">
              <CardHeader>
                <CardTitle>Budget Overview</CardTitle>
                <CardDescription>
                  How you&apos;re doing this month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { category: 'Food & Dining', spent: 567, budget: 800, color: 'bg-blue-500' },
                    { category: 'Transportation', spent: 245, budget: 300, color: 'bg-green-500' },
                    { category: 'Entertainment', spent: 180, budget: 200, color: 'bg-yellow-500' },
                    { category: 'Shopping', spent: 320, budget: 400, color: 'bg-purple-500' },
                  ].map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{item.category}</span>
                        <span className="text-gray-500">
                          ${item.spent} / ${item.budget}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${item.color}`}
                          style={{ width: `${(item.spent / item.budget) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Manage your finances quickly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <button className="flex flex-col items-center p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                  <PiggyBank className="h-8 w-8 text-blue-600 mb-2" />
                  <span className="text-sm font-medium">Add Account</span>
                </button>
                <button className="flex flex-col items-center p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                  <CreditCard className="h-8 w-8 text-green-600 mb-2" />
                  <span className="text-sm font-medium">Add Transaction</span>
                </button>
                <button className="flex flex-col items-center p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                  <Target className="h-8 w-8 text-purple-600 mb-2" />
                  <span className="text-sm font-medium">Set Budget</span>
                </button>
                <button className="flex flex-col items-center p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                  <Calendar className="h-8 w-8 text-orange-600 mb-2" />
                  <span className="text-sm font-medium">Schedule Payment</span>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}