import { tryPublicKey } from '@cardinal/namespaces-components'
import { PublicKey } from '@solana/web3.js'
import { stakePoolMetadatas } from 'api/mapping'
import { useRouter } from 'next/router'
import { useStakePoolMetadataCtx } from 'providers/StakePoolMetadataProvider'

export const useStakePoolId = () => {
const stakePoolId = "6NL1Dw5bEPSFDdFMPuZiYzDQdUXLF84VUZzK5D6v4Jg1"
  const { stakePoolMetadata } = useStakePoolMetadataCtx()

  if (stakePoolMetadata)
    return new PublicKey(stakePoolMetadata.stakePoolAddress)
  const nameMapping = stakePoolMetadatas.find((p) => p.name === stakePoolId)
  const addressMapping = stakePoolMetadatas.find(
    (p) => p.stakePoolAddress.toString() === stakePoolId
  )
  const publicKey =
    nameMapping?.stakePoolAddress ||
    addressMapping?.stakePoolAddress ||
    tryPublicKey(stakePoolId)

  return publicKey
}
