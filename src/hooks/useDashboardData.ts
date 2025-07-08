import { useState, useEffect, useCallback } from 'react';
import { CustomerService } from '../services/customerService';
import { RewardService } from '../services/rewardService';
import { useAuth } from '../contexts/AuthContext';

interface DashboardStats {
  name: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  description: string;
}

interface RecentActivity {
  id: string;
  customer: string;
  avatar: string;
  action: string;
  points: string;
  time: string;
  tier: 'bronze' | 'silver' | 'gold';
  reward?: string;
}

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'info';
  title: string;
  message: string;
  time: string;
}

export const useDashboardData = (timeRange: string = '7d') => {
  const [stats, setStats] = useState<DashboardStats[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [customerData, setCustomerData] = useState<any[]>([]);
  const [rewardDistribution, setRewardDistribution] = useState<any[]>([]);
  const [weeklyActivity, setWeeklyActivity] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, restaurant } = useAuth();

  const currentUser = {
    name: user?.user_metadata?.first_name && user?.user_metadata?.last_name 
      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
      : user?.email?.split('@')[0] || 'User',
    role: 'Restaurant Owner',
    avatar: user?.user_metadata?.first_name?.[0]?.toUpperCase() || 'U'
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // If no restaurant, show empty state
      if (!restaurant) {
        console.log('No restaurant found, showing empty state');
        setStats([
          {
            name: 'Total Customers',
            value: '0',
            change: '+0',
            trend: 'up',
            description: 'No customers yet'
          },
          {
            name: 'Points Issued',
            value: '0',
            change: '+0%',
            trend: 'up',
            description: 'vs last month'
          },
          {
            name: 'Rewards Claimed',
            value: '0',
            change: '+0%',
            trend: 'up',
            description: 'vs last month'
          },
          {
            name: 'Revenue Impact',
            value: '$0',
            change: '+0%',
            trend: 'up',
            description: 'Total customer value'
          }
        ]);
        
        setRecentActivity([]);
        setCustomerData([]);
        setRewardDistribution([]);
        setWeeklyActivity([]);
        setNotifications([
          {
            id: '1',
            type: 'info',
            title: 'Welcome to TableLoyalty!',
            message: 'Start by creating your first customer or reward',
            time: 'Just now'
          }
        ]);
        
        setLoading(false);
        return;
      }

      // Fetch real customer and reward stats with increased timeout
      const [customerStats, rewardStats] = await Promise.all([
        Promise.race([
          CustomerService.getCustomerStats(restaurant.id),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Customer stats timeout')), 15000) // Increased timeout
          )
        ]),
        Promise.race([
          RewardService.getRewardStats(restaurant.id),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Reward stats timeout')), 15000) // Increased timeout
          )
        ])
      ]);

      // Generate real stats from database
      const dashboardStats: DashboardStats[] = [
        {
          name: 'Total Customers',
          value: (customerStats as any).totalCustomers.toString(),
          change: `+${(customerStats as any).newThisMonth}`,
          trend: 'up',
          description: 'New this month'
        },
        {
          name: 'Points Issued',
          value: (customerStats as any).totalPoints.toLocaleString(),
          change: '+0%',
          trend: 'up',
          description: 'vs last month'
        },
        {
          name: 'Rewards Claimed',
          value: (rewardStats as any).totalRedemptions.toString(),
          change: '+0%',
          trend: 'up',
          description: 'vs last month'
        },
        {
          name: 'Revenue Impact',
          value: `$${((customerStats as any).averageSpent * (customerStats as any).totalCustomers).toFixed(0)}`,
          change: '+0%',
          trend: 'up',
          description: 'Total customer value'
        }
      ];

      setStats(dashboardStats);

      // Set empty arrays for charts since we don't have real time-series data yet
      setCustomerData([]);
      setRewardDistribution([]);
      setWeeklyActivity([]);
      setRecentActivity([]);
      setNotifications([]);

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [restaurant]);

  const refreshData = useCallback(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    // Only fetch data if we have a user (restaurant can be null)
    if (user) {
      fetchDashboardData();
    }
  }, [user, restaurant, timeRange, fetchDashboardData]);

  return {
    stats,
    recentActivity,
    customerData,
    rewardDistribution,
    weeklyActivity,
    notifications,
    currentUser,
    loading,
    error,
    refreshData
  };
};