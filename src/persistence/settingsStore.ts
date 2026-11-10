import { DEFAULT_SETTINGS, Settings } from '@/schema/settings'
import { joinPath, type AppFs } from './appFs'

export const SETTINGS_FILE_NAME = 'settings.json'

/** Where app settings live. Separate from the notebook, which it points at. */
export interface SettingsStore {
  /** Defaults when nothing is saved yet or the file is unreadable. Never throws. */
  load(): Promise<Settings>
  save(settings: Settings): Promise<void>
}

/**
 * Settings carry no user data, so a broken file is replaced by defaults and
 * the next save overwrites it. That is deliberately looser than the notebook.
 */
export function parseSettings(text: string): Settings {
  try {
    const result = Settings.safeParse(JSON.parse(text))
    return result.success ? result.data : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function serializeSettings(settings: Settings): string {
  return `${JSON.stringify(settings, null, 2)}\n`
}

export class FileSettingsStore implements SettingsStore {
  constructor(
    private readonly fs: AppFs,
    readonly directory: string,
  ) {}

  get path(): string {
    return joinPath(this.directory, SETTINGS_FILE_NAME)
  }

  async load(): Promise<Settings> {
    try {
      if (!(await this.fs.exists(this.path))) return DEFAULT_SETTINGS
      return parseSettings(await this.fs.readText(this.path))
    } catch (error: unknown) {
      console.warn('Could not read settings, using defaults', error)
      return DEFAULT_SETTINGS
    }
  }

  async save(settings: Settings): Promise<void> {
    await this.fs.mkdir(this.directory)
    await this.fs.writeText(this.path, serializeSettings(settings))
  }
}

export class MemorySettingsStore implements SettingsStore {
  private text: string | undefined

  constructor(initial?: Settings) {
    if (initial) this.text = serializeSettings(initial)
  }

  async load(): Promise<Settings> {
    return this.text === undefined ? DEFAULT_SETTINGS : parseSettings(this.text)
  }

  async save(settings: Settings): Promise<void> {
    this.text = serializeSettings(settings)
  }
}
