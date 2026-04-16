import { Command } from 'commander'

export function registerWalletCommand(program: Command): void {
  program
    .command('wallet')
    .description('Analyze wallet profiles and trading history')
    .action(() => {
      console.log('wallet command - not yet implemented')
    })
}
