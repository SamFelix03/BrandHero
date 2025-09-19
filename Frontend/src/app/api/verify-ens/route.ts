import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ens_domain, wallet_address } = body

    if (!ens_domain || !wallet_address) {
      return NextResponse.json(
        { error: 'ens_domain and wallet_address are required' },
        { status: 400 }
      )
    }

    // Validate ENS domain format
    if (!ens_domain.endsWith('.eth')) {
      return NextResponse.json(
        { error: 'Invalid ENS domain format. Domain must end with .eth' },
        { status: 400 }
      )
    }

    const publicClient = createPublicClient({
      chain: mainnet,
      transport: http()
    })

    const resolvedAddress = await publicClient.getEnsAddress({
      name: ens_domain
    })

    if (!resolvedAddress) {
      return NextResponse.json(
        { error: 'ENS domain not found or does not resolve to any address' },
        { status: 400 }
      )
    }

    if (resolvedAddress.toLowerCase() !== wallet_address.toLowerCase()) {
      return NextResponse.json(
        { error: 'ENS domain does not resolve to the connected wallet address' },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      resolved_address: resolvedAddress,
      message: 'ENS domain ownership verified'
    })

  } catch (error) {
    console.error('ENS verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify ENS domain ownership' },
      { status: 500 }
    )
  }
}