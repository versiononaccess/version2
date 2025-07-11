import React, { useState, useEffect } from 'react';
import { 
  ChefHat, Phone, User, CheckCircle2, ArrowRight, 
  Gift, Crown, Sparkles, Timer, X,
  Loader2, TrendingUp, Award, Heart, Utensils,
  Coffee, CreditCard, MapPin, Clock, Zap, Plus,
  Minus, QrCode, Share2, Copy, Check, AlertCircle
} from 'lucide-react';
import { CustomerService } from '../services/customerService';
import { RewardService } from '../services/rewardService';
import { useAuth } from '../contexts/AuthContext';
import OnboardingFlow from './OnboardingFlow';
import RedemptionModal from './RedemptionModal';

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
  description?: string;
  points_required: number;
  category: string;
  image_url?: string;
  min_tier: 'bronze' | 'silver' | 'gold';
  is_active: boolean;
  total_available?: number;
  total_redeemed: number;
}

interface Transaction {
  id: string;
  type: 'purchase' | 'bonus' | 'referral' | 'signup';
  points: number;
  amount_spent?: number;
  description?: string;
  created_at: string;
}

interface CustomerWalletProps {
  customerId?: string;
  onClose?: () => void;
  isDemo?: boolean;
}

const CustomerWallet: React.FC<CustomerWalletProps> = ({ 
  customerId, 
  onClose, 
  isDemo = false 
}) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'wallet' | 'rewards' | 'history'>('wallet');
  const [showOnboarding, setShowOnboarding] = useState(!customerId);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const { restaurant } = useAuth();
  const [showRedemptionModal, setShowRedemptionModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);

  useEffect(() => {
    if (customer && restaurant && !showOnboarding && !loading) {
      console.log('🔄 Fetching customer data for:', customer.id, 'restaurant:', restaurant.id);
      fetchCustomerData();
    }
  }, [customer?.id, restaurant?.id, showOnboarding]);

  const fetchCustomerData = async () => {
    if (!customer || !restaurant) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 Starting data fetch for customer:', customer.id);

      const [customerData, rewardsData, transactionsData] = await Promise.all([
        CustomerService.getCustomer(restaurant.id, customer.id),
        RewardService.getAvailableRewards(restaurant.id, customer.id),
        CustomerService.getCustomerTransactions(restaurant.id, customer.id)
      ]);

      console.log('📋 Fetched data:', {
        customer: customer.first_name,
        rewards: rewardsData?.length,
        transactions: transactionsData?.length
      });

      // Update customer data if we got fresh data
      if (customerData && customerData.id === customer.id) {
        setCustomer(customerData);
      }
      setRewards(rewardsData);
      setTransactions(transactionsData);
    } catch (err: any) {
      console.error('Error fetching customer data:', err);
      setError(err.message || 'Failed to load customer data');
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingComplete = async (userData: any) => {
    if (!restaurant) {
      setError('Restaurant not found. Please try again.');
      return;
    }

    try {
      setLoading(true);
      
      // If existing customer, just set the data
      if (userData.customerId) {
        const existingCustomer = await CustomerService.getCustomer(restaurant.id, userData.customerId);
        if (existingCustomer) {
          setCustomer(existingCustomer);
          setShowOnboarding(false);
          // Data will be fetched automatically by useEffect when customer is set
          return;
        }
      }
      
      // Create new customer
      const newCustomer = await CustomerService.createCustomer(restaurant.id, {
        first_name: userData.name.split(' ')[0],
        last_name: userData.name.split(' ').slice(1).join(' ') || userData.name.split(' ')[0],
        email: userData.email,
        phone: userData.phone,
        date_of_birth: userData.birthDate && userData.birthDate.trim() !== '' ? userData.birthDate : undefined
      });

      setCustomer(newCustomer);
      setShowOnboarding(false);
    } catch (err: any) {
      console.error('Error creating customer:', err);
      if (err.message && err.message.includes('already exists')) {
        // Customer exists, try to find them
        try {
          const existingCustomer = await CustomerService.getCustomerByEmail(restaurant.id, userData.email);
          if (existingCustomer) {
            setCustomer(existingCustomer);
            setShowOnboarding(false);
            return;
          }
        } catch (findErr) {
          console.error('Error finding existing customer:', findErr);
        }
      }
      setError(err.message || 'Failed to create customer account');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemReward = async (rewardId: string) => {
    if (!customer || !restaurant) return;
    
    const reward = rewards.find(r => r.id === rewardId);
    if (!reward) return;
    
    setSelectedReward(reward);
    setShowRedemptionModal(true);
  };

  const handleConfirmRedemption = async () => {
    if (!customer || !restaurant || !selectedReward) return;
    
    try {
      setRedeeming(selectedReward.id);
      
      await RewardService.redeemReward(restaurant.id, customer.id, selectedReward.id);
      
      // Refresh customer data to update points
      await fetchCustomerData();
    } catch (err: any) {
      console.error('Error redeeming reward:', err);
      throw err; // Re-throw to be handled by the modal
    } finally {
      setRedeeming(null);
    }
  };

  const handleCloseRedemptionModal = () => {
    setShowRedemptionModal(false);
    setSelectedReward(null);
  };

  const getTierInfo = (tier: string) => {
    switch (tier) {
      case 'gold':
        return { 
          name: 'Gold', 
          color: 'from-yellow-400 to-yellow-600', 
          icon: Crown,
          nextTier: null,
          minPoints: 1000
        };
      case 'silver':
        return { 
          name: 'Silver', 
          color: 'from-gray-300 to-gray-500', 
          icon: Award,
          nextTier: 'Gold',
          minPoints: 500
        };
      default:
        return { 
          name: 'Bronze', 
          color: 'from-orange-400 to-orange-600', 
          icon: ChefHat,
          nextTier: 'Silver',
          minPoints: 0
        };
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (showOnboarding) {
    return (
      <OnboardingFlow 
        onComplete={handleOnboardingComplete}
        restaurantName={restaurant?.name || "TableLoyalty Restaurant"}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-[#1E2A78] animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading your wallet...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-lg border border-gray-200">
          <div className="text-red-500 mb-4">
            <AlertCircle className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Wallet</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gradient-to-r from-[#1E2A78] to-[#3B4B9A] text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-600">
          <p>Customer not found</p>
        </div>
      </div>
    );
  }

  const tierInfo = getTierInfo(customer.current_tier);
  const TierIcon = tierInfo.icon;

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Header */}
      <div className="relative z-10 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#1E2A78] to-[#3B4B9A] rounded-xl flex items-center justify-center shadow-lg">
              <ChefHat className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-gray-900 font-semibold text-lg">{restaurant?.name || 'TableLoyalty'}</h1>
              <p className="text-gray-600 text-sm">Loyalty Wallet</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQR(true)}
              className="p-3 bg-white rounded-xl text-gray-600 hover:bg-gray-50 transition-colors shadow-sm border border-gray-200"
            >
              <QrCode className="h-5 w-5" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-3 bg-white rounded-xl text-gray-600 hover:bg-gray-50 transition-colors shadow-sm border border-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Customer Card */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-lg mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#1E2A78] to-[#3B4B9A] rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">
                {customer.first_name[0]}{customer.last_name[0]}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-gray-900 font-bold text-xl">
                {customer.first_name} {customer.last_name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r ${tierInfo.color}`}>
                  <TierIcon className="h-3 w-3 text-white" />
                  <span className="text-white text-xs font-medium">{tierInfo.name}</span>
                </div>
                <span className="text-gray-600 text-sm">
                  {customer.visit_count} visits
                </span>
              </div>
            </div>
          </div>

          {/* Points Display */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-gray-600 text-sm mb-1">Available Points</p>
              <p className="text-gray-900 font-bold text-2xl">{customer.total_points.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-600 text-sm mb-1">Lifetime Points</p>
              <p className="text-gray-900 font-bold text-2xl">{customer.lifetime_points.toLocaleString()}</p>
            </div>
          </div>

          {/* Tier Progress */}
          {tierInfo.nextTier && (
            <div className="mt-4">
              <div className="flex justify-between text-gray-600 text-sm mb-2">
                <span>Progress to {tierInfo.nextTier}</span>
                <span>{customer.tier_progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-[#1E2A78] to-[#3B4B9A] rounded-full h-2 transition-all duration-500"
                  style={{ width: `${customer.tier_progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-white rounded-2xl p-1 mb-6 shadow-sm border border-gray-200">
          {[
            { id: 'wallet', label: 'Wallet', icon: CreditCard },
            { id: 'rewards', label: 'Rewards', icon: Gift },
            { id: 'history', label: 'History', icon: Clock }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-[#1E2A78] to-[#3B4B9A] text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium text-sm">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {activeTab === 'wallet' && (
            <div className="space-y-4">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Total Spent</p>
                      <p className="text-gray-900 font-bold">${customer.total_spent.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Heart className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Member Since</p>
                      <p className="text-gray-900 font-bold">
                        {new Date(customer.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity Preview */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
                <h3 className="text-gray-900 font-semibold mb-3">Recent Activity</h3>
                <div className="space-y-3">
                  {transactions.slice(0, 3).length > 0 ? (
                    transactions.slice(0, 3).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#1E2A78]/10 rounded-lg flex items-center justify-center">
                            <Plus className="h-4 w-4 text-[#1E2A78]" />
                          </div>
                          <div>
                            <p className="text-gray-900 text-sm font-medium">
                              {transaction.description || 'Points earned'}
                            </p>
                            <p className="text-gray-500 text-xs">
                              {new Date(transaction.created_at).toLocaleDateString()}
                            </p>
                            {transaction.amount_spent && (
                              <p className="text-gray-500 text-xs">
                                Amount: ${transaction.amount_spent.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-green-600 font-medium">
                          +{transaction.points} pts
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">No activity yet</p>
                      <p className="text-gray-400 text-xs">Start earning points with your first purchase!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rewards' && (
            <div className="space-y-4">
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 border border-gray-200 animate-pulse">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-xl"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded mb-4"></div>
                          <div className="h-10 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : rewards.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm text-center">
                  <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-gray-900 font-semibold mb-2">No Rewards Available</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {customer?.current_tier === 'bronze' 
                      ? 'No rewards available for Bronze tier yet. Keep earning points to unlock Silver and Gold rewards!'
                      : 'No rewards available for your tier right now. Check back later for exciting rewards!'
                    }
                  </p>
                  <div className="p-3 bg-blue-50 rounded-lg mb-4">
                    <p className="text-blue-800 text-sm">
                      💡 Tip: Earn more points to unlock higher tier rewards!
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
                    <p>Debug Info:</p>
                    <p>Customer: {customer?.first_name} ({customer?.current_tier})</p>
                    <p>Points: {customer?.total_points}</p>
                    <p>Restaurant: {restaurant?.name}</p>
                    <p>Check console for detailed logs</p>
                  </div>
                </div>
              ) : (
                rewards.map((reward) => {
                  const canRedeem = customer.total_points >= reward.points_required;
                  
                  // Check tier requirement
                  const tierOrder = { bronze: 0, silver: 1, gold: 2 };
                  const customerTierLevel = tierOrder[customer.current_tier as keyof typeof tierOrder];
                  const rewardTierLevel = tierOrder[reward.min_tier as keyof typeof tierOrder];
                  const tierAllowed = customerTierLevel >= rewardTierLevel;
                  
                  // Check availability
                  const isAvailable = !reward.total_available || reward.total_redeemed < reward.total_available;

                  return (
                    <div key={reward.id} className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                          reward.category === 'food' ? 'bg-gradient-to-br from-orange-100 to-red-100' :
                          reward.category === 'beverage' ? 'bg-gradient-to-br from-blue-100 to-cyan-100' :
                          reward.category === 'discount' ? 'bg-gradient-to-br from-green-100 to-emerald-100' :
                          reward.category === 'experience' ? 'bg-gradient-to-br from-purple-100 to-violet-100' :
                          'bg-gradient-to-br from-pink-100 to-rose-100'
                        }`}>
                          {reward.category === 'food' ? <Utensils className="h-8 w-8 text-orange-600" /> :
                           reward.category === 'beverage' ? <Coffee className="h-8 w-8 text-blue-600" /> :
                           reward.category === 'discount' ? <Percent className="h-8 w-8 text-green-600" /> :
                           reward.category === 'experience' ? <Star className="h-8 w-8 text-purple-600" /> :
                           <Gift className="h-8 w-8 text-pink-600" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="text-gray-900 font-semibold">{reward.name}</h4>
                              {reward.description && (
                                <p className="text-gray-600 text-sm mt-1">{reward.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  reward.min_tier === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                                  reward.min_tier === 'silver' ? 'bg-gray-100 text-gray-800' :
                                  'bg-orange-100 text-orange-800'
                                }`}>
                                  {reward.min_tier} tier
                                </span>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  reward.category === 'food' ? 'bg-orange-50 text-orange-700' :
                                  reward.category === 'beverage' ? 'bg-blue-50 text-blue-700' :
                                  reward.category === 'discount' ? 'bg-green-50 text-green-700' :
                                  reward.category === 'experience' ? 'bg-purple-50 text-purple-700' :
                                  'bg-pink-50 text-pink-700'
                                }`}>
                                  {reward.category}
                                </span>
                                {reward.total_available && (
                                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                                    {reward.total_available - reward.total_redeemed} left
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-gray-900 font-bold">{reward.points_required} pts</p>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleRedeemReward(reward.id)}
                            disabled={!canRedeem || !tierAllowed || !isAvailable || redeeming === reward.id}
                            className={`w-full py-3 rounded-xl font-medium transition-all duration-200 ${
                              canRedeem && tierAllowed && isAvailable
                                ? 'bg-gradient-to-r from-[#1E2A78] to-[#3B4B9A] text-white hover:shadow-lg'
                                : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            {redeeming === reward.id ? (
                              <div className="flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Redeeming...
                              </div>
                            ) : !isAvailable ? (
                              'Not Available'
                            ) : !tierAllowed ? (
                              `Requires ${reward.min_tier} tier`
                            ) : !canRedeem ? (
                              `Need ${reward.points_required - customer.total_points} more points`
                            ) : (
                              'Redeem Reward'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {transactions.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm text-center">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-gray-900 font-semibold mb-2">No Transaction History</h3>
                  <p className="text-gray-600 text-sm">Your transaction history will appear here.</p>
                </div>
              ) : (
                transactions.map((transaction) => (
                  <div key={transaction.id} className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          transaction.points > 0 ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {transaction.points > 0 ? (
                            <Plus className="h-5 w-5 text-green-600" />
                          ) : (
                            <Minus className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-gray-900 font-medium">
                            {transaction.description || 
                             (transaction.type === 'purchase' ? 'Purchase' :
                              transaction.type === 'signup' ? 'Welcome Bonus' :
                              transaction.type === 'bonus' ? 'Bonus Points' :
                              'Referral Bonus')}
                          </p>
                          <p className="text-gray-500 text-sm">
                            {new Date(transaction.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          {transaction.amount_spent && (
                            <p className="text-gray-500 text-xs">
                              Amount: ${transaction.amount_spent.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold ${
                          transaction.points > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.points > 0 ? '+' : ''}{transaction.points} pts
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Your QR Code</h3>
              <button
                onClick={() => setShowQR(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="text-center">
              <div className="w-48 h-48 bg-gray-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <QrCode className="h-24 w-24 text-gray-400" />
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Show this QR code to earn points with your purchases
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => copyToClipboard(customer.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy ID'}
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#1E2A78] text-white rounded-xl hover:bg-[#3B4B9A] transition-colors">
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Redemption Modal */}
      <RedemptionModal
        isOpen={showRedemptionModal}
        onClose={handleCloseRedemptionModal}
        reward={selectedReward}
        customer={customer}
        onConfirmRedemption={handleConfirmRedemption}
        restaurantName={restaurant?.name || 'Restaurant'}
      />
    </div>
  );
};

export default CustomerWallet;