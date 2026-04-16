import { Command } from 'commander'
import chalk from 'chalk'
import { loadApiKey, loadConfig } from '../foundation/config.js'
import { createGmgnClient } from '../foundation/api/client.js'
import { SmartMoneyTracker } from '../modules/smart-money.js'
import { brand, signalColor } from '../foundation/logger.js'
import { truncateAddress, formatUsd } from '../foundation/format.js'
import type { Chain } from '../foundation/types.js'

function formatTimestamp(unix: number): string {
  const d = new Date(unix * 1000)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  const s = d.getSeconds().toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}

export function registerSmartmoneyCommand(program: Command): void {
  program
    .command('smartmoney')
    .description('Track smart money wallets and activity signals')
    .option('--kol', 'show KOL trades only')
    .option('--convergence', 'show convergence alerts only')
    .action(async (_opts, cmd) => {
      const options = cmd.opts() as { kol?: boolean; convergence?: boolean }

      const apiKey = loadApiKey()
      if (!apiKey) {
        console.error(brand.error('No API key found. Run: trenchkit init'))
        process.exitCode = 1
        return
      }

      const config = loadConfig()
      const chain = (program.opts().chain ?? config.defaultChain) as Chain

      try {
        const client = createGmgnClient(apiKey)
        const tracker = new SmartMoneyTracker(client, chain)
        const alerts = await tracker.poll()

        const showOnlyConvergence = options.convergence === true
        const showOnlyKol = options.kol === true

        console.log()
        console.log(brand.header('  Smart Money Feed'))
        console.log(chalk.dim('  ' + '─'.repeat(60)))

        // Gather all trades across alerts for the trade feed
        if (!showOnlyConvergence) {
          let hasAnyTrade = false

          for (const alert of alerts) {
            for (const trade of alert.trades) {
              if (showOnlyKol && trade.source !== 'kol') continue

              hasAnyTrade = true
              const time = chalk.dim(formatTimestamp(trade.timestamp))
              const side =
                trade.side === 'buy'
                  ? chalk.green.bold('BUY ')
                  : chalk.red.bold('SELL')
              const token = chalk.cyan(truncateAddress(alert.tokenAddress, 6))
              const amount = chalk.white(formatUsd(trade.amountUsd))
              const maker = trade.makerName
                ? chalk.yellow(trade.makerName)
                : chalk.dim(truncateAddress(trade.maker))
              const src = chalk.dim(`[${trade.source}]`)

              console.log(`  ${time}  ${side}  ${token}  ${amount}  ${maker}  ${src}`)
            }
          }

          if (!hasAnyTrade) {
            console.log(chalk.dim('  No trades in the last 15 minutes.'))
          }
        }

        // Convergence alerts section
        if (!showOnlyKol) {
          const convergenceAlerts = alerts.filter((a) => a.walletCount >= 2)

          if (convergenceAlerts.length > 0) {
            console.log()
            console.log(brand.header('  Convergence Alerts'))
            console.log(chalk.dim('  ' + '─'.repeat(60)))

            for (const alert of convergenceAlerts) {
              const colorFn = signalColor(alert.signalLevel)
              const token = chalk.cyan(truncateAddress(alert.tokenAddress, 6))
              const strength = colorFn(alert.signalLevel)
              const wallets = chalk.white(`${alert.walletCount} wallets`)
              const score = chalk.dim(`(strength: ${Math.round(alert.strength)})`)
              const diverge = alert.isDivergence ? chalk.yellow(' [DIVERGENCE]') : ''

              console.log(`  ${token}  ${strength}  ${wallets}  ${score}${diverge}`)
            }
          } else if (!showOnlyKol) {
            console.log()
            console.log(chalk.dim('  No convergence signals detected.'))
          }
        }

        console.log(chalk.dim('  ' + '─'.repeat(60)))
        console.log(`  ${brand.footer}`)
        console.log()
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(brand.error(msg))
        process.exitCode = 1
      }
    })
}
