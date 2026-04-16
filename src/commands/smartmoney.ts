import { Command } from 'commander'

export function registerSmartmoneyCommand(program: Command): void {
  program
    .command('smartmoney')
    .description('Track smart money wallets and activity signals')
    .action(() => {
      console.log('smartmoney command - not yet implemented')
    })
}
