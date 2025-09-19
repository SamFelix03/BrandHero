"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { REWARD_TYPES, DEFAULT_VALUES, VALIDATION } from '@/lib/constants'

interface Business {
  id: string
  business_name: string
  description?: string
  location?: string
  website?: string
  ens_domain?: string
}

interface RewardTemplate {
  id?: number
  name: string
  description: string
  rewardType: keyof typeof REWARD_TYPES
  pointsValue: number
  voucherMetadata: string
  validityPeriod: number
  tokenAddress: string
  tokenAmount: number
  nftMetadata: string
}

interface Bounty {
  id?: number
  title: string
  description: string
  rewardTemplate: RewardTemplate
  expiry: number
  maxCompletions: number
  suggested?: boolean
}

interface Prize {
  id?: number
  name: string
  description: string
  pointsCost: number
  maxClaims: number
  metadata: string
}

interface BountyManagementFormProps {
  business: Business
  walletAddress: string
}

export default function BountyManagementForm({ business, walletAddress }: BountyManagementFormProps) {
  const router = useRouter()
  const [bounties, setBounties] = useState<Bounty[]>([])
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [loading, setLoading] = useState(true)
  const [deploying, setDeploying] = useState(false)
  const [activeTab, setActiveTab] = useState<'bounties' | 'prizes'>('bounties')
  const [editingBounty, setEditingBounty] = useState<Bounty | null>(null)
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null)
  const [showAddBounty, setShowAddBounty] = useState(false)
  const [showAddPrize, setShowAddPrize] = useState(false)

  // Load AI suggestions
  useEffect(() => {
    loadAISuggestions()
  }, [])

  const loadAISuggestions = async () => {
    try {
      const response = await fetch('/api/ai/suggest-bounties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessData: business })
      })

      const result = await response.json()
      
      if (result.success) {
        setBounties(result.suggestedBounties)
        // Add some default prizes
        setPrizes([
          {
            name: "Free Coffee",
            description: "Redeem for a complimentary coffee of your choice",
            pointsCost: 100,
            maxClaims: 0,
            metadata: JSON.stringify({ category: "beverage", restrictions: "one per day" })
          },
          {
            name: "VIP Status",
            description: "Get VIP treatment and skip the line for a month",
            pointsCost: 500,
            maxClaims: 10,
            metadata: JSON.stringify({ category: "experience", duration: "30 days" })
          }
        ])
      }
    } catch (error) {
      console.error('Failed to load AI suggestions:', error)
    } finally {
      setLoading(false)
    }
  }

  const createNewBounty = (): Bounty => ({
    title: "",
    description: "",
    rewardTemplate: {
      name: "",
      description: "",
      rewardType: "NONE",
      pointsValue: DEFAULT_VALUES.REWARD.pointsValue,
      voucherMetadata: "",
      validityPeriod: DEFAULT_VALUES.REWARD.validityPeriod,
      tokenAddress: "0x0000000000000000000000000000000000000000",
      tokenAmount: 0,
      nftMetadata: ""
    },
    expiry: DEFAULT_VALUES.BOUNTY.expiry,
    maxCompletions: DEFAULT_VALUES.BOUNTY.maxCompletions
  })

  const createNewPrize = (): Prize => ({
    name: "",
    description: "",
    pointsCost: DEFAULT_VALUES.PRIZE.pointsCost,
    maxClaims: DEFAULT_VALUES.PRIZE.maxClaims,
    metadata: ""
  })

  const handleAddBounty = () => {
    const newBounty = createNewBounty()
    setEditingBounty(newBounty)
    setShowAddBounty(true)
  }

  const handleAddPrize = () => {
    const newPrize = createNewPrize()
    setEditingPrize(newPrize)
    setShowAddPrize(true)
  }

  const saveBounty = (bounty: Bounty) => {
    if (bounty.id) {
      setBounties(prev => prev.map(b => b.id === bounty.id ? bounty : b))
    } else {
      setBounties(prev => [...prev, { ...bounty, id: Date.now() }])
    }
    setEditingBounty(null)
    setShowAddBounty(false)
  }

  const savePrize = (prize: Prize) => {
    if (prize.id) {
      setPrizes(prev => prev.map(p => p.id === prize.id ? prize : p))
    } else {
      setPrizes(prev => [...prev, { ...prize, id: Date.now() }])
    }
    setEditingPrize(null)
    setShowAddPrize(false)
  }

  const deleteBounty = (id: number) => {
    setBounties(prev => prev.filter(b => b.id !== id))
  }

  const deletePrize = (id: number) => {
    setPrizes(prev => prev.filter(p => p.id !== id))
  }

  const deployContract = async () => {
    setDeploying(true)
    try {
      // Call deployment API
      const response = await fetch('/api/deploy-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business,
          bounties,
          prizes,
          walletAddress
        })
      })

      const result = await response.json()
      
      if (result.success) {
        // Redirect to dashboard
        router.push('/business-dashboard')
      } else {
        alert('Deployment failed: ' + result.error)
      }
    } catch (error) {
      console.error('Deployment error:', error)
      alert('Deployment failed. Please try again.')
    } finally {
      setDeploying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/70">Loading AI suggestions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-white/5 backdrop-blur-sm rounded-lg p-1 border border-white/10">
        <button
          onClick={() => setActiveTab('bounties')}
          className={`flex-1 py-2 px-4 rounded-md transition-all duration-200 text-sm font-medium ${
            activeTab === 'bounties' 
              ? 'bg-white text-black' 
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          Bounties ({bounties.length})
        </button>
        <button
          onClick={() => setActiveTab('prizes')}
          className={`flex-1 py-2 px-4 rounded-md transition-all duration-200 text-sm font-medium ${
            activeTab === 'prizes' 
              ? 'bg-white text-black' 
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          Prizes ({prizes.length})
        </button>
      </div>

      {/* Bounties Tab */}
      {activeTab === 'bounties' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-medium text-white">Bounties & Rewards</h3>
            <button
              onClick={handleAddBounty}
              className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition-colors"
            >
              Add Custom Bounty
            </button>
          </div>

          {bounties.length === 0 ? (
            <div className="text-center py-8 text-white/50">
              <p>No bounties yet. Add your first bounty to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bounties.map((bounty, index) => (
                <BountyCard
                  key={bounty.id || index}
                  bounty={bounty}
                  onEdit={() => setEditingBounty(bounty)}
                  onDelete={() => bounty.id && deleteBounty(bounty.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Prizes Tab */}
      {activeTab === 'prizes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-medium text-white">Point-Based Prizes</h3>
            <button
              onClick={handleAddPrize}
              className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition-colors"
            >
              Add Prize
            </button>
          </div>

          {prizes.length === 0 ? (
            <div className="text-center py-8 text-white/50">
              <p>No prizes yet. Add your first prize to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {prizes.map((prize, index) => (
                <PrizeCard
                  key={prize.id || index}
                  prize={prize}
                  onEdit={() => setEditingPrize(prize)}
                  onDelete={() => prize.id && deletePrize(prize.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Deploy Button */}
      <div className="text-center pt-8">
        <button
          onClick={deployContract}
          disabled={deploying || (bounties.length === 0 && prizes.length === 0)}
          className="px-8 py-4 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white rounded-lg font-medium text-lg transition-colors disabled:cursor-not-allowed"
        >
          {deploying ? 'Deploying Smart Contract...' : 'Deploy Business Contract'}
        </button>
        <p className="text-white/50 text-sm mt-2">
          This will deploy your business smart contract with all bounties, rewards, and prizes
        </p>
      </div>

      {/* Edit Modals */}
      {editingBounty && (
        <BountyEditModal
          bounty={editingBounty}
          onSave={saveBounty}
          onCancel={() => {
            setEditingBounty(null)
            setShowAddBounty(false)
          }}
        />
      )}

      {editingPrize && (
        <PrizeEditModal
          prize={editingPrize}
          onSave={savePrize}
          onCancel={() => {
            setEditingPrize(null)
            setShowAddPrize(false)
          }}
        />
      )}
    </div>
  )
}

// Bounty Card Component
function BountyCard({ 
  bounty, 
  onEdit, 
  onDelete 
}: { 
  bounty: Bounty
  onEdit: () => void
  onDelete: () => void 
}) {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
      {bounty.suggested && (
        <div className="inline-flex items-center px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium mb-3">
          <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
          AI Suggested
        </div>
      )}
      
      <h4 className="text-lg font-medium text-white mb-2">{bounty.title}</h4>
      <p className="text-white/70 text-sm mb-4">{bounty.description}</p>
      
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">Reward:</span>
          <span className="text-white">{bounty.rewardTemplate.name}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">Points:</span>
          <span className="text-white">{bounty.rewardTemplate.pointsValue}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">Type:</span>
          <span className="text-white capitalize">{bounty.rewardTemplate.rewardType.replace('_', ' ')}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={onEdit}
          className="px-3 py-1 bg-white/10 text-white rounded text-sm hover:bg-white/20 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-1 bg-red-500/20 text-red-400 rounded text-sm hover:bg-red-500/30 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

// Prize Card Component
function PrizeCard({ 
  prize, 
  onEdit, 
  onDelete 
}: { 
  prize: Prize
  onEdit: () => void
  onDelete: () => void 
}) {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
      <h4 className="text-lg font-medium text-white mb-2">{prize.name}</h4>
      <p className="text-white/70 text-sm mb-4">{prize.description}</p>
      
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">Points Cost:</span>
          <span className="text-white font-medium">{prize.pointsCost}</span>
        </div>
        {prize.maxClaims > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">Max Claims:</span>
            <span className="text-white">{prize.maxClaims}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={onEdit}
          className="px-3 py-1 bg-white/10 text-white rounded text-sm hover:bg-white/20 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-1 bg-red-500/20 text-red-400 rounded text-sm hover:bg-red-500/30 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

// Bounty Edit Modal Component
function BountyEditModal({ 
  bounty, 
  onSave, 
  onCancel 
}: { 
  bounty: Bounty
  onSave: (bounty: Bounty) => void
  onCancel: () => void 
}) {
  const [formData, setFormData] = useState(bounty)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.title.trim() && formData.description.trim() && formData.rewardTemplate.name.trim()) {
      onSave(formData)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-medium text-white mb-6">
          {bounty.id ? 'Edit Bounty' : 'Add New Bounty'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white font-medium mb-2">Bounty Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-white/50"
              placeholder="Enter bounty title"
              required
            />
          </div>

          <div>
            <label className="block text-white font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-white/50"
              placeholder="Describe what users need to do"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white font-medium mb-2">Reward Name</label>
              <input
                type="text"
                value={formData.rewardTemplate.name}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  rewardTemplate: { ...prev.rewardTemplate, name: e.target.value }
                }))}
                className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-white/50"
                placeholder="e.g., 10% Discount"
                required
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Points Value</label>
              <input
                type="number"
                min={VALIDATION.MIN_POINTS}
                max={VALIDATION.MAX_POINTS}
                value={formData.rewardTemplate.pointsValue}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  rewardTemplate: { ...prev.rewardTemplate, pointsValue: parseInt(e.target.value) || 0 }
                }))}
                className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-white/50"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-white font-medium mb-2">Reward Type</label>
            <select
              value={formData.rewardTemplate.rewardType}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                rewardTemplate: { ...prev.rewardTemplate, rewardType: e.target.value as keyof typeof REWARD_TYPES }
              }))}
              className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white focus:outline-none focus:border-white/50"
            >
              <option value="NONE">Points Only</option>
              <option value="WEB2_VOUCHER">Web2 Voucher (NFT)</option>
              <option value="TOKEN_AIRDROP">Token Airdrop</option>
              <option value="NFT_REWARD">NFT Reward</option>
            </select>
          </div>

          {formData.rewardTemplate.rewardType === 'WEB2_VOUCHER' && (
            <div>
              <label className="block text-white font-medium mb-2">Voucher Details (JSON)</label>
              <textarea
                value={formData.rewardTemplate.voucherMetadata}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  rewardTemplate: { ...prev.rewardTemplate, voucherMetadata: e.target.value }
                }))}
                className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-white/50"
                placeholder='{"discountPercentage": 10, "terms": "Valid for 30 days"}'
                rows={2}
              />
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition-colors"
            >
              Save Bounty
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Prize Edit Modal Component
function PrizeEditModal({ 
  prize, 
  onSave, 
  onCancel 
}: { 
  prize: Prize
  onSave: (prize: Prize) => void
  onCancel: () => void 
}) {
  const [formData, setFormData] = useState(prize)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.name.trim() && formData.description.trim() && formData.pointsCost > 0) {
      onSave(formData)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-lg">
        <h3 className="text-xl font-medium text-white mb-6">
          {prize.id ? 'Edit Prize' : 'Add New Prize'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white font-medium mb-2">Prize Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-white/50"
              placeholder="Enter prize name"
              required
            />
          </div>

          <div>
            <label className="block text-white font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-white/50"
              placeholder="Describe the prize"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white font-medium mb-2">Points Cost</label>
              <input
                type="number"
                min={VALIDATION.MIN_POINTS}
                value={formData.pointsCost}
                onChange={(e) => setFormData(prev => ({ ...prev, pointsCost: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-white/50"
                required
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Max Claims (0 = unlimited)</label>
              <input
                type="number"
                min="0"
                value={formData.maxClaims}
                onChange={(e) => setFormData(prev => ({ ...prev, maxClaims: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-white/50"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition-colors"
            >
              Save Prize
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}