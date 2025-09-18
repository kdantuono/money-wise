import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const DashboardScreen = ({ navigation }: any) => {
  const overviewData = {
    totalIncome: 5420.00,
    totalExpenses: 3240.50,
    netIncome: 2179.50,
    transactionCount: 42,
  };

  const recentTransactions = [
    {
      id: '1',
      description: 'Salary',
      amount: 5420.00,
      type: 'income',
      category: 'Salary',
      date: 'Today',
    },
    {
      id: '2',
      description: 'Groceries',
      amount: 120.50,
      type: 'expense',
      category: 'Food',
      date: 'Yesterday',
    },
    {
      id: '3',
      description: 'Gas Station',
      amount: 45.20,
      type: 'expense',
      category: 'Transportation',
      date: '2 days ago',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good Morning!</Text>
            <Text style={styles.userName}>Demo User</Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <Ionicons name="person-circle-outline" size={32} color="#2563eb" />
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <LinearGradient
          colors={['#2563eb', '#1d4ed8']}
          style={styles.balanceCard}
        >
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceAmount}>
            ${overviewData.netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
          <View style={styles.balanceActions}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="add-circle-outline" size={20} color="white" />
              <Text style={styles.actionText}>Add Money</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="send-outline" size={20} color="white" />
              <Text style={styles.actionText}>Send Money</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Overview Cards */}
        <View style={styles.overviewContainer}>
          <View style={styles.overviewGrid}>
            <View style={[styles.overviewCard, styles.incomeCard]}>
              <Ionicons name="trending-up" size={24} color="#10b981" />
              <Text style={styles.overviewAmount}>
                ${overviewData.totalIncome.toLocaleString()}
              </Text>
              <Text style={styles.overviewLabel}>Income</Text>
            </View>
            <View style={[styles.overviewCard, styles.expenseCard]}>
              <Ionicons name="trending-down" size={24} color="#ef4444" />
              <Text style={styles.overviewAmount}>
                ${overviewData.totalExpenses.toLocaleString()}
              </Text>
              <Text style={styles.overviewLabel}>Expenses</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.quickActionItem}
              onPress={() => navigation.navigate('Transactions')}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="add" size={24} color="#2563eb" />
              </View>
              <Text style={styles.quickActionText}>Add Transaction</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionItem}
              onPress={() => navigation.navigate('Budgets')}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="wallet" size={24} color="#2563eb" />
              </View>
              <Text style={styles.quickActionText}>Create Budget</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionItem}
              onPress={() => navigation.navigate('Analytics')}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="stats-chart" size={24} color="#2563eb" />
              </View>
              <Text style={styles.quickActionText}>View Reports</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionItem}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="scan" size={24} color="#2563eb" />
              </View>
              <Text style={styles.quickActionText}>Scan Receipt</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.transactionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {recentTransactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionItem}>
              <View style={styles.transactionLeft}>
                <View style={[
                  styles.transactionIcon,
                  transaction.type === 'income' ? styles.incomeIcon : styles.expenseIcon
                ]}>
                  <Ionicons 
                    name={transaction.type === 'income' ? 'arrow-down' : 'arrow-up'} 
                    size={16} 
                    color="white" 
                  />
                </View>
                <View style={styles.transactionDetails}>
                  <Text style={styles.transactionDescription}>
                    {transaction.description}
                  </Text>
                  <Text style={styles.transactionCategory}>
                    {transaction.category} • {transaction.date}
                  </Text>
                </View>
              </View>
              <Text style={[
                styles.transactionAmount,
                transaction.type === 'income' ? styles.incomeAmount : styles.expenseAmount
              ]}>
                {transaction.type === 'income' ? '+' : '-'}$
                {transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  greeting: {
    fontSize: 14,
    color: '#64748b',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  profileButton: {
    padding: 8,
  },
  balanceCard: {
    marginHorizontal: 20,
    marginVertical: 20,
    padding: 24,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 8,
  },
  balanceAmount: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  balanceActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flex: 0.45,
    justifyContent: 'center',
  },
  actionText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  overviewContainer: {
    paddingHorizontal: 20,
  },
  overviewGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  overviewCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    flex: 0.48,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  incomeCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  expenseCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  overviewAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 8,
  },
  overviewLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  quickActions: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionItem: {
    backgroundColor: 'white',
    width: (width - 60) / 2,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    textAlign: 'center',
  },
  transactionsSection: {
    paddingHorizontal: 20,
    marginTop: 32,
    paddingBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  incomeIcon: {
    backgroundColor: '#10b981',
  },
  expenseIcon: {
    backgroundColor: '#ef4444',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  transactionCategory: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  incomeAmount: {
    color: '#10b981',
  },
  expenseAmount: {
    color: '#1e293b',
  },
});

export default DashboardScreen;