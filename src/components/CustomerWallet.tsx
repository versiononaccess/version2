import React, { useState, useEffect } from 'react';
import { 
  ChefHat, Phone, User, CheckCircle2, ArrowRight, 
  Gift, Crown, Sparkles, Timer, X,
  Loader2, TrendingUp, Award, Heart, Utensils,
  Coffee, CreditCard, MapPin, Clock, Zap, Plus,
  Minus, QrCode, Share2, Copy, Check, AlertCircle, Percent,
  Star
} from 'lucide-react';
import { CustomerService } from '../services/customerService';
import { RewardService } from '../services/rewardService';
import { useAuth } from '../contexts/AuthContext';
import OnboardingFlow from './OnboardingFlow';
import RedemptionModal from './RedemptionModal';

interface CustomerWalletProps {
  customerId?: string;
  onClose: () => void;
}

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  total_points: number;
  lifetime_points: number;
  current_tier: 'bronze' | 'silver' | 'gold';
  tier_progress: number;
  visit_count: number;
  total_spent: number;
  last_visit?: string;
  created_at: string;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  points_required: number;
  category: string;
  image_url?: string;
  min_tier: 'bronze' | 'silver' | 'gold';
  is_active: boolean;
}

interface Transaction {
  id: string;
  type: 'purchase' | 'bonus' | 'referral' | 'signup' | 'redemption';
  points: number;
  amount_spent?: number;
  description?: string;
  created_at: string;
  reward_id?: string;
}

const CustomerWallet: React.FC<CustomerWalletProps> = ({ customerId, onClose }) => {
  const { user, restaurant } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'wallet' | 'rewards' | 'history'>('wallet');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [showRedemptionModal, setShowRedemptionModal] = useState(false);

  const fetchCustomerData = async (customerId: string) => {
    if (!restaurant || loading) return;
    
    try {
      setLoading(true);
      console.log('🔄 Fetching customer data for:', customerId, 'restaurant:', restaurant.id);
      
      // Fetch customer details
      const customerData = await CustomerService.getCustomer(restaurant.id, customerId);
      console.log('📊 Starting data fetch for customer:', customerId);
      
      if (customerData) {
        setCustomer(customerData);
        
        // Fetch rewards and transactions in parallel
        const [rewardsData, transactionsData] = await Promise.all([
          RewardService.getAvailableRewards(restaurant.id, customerData.id),
          CustomerService.getCustomerTransactions(restaurant.id, customerData.id)
        ]);
        
        setRewards(rewardsData);
        setTransactions(transactionsData);
      }
    } catch (error) {
      console.error('❌ Error fetching customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customer?.id && restaurant?.id && !loading) {
      fetchCustomerData(customer.id);
    }
  }, [customer?.id, restaurant?.id]);

  const handleOnboardingComplete = async (userData: any) => {
    if (!restaurant) return;

    try {
      setLoading(true);
      
      if (userData.isExisting && userData.customer) {
        // Existing customer
        setCustomer(userData.customer);
        setShowOnboarding(false);
      } else {
        // Create new customer
        const newCustomer = await CustomerService.createCustomer(restaurant.id, {
          first_name: userData.name.split(' ')[0],
          last_name: userData.name.split(' ').slice(1).join(' ') || userData.name.split(' ')[0],
          email: userData.email,
          phone: userData.phone,
          date_of_birth: userData.birthDate || null
        });
        
        setCustomer(newCustomer);
        setShowOnboarding(false);
      }
    } catch (error: any) {
      console.error('❌ Error in onboarding:', error);
      if (error.message?.includes('already exists')) {
        // Handle existing customer case
        const existingCustomer = await CustomerService.getCustomerByEmail(restaurant.id, userData.email);
        if (existingCustomer) {
          setCustomer(existingCustomer);
          setShowOnboarding(false);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRedemption = async (reward: Reward) => {
    if (!customer || !restaurant) return;

    try {
      setLoading(true);
      const redemption = await RewardService.redeemReward(restaurant.id, customer.id, reward.id);
      console.log('✅ Redemption successful:', redemption);
      
      // Refresh customer data to get updated points
      await fetchCustomerData(customer.id);
      
      // Close the modal after successful redemption
      setShowRedemptionModal(false);
      setSelectedReward(null);
    } catch (error) {
      console.error('❌ Redemption failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'text-amber-600 bg-amber-50';
      case 'silver': return 'text-gray-600 bg-gray-50';
      case 'gold': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'bronze': return Award;
      case 'silver': return Crown;
      case 'gold': return Sparkles;
      default: return Award;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase': return CreditCard;
      case 'bonus': return Gift;
      case 'referral': return Heart;
      case 'signup': return User;
      case 'redemption': return Gift;
      default: return CreditCard;
    }
  };

  const getTransactionColor = (points: number) => {
    return points > 0 ? 'text-green-600' : 'text-red-600';
  };

  const formatPoints = (points: number) => {
    return points > 0 ? `+${points}` : `${points}`;
  };

  if (showOnboarding) {
    return (
      <OnboardingFlow
        restaurantId={restaurant?.id || ''}
        onComplete={handleOnboardingComplete}
        onClose={onClose}
      />
    );
  }

  if (!customer && !showOnboarding) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ChefHat className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h2>
            <p className="text-gray-600 mb-6">Join our loyalty program to start earning rewards</p>
            <button
              onClick={() => setShowOnboarding(true)}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !customer) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading your wallet...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!customer) return null;

  const TierIcon = getTierIcon(customer.current_tier);
  const recentTransactions = transactions.slice(0, 3);

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <ChefHat className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg">{restaurant?.name}</h2>
                <p className="text-white/80 text-sm">Loyalty Wallet</p>
              </div>
            </div>

            {/* Customer Info */}
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {customer.first_name.charAt(0)}{customer.last_name.charAt(0)}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{customer.first_name} {customer.last_name}</h3>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTierColor(customer.current_tier)}`}>
                    <TierIcon className="w-3 h-3 inline mr-1" />
                    {customer.current_tier.charAt(0).toUpperCase() + customer.current_tier.slice(1)}
                  </span>
                  <span className="text-white/80 text-sm">{customer.visit_count} visits</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'wallet' && (
              <div className="p-6">
                {/* Points Display - More Prominent */}
                <div className="text-center mb-6">
                  <p className="text-gray-600 text-sm mb-2">Available Points</p>
                  <div className="relative">
                    <p className="text-gray-900 font-bold text-4xl mb-1">{customer.total_points.toLocaleString()}</p>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                      <Star className="w-3 h-3 text-white fill-current" />
                    </div>
                  </div>
                </div>

                {/* Member Since */}
                <div className="text-center mb-6">
                  <p className="text-gray-500 text-sm">Member since {formatDate(customer.created_at)}</p>
                </div>

                {/* Tier Progress */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Progress to Silver</span>
                    <span className="text-sm text-gray-500">{customer.tier_progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${customer.tier_progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Recent Activity */}
                {recentTransactions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Recent Activity</h4>
                    <div className="space-y-3">
                      {recentTransactions.map((transaction) => {
                        const Icon = getTransactionIcon(transaction.type);
                        return (
                          <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                                <Icon className="w-4 h-4 text-gray-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {transaction.description || transaction.type}
                                </p>
                                <p className="text-xs text-gray-500">{formatDate(transaction.created_at)}</p>
                              </div>
                            </div>
                            <span className={`text-sm font-medium ${getTransactionColor(transaction.points)}`}>
                              {transaction.points > 0 ? `+${transaction.points}` : transaction.points}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'rewards' && (
              <div className="p-6">
                {rewards.length > 0 ? (
                  <div className="space-y-4">
                    {rewards.map((reward) => (
                      <div key={reward.id} className="border border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">{reward.name}</h4>
                            <p className="text-sm text-gray-600 mb-2">{reward.description}</p>
                            <div className="flex items-center space-x-4">
                              <span className="text-sm font-medium text-indigo-600">
                                {reward.points_required} points
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTierColor(reward.min_tier)}`}>
                                {reward.min_tier}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedReward(reward);
                            setShowRedemptionModal(true);
                          }}
                          disabled={customer.total_points < reward.points_required}
                          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                            customer.total_points >= reward.points_required
                              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {customer.total_points >= reward.points_required ? 'Redeem' : 'Not enough points'}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Rewards Available</h3>
                    <p className="text-gray-600 mb-4">
                      No rewards available for {customer.current_tier.charAt(0).toUpperCase() + customer.current_tier.slice(1)} tier yet. Keep earning points to unlock Silver and Gold rewards!
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-700">
                        💡 Tip: Earn more points to unlock higher tier rewards!
                      </p>
                    </div>
                    
                    <div className="mt-4 text-xs text-gray-500">
                      <p>Debug Info:</p>
                      <p>Customer: {customer.first_name} ({customer.current_tier})</p>
                      <p>Points: {customer.total_points}</p>
                      <p>Restaurant: {restaurant?.name}</p>
                      <p>Check console for detailed logs</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="p-6">
                {/* Transaction History */}
                <h4 className="font-semibold text-gray-900 mb-3">Transaction History</h4>
                {transactions.length > 0 ? (
                  <div className="space-y-3">
                    {transactions.map((transaction) => {
                      const Icon = getTransactionIcon(transaction.type);
                      return (
                        <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                              <Icon className="w-4 h-4 text-gray-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {transaction.description || transaction.type}
                              </p>
                              <p className="text-xs text-gray-500">{formatDate(transaction.created_at)}</p>
                              {transaction.amount_spent && (
                                <p className="text-xs text-gray-500">Amount: ${transaction.amount_spent}</p>
                              )}
                            </div>
                          </div>
                          <span className={`text-sm font-medium ${getTransactionColor(transaction.points)}`}>
                            {formatPoints(transaction.points)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">No transaction history yet</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Navigation */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('wallet')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'wallet'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CreditCard className="w-4 h-4 mx-auto mb-1" />
                Wallet
              </button>
              <button
                onClick={() => setActiveTab('rewards')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'rewards'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Gift className="w-4 h-4 mx-auto mb-1" />
                Rewards
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'history'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Clock className="w-4 h-4 mx-auto mb-1" />
                History
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Redemption Modal */}
      {showRedemptionModal && selectedReward && (
        <RedemptionModal
          reward={selectedReward}
          customer={customer}
          onConfirm={() => handleRedemption(selectedReward)}
          onClose={() => {
            setShowRedemptionModal(false);
            setSelectedReward(null);
          }}
          loading={loading}
        />
      )}
    </>
  );
};

export default CustomerWallet;