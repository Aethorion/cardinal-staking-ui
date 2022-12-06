import type { AccountData } from '@cardinal/common'
import type { IdlAccountData } from '@cardinal/rewards-center'
import { rewardsCenterProgram } from '@cardinal/rewards-center'
import type { StakePoolData } from '@cardinal/staking/dist/cjs/programs/stakePool'
import {
  STAKE_POOL_ADDRESS,
  STAKE_POOL_IDL,
} from '@cardinal/staking/dist/cjs/programs/stakePool'
import { BorshAccountsCoder, utils } from '@project-serum/anchor'
import { useWallet } from '@solana/wallet-adapter-react'
import type { Connection, PublicKey } from '@solana/web3.js'
import { asEmptyAnchorWallet } from 'common/Wallets'
import { useEnvironmentCtx } from 'providers/EnvironmentProvider'
import { useQuery } from 'react-query'

import {
  isStakePoolV2,
  stakePoolDataToV2,
  useStakePoolData,
} from './useStakePoolData'

export const getStakePoolsByAuthority = async (
  connection: Connection,
  user: PublicKey
): Promise<AccountData<StakePoolData>[]> => {
  const programAccounts = await connection.getProgramAccounts(
    STAKE_POOL_ADDRESS,
    {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: utils.bytes.bs58.encode(
              BorshAccountsCoder.accountDiscriminator('stakePool')
            ),
          },
        },
        {
          memcmp: {
            offset: 17,
            bytes: user.toBase58(),
          },
        },
      ],
    }
  )
  const stakePoolDatas: AccountData<StakePoolData>[] = []
  const coder = new BorshAccountsCoder(STAKE_POOL_IDL)
  programAccounts.forEach((account) => {
    try {
      const stakePoolData: StakePoolData = coder.decode(
        'stakePool',
        account.account.data
      )
      if (stakePoolData) {
        stakePoolDatas.push({
          ...account,
          parsed: stakePoolData,
        })
      }
      // eslint-disable-next-line no-empty
    } catch (e) {}
  })
  return stakePoolDatas.sort((a, b) =>
    a.pubkey.toBase58().localeCompare(b.pubkey.toBase58())
  )
}

export const useStakePoolsByAuthority = () => {
  const { secondaryConnection } = useEnvironmentCtx()
  const { data: stakePoolData } = useStakePoolData()
  const wallet = useWallet()

  return useQuery<
    Pick<IdlAccountData<'stakePool'>, 'pubkey' | 'parsed'>[] | undefined
  >(
    ['useStakePoolsByAuthority', wallet.publicKey?.toString()],
    async () => {
      if (!wallet.publicKey || !stakePoolData?.parsed) return
      if (isStakePoolV2(stakePoolData.parsed)) {
        const program = rewardsCenterProgram(
          secondaryConnection,
          asEmptyAnchorWallet(wallet)
        )
        const stakePools = await program.account.stakePool.all([
          {
            memcmp: {
              offset: 10,
              bytes: wallet.publicKey.toString(),
            },
          },
        ])
        return stakePools.map((e) => {
          return { pubkey: e.publicKey, parsed: e.account }
        })
      } else {
        return (
          await getStakePoolsByAuthority(secondaryConnection, wallet.publicKey)
        ).map((pool) => {
          return {
            pubkey: pool.pubkey,
            parsed: stakePoolDataToV2(pool.parsed),
          }
        })
      }
    },
    {
      enabled: !!wallet.publicKey,
    }
  )
}
