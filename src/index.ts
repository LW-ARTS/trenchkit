import { Command } from 'commander'
import { registerInitCommand } from './commands/init.js'
import { registerConfigCommand } from './commands/config.js'
import { registerScanCommand } from './commands/scan.js'
import { registerWalletCommand } from './commands/wallet.js'
import { registerSmartmoneyCommand } from './commands/smartmoney.js'
import { registerResearchCommand } from './commands/research.js'
import { registerTradeCommand } from './commands/trade.js'

const program = new Command()

program
  .name('trenchkit')
  .description('Real-time crypto intelligence pipeline built on GMGN OpenAPI')
  .version('0.1.0')
  .option('-c, --chain <chain>', 'blockchain network (sol, bsc, base)', 'sol')

registerInitCommand(program)
registerConfigCommand(program)
registerScanCommand(program)
registerWalletCommand(program)
registerSmartmoneyCommand(program)
registerResearchCommand(program)
registerTradeCommand(program)

program.parse()
