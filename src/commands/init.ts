import { Command } from 'commander'
import { createInterface } from 'node:readline'
import { readFileSync } from 'node:fs'
import { loadApiKey, saveEnv, saveConfig, loadConfig } from '../foundation/config.js'
import { brand } from '../foundation/logger.js'
import type { Chain } from '../foundation/types.js'

function ask(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return new Promise((resolve) => { rl.question(question, resolve) })
}

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Configure trenchkit (API key, chain, optional trading key)')
    .action(async () => {
      console.log(brand.header('\n  trenchkit setup\n'))

      const rl = createInterface({ input: process.stdin, output: process.stdout })

      try {
        const existingKey = loadApiKey()
        const keyPrompt = existingKey
          ? `GMGN API Key [${existingKey.slice(0, 8)}...]: `
          : 'GMGN API Key: '

        const apiKey = (await ask(rl, keyPrompt)) || existingKey
        if (!apiKey) {
          console.log(brand.error('API key is required. Get one at https://gmgn.ai/ai'))
          return
        }

        const chainInput = await ask(rl, 'Default chain (sol/bsc/base) [sol]: ')
        const chain: Chain = (['sol', 'bsc', 'base'].includes(chainInput) ? chainInput : 'sol') as Chain

        const pkeyPath = await ask(rl, 'Private key PEM path (optional, for trading) [skip]: ')
        let privateKeyPem: string | undefined
        if (pkeyPath && pkeyPath !== 'skip') {
          try {
            privateKeyPem = readFileSync(pkeyPath.trim(), 'utf-8')
          } catch {
            console.log(brand.warn('Could not read private key file. Skipping trading setup.'))
          }
        }

        saveEnv(apiKey, privateKeyPem)

        const config = loadConfig()
        config.defaultChain = chain
        saveConfig(config)

        console.log(brand.info('Configuration saved to ~/.config/trenchkit/'))
        console.log(brand.info(`Default chain: ${chain}`))
        console.log(brand.info(`Trading: ${privateKeyPem ? 'enabled' : 'disabled (no private key)'}`))
        console.log()
      } finally {
        rl.close()
      }
    })
}
