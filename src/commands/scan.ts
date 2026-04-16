import { Command } from 'commander'

export function registerScanCommand(program: Command): void {
  program
    .command('scan')
    .description('Scan trending tokens with conviction scores')
    .action(() => {
      console.log('scan command - not yet implemented')
    })
}
