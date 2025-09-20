import { ethers } from 'ethers';
import { ETH_COIN_TYPE } from './utils';
import { Database } from './server';
import { createClient } from '@supabase/supabase-js';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const EMPTY_CONTENT_HASH = '0x';

// Local Arbitrum Sepolia fork RPC provider
const rpcProvider = new ethers.providers.JsonRpcProvider('https://sepolia-rollup.arbitrum.io/rpc');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

// BusinessContract ABI
const BusinessContract_ABI = [
  'function getUserByENSName(string memory _ensName) external view returns (address userAddress, uint256 totalPoints, string memory ensName, uint256 joinedAt)',
];

/**
 * Parse ENS name into subdomain and business domain
 * e.g., "sarah.joescoffee.eth" -> { subdomain: "sarah", businessDomain: "joescoffee.eth" }
 * e.g., "test.eth" -> { subdomain: "", businessDomain: "test.eth" }
 */
function parseENSName(ensName: string): { subdomain: string; businessDomain: string } | null {
  const parts = ensName.split('.');
  if (parts.length < 2) return null; // Need at least business.eth
  
  if (parts.length === 2) {
    // Handle 2-part names like "test.eth"
    return { subdomain: "", businessDomain: ensName };
  } else {
    // Handle 3+ part names like "sarah.joescoffee.eth"
    const subdomain = parts[0];
    const businessDomain = parts.slice(1).join('.');
    return { subdomain, businessDomain };
  }
}

/**
 * Get business contract address from Supabase
 */
async function getBusinessContractAddress(businessDomain: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('smart_contract_address')
      .eq('ens_domain', businessDomain)
      .not('smart_contract_address', 'is', null)
      .single();

    if (error) {
      console.log('Supabase error for domain', businessDomain, ':', error.message);
      return null;
    }

    if (data?.smart_contract_address) {
      console.log('Found contract address for', businessDomain, ':', data.smart_contract_address);
      return data.smart_contract_address;
    }

    console.log('Business domain not found:', businessDomain);
    return null;
  } catch (error) {
    console.error('Error fetching contract address for', businessDomain, ':', error);
    return null;
  }
}

/**
 * Get user data from BusinessContract
 */
async function getUserDataFromContract(
  contractAddress: string, 
  fullENSName: string
): Promise<{ address: string; totalPoints: number; joinedAt: number } | null> {
  try {
    const contract = new ethers.Contract(contractAddress, BusinessContract_ABI, rpcProvider);
    
    // Call getUserByENSName function - returns [userAddress, totalPoints, ensName, joinedAt]
    const result = await contract.getUserByENSName(fullENSName);
    const [userAddress, totalPoints, ensName, joinedAt] = result;
    
    console.log(`Contract returned:`, { userAddress, totalPoints: totalPoints.toString(), ensName, joinedAt: joinedAt.toString() });
    
    if (userAddress === ethers.constants.AddressZero) {
      console.log(`User address is zero address`);
      return null;
    }

    return {
      address: userAddress,
      totalPoints: totalPoints.toNumber(),
      joinedAt: joinedAt.toNumber()
    };
  } catch (error) {
    console.error('Contract call error:', (error as Error).message);
    return null;
  }
}

export class ContractDatabase implements Database {
  async addr(name: string, coinType: number): Promise<{ addr: string; ttl: number }> {
    console.log(`🔍 Looking up address for ${name}, coinType: ${coinType}`);
    
    try {
      // Parse the ENS name
      const parsed = parseENSName(name);
      if (!parsed) {
        console.log(`Invalid ENS name format: ${name}`);
        return { addr: ZERO_ADDRESS, ttl: 300 };
      }

      // Get business contract address
      const contractAddress = await getBusinessContractAddress(parsed.businessDomain);
      if (!contractAddress) {
        console.log(`Business not found: ${parsed.businessDomain}`);
        return { addr: ZERO_ADDRESS, ttl: 300 };
      }

      // Get user data from contract
      const userData = await getUserDataFromContract(contractAddress, name);
      if (!userData) {
        console.log(`User not found: ${name}`);
        return { addr: ZERO_ADDRESS, ttl: 300 };
      }

      // For now, we only support ETH addresses (coinType 60)
      if (coinType !== ETH_COIN_TYPE) {
        console.log(`Unsupported coin type: ${coinType}`);
        return { addr: ZERO_ADDRESS, ttl: 300 };
      }

      console.log(`✅ Found address for ${name}: ${userData.address}`);

      return {
        addr: userData.address,
        ttl: 300 // 5 minutes TTL
      };
    } catch (error) {
      console.error(`Error looking up address for ${name}:`, (error as Error).message);
      return { addr: ZERO_ADDRESS, ttl: 300 };
    }
  }

  async text(name: string, key: string): Promise<{ value: string; ttl: number }> {
    console.log(`Looking up text record for ${name}, key: ${key}`);
    
    try {
      // Parse the ENS name
      const parsed = parseENSName(name);
      if (!parsed) {
        console.log(`Invalid ENS name format: ${name}`);
        return { value: '', ttl: 300 };
      }

      // Get business contract address
      const contractAddress = await getBusinessContractAddress(parsed.businessDomain);
      if (!contractAddress) {
        console.log(`Business not found: ${parsed.businessDomain}`);
        return { value: '', ttl: 300 };
      }

      // Get user data from contract
      const userData = await getUserDataFromContract(contractAddress, name);
      if (!userData) {
        console.log(`User not found: ${name}`);
        return { value: '', ttl: 300 };
      }

      // Handle different text record keys
      let value = '';
      switch (key.toLowerCase()) {
        case 'email':
          // For now, we don't have email in the contract, return empty
          value = '';
          break;
        case 'points':
          value = userData.totalPoints.toString();
          break;
        case 'joined':
          value = new Date(userData.joinedAt * 1000).toISOString();
          break;
        case 'business':
          value = parsed.businessDomain;
          break;
        case 'contract':
          value = contractAddress;
          break;
        default:
          value = '';
      }

      console.log(`✅ Found text record for ${name}.${key}: ${value}`);

      return {
        value,
        ttl: 300 // 5 minutes TTL
      };
    } catch (error) {
      console.error(`Error looking up text for ${name}:`, (error as Error).message);
      return { value: '', ttl: 300 };
    }
  }

  async contenthash(name: string): Promise<{ contenthash: string; ttl: number }> {
    console.log(`Looking up content hash for ${name}`);
    
    // For now, return empty content hash like the JSON implementation
    return {
      contenthash: EMPTY_CONTENT_HASH,
      ttl: 300
    };
  }
}