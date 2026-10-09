// The plugin data directory on this machine, for the hero's install snippet.
//
// `cmd + fmt + zx` counts as one button so the whole line can be pasted at once.
export interface InstallOption {
  id: string
  label: string
  segments: string[]
  note?: string
}

/**
 * The two environment-dependent installs are shown rather than detected.
 *
 * Sniffing the user agent to pick one would either flash the wrong command during hydration or
 * mismatch it, and a reader who lands on the site to install something is not confused by
 * seeing both a shell and a PowerShell line.
 */
export const installOptions: InstallOption[] = [
  {
    id: 'cargo',
    label: 'Cargo',
    segments: ['cargo install pmpx'],
  },
  {
    id: 'unix',
    label: 'Linux / macOS',
    segments: ['curl -LsSf', 'https://pmpx.dev/install.sh', '| sh'],
  },
  {
    id: 'windows',
    label: 'Windows',
    segments: ['irm https://pmpx.dev/install.ps1 | iex'],
  },
]
