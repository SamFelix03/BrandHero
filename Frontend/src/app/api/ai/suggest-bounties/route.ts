import { NextRequest, NextResponse } from 'next/server'

interface BusinessData {
  business_name: string
  description?: string
  location?: string
  website?: string
  ens_domain?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessData } = body as { businessData: BusinessData }

    if (!businessData || !businessData.business_name) {
      return NextResponse.json(
        { error: 'Business data with business_name is required' },
        { status: 400 }
      )
    }

    // Mock AI analysis - in reality this would analyze the business and suggest relevant bounties
    // For now, return two hardcoded bounties based on the contract structure
    const suggestedBounties = [
      {
        title: "Share Your Experience",
        description: `Post about your experience at ${businessData.business_name} on social media and tag us. Help spread the word about our awesome service!`,
        rewardTemplate: {
          name: "Social Media Reward",
          description: "Get 50 points + 10% discount voucher for sharing your experience",
          rewardType: "WEB2_VOUCHER", // Maps to RewardType.WEB2_VOUCHER
          pointsValue: 50,
          voucherMetadata: JSON.stringify({
            discountPercentage: 10,
            validFor: "next purchase",
            terms: "Valid for 30 days from issuance",
            excludes: []
          }),
          validityPeriod: 30 * 24 * 60 * 60, // 30 days in seconds
          tokenAddress: "0x0000000000000000000000000000000000000000",
          tokenAmount: 0,
          nftMetadata: ""
        },
        expiry: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60), // 90 days from now
        maxCompletions: 0, // unlimited
        suggested: true
      },
      {
        title: "Refer a Friend",
        description: `Bring a friend to ${businessData.business_name}! When your referred friend makes their first purchase, you both get rewarded.`,
        rewardTemplate: {
          name: "Referral Bonus",
          description: "100 points for successful referrals - help us grow our community!",
          rewardType: "NONE", // Points only
          pointsValue: 100,
          voucherMetadata: "",
          validityPeriod: 0,
          tokenAddress: "0x0000000000000000000000000000000000000000",
          tokenAmount: 0,
          nftMetadata: ""
        },
        expiry: 0, // No expiry
        maxCompletions: 10, // limit to 10 referrals per person
        suggested: true
      }
    ]

    // Mock analysis insights
    const analysis = {
      businessType: businessData.description ? "service-based" : "general",
      strengths: [
        "Strong brand presence with ENS domain",
        "Clear business identity"
      ],
      opportunities: [
        "Social media engagement",
        "Customer referral program",
        "Community building"
      ],
      recommendedFocus: "Customer acquisition and social proof"
    }

    return NextResponse.json({
      success: true,
      analysis,
      suggestedBounties,
      message: `Generated ${suggestedBounties.length} bounty suggestions for ${businessData.business_name}`
    })

  } catch (error) {
    console.error('AI bounty suggestion error:', error)
    return NextResponse.json(
      { error: 'Failed to generate bounty suggestions' },
      { status: 500 }
    )
  }
}