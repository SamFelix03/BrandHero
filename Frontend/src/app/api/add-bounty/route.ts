import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, createWalletClient, http, decodeEventLog } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { arbitrumSepolia } from 'viem/chains'
import { BUSINESS_CONTRACT_ABI, NETWORK_CONFIG, REWARD_TYPES } from '@/lib/constants'

interface RewardData {
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

interface BountyData {
  title: string
  description: string
  expiry: number
  maxCompletions: number
  rewardData: RewardData
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contractAddress, bounty, walletAddress } = body as {
      contractAddress: string
      bounty: BountyData
      walletAddress: string
    }

    if (!contractAddress || !bounty || !walletAddress) {
      return NextResponse.json(
        { error: 'Contract address, bounty data, and wallet address are required' },
        { status: 400 }
      )
    }

    if (!process.env.DEPLOYER_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Deployer private key not configured' },
        { status: 500 }
      )
    }

    console.log('Adding bounty to contract:', contractAddress)
    console.log('Bounty:', bounty.title)

    // Initialize Web3 clients
    const publicClient = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(NETWORK_CONFIG.rpcUrl)
    })

    const account = privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`)
    const walletClient = createWalletClient({
      account,
      chain: arbitrumSepolia,
      transport: http(NETWORK_CONFIG.rpcUrl)
    })

    // Step 1: Add reward template to the contract
    const { request: rewardRequest } = await publicClient.simulateContract({
      address: contractAddress as `0x${string}`,
      abi: BUSINESS_CONTRACT_ABI,
      functionName: 'addRewardTemplate',
      args: [
        bounty.rewardData.name,
        bounty.rewardData.description,
        REWARD_TYPES[bounty.rewardData.rewardType], // Convert to enum value
        BigInt(bounty.rewardData.pointsValue),
        bounty.rewardData.voucherMetadata,
        BigInt(bounty.rewardData.validityPeriod),
        bounty.rewardData.tokenAddress as `0x${string}`,
        BigInt(bounty.rewardData.tokenAmount),
        bounty.rewardData.nftMetadata
      ],
      account
    })

    const rewardHash = await walletClient.writeContract(rewardRequest)
    console.log('Reward template transaction submitted:', rewardHash)

    // Wait for reward template transaction
    const rewardReceipt = await publicClient.waitForTransactionReceipt({ 
      hash: rewardHash,
      timeout: 60_000
    })

    // Extract reward template ID from logs
    let rewardTemplateId: bigint | undefined

    for (const log of rewardReceipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: BUSINESS_CONTRACT_ABI,
          eventName: 'RewardTemplateAdded',
          data: log.data,
          topics: log.topics
        })
        
        if (decoded.eventName === 'RewardTemplateAdded') {
          rewardTemplateId = decoded.args.rewardId
          break
        }
      } catch (e) {
        continue
      }
    }

    if (!rewardTemplateId) {
      throw new Error('Could not extract reward template ID from transaction logs')
    }

    console.log('Reward template created with ID:', rewardTemplateId.toString())

    // Step 2: Create bounty using the reward template
    const { request: bountyRequest } = await publicClient.simulateContract({
      address: contractAddress as `0x${string}`,
      abi: BUSINESS_CONTRACT_ABI,
      functionName: 'createBounty',
      args: [
        bounty.title,
        bounty.description,
        rewardTemplateId,
        BigInt(bounty.expiry),
        BigInt(bounty.maxCompletions)
      ],
      account
    })

    const bountyHash = await walletClient.writeContract(bountyRequest)
    console.log('Bounty creation transaction submitted:', bountyHash)

    // Wait for bounty transaction
    const bountyReceipt = await publicClient.waitForTransactionReceipt({ 
      hash: bountyHash,
      timeout: 60_000
    })

    // Extract bounty ID from logs
    let bountyId: bigint | undefined

    for (const log of bountyReceipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: BUSINESS_CONTRACT_ABI,
          eventName: 'BountyCreated',
          data: log.data,
          topics: log.topics
        })
        
        if (decoded.eventName === 'BountyCreated') {
          bountyId = decoded.args.bountyId
          break
        }
      } catch (e) {
        continue
      }
    }

    if (!bountyId) {
      throw new Error('Could not extract bounty ID from transaction logs')
    }

    console.log('Bounty created successfully with ID:', bountyId.toString())

    return NextResponse.json({
      success: true,
      bountyId: bountyId.toString(),
      rewardTemplateId: rewardTemplateId.toString(),
      rewardTxHash: rewardHash,
      bountyTxHash: bountyHash,
      rewardBlockNumber: rewardReceipt.blockNumber.toString(),
      bountyBlockNumber: bountyReceipt.blockNumber.toString(),
      message: `Bounty "${bounty.title}" created successfully`
    })

  } catch (error) {
    console.error('Add bounty error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to add bounty',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}