import { Command } from 'commander'

export function registerResearchCommand(program: Command): void {
  program
    .command('research')
    .description('Deep research report on a token address')
    .action(() => {
      console.log('research command - not yet implemented')
    })
}
