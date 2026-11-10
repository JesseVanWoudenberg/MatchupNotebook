import type { AppFs } from '@/persistence'

/**
 * In-memory file system for persistence tests. `failNextWrite` makes the next
 * writeText throw, to prove that a failed save leaves the real file alone.
 */
export class FakeAppFs implements AppFs {
  readonly files = new Map<string, string | Uint8Array>()
  readonly directories = new Set<string>()
  failNextWrite = false

  async exists(path: string): Promise<boolean> {
    return this.files.has(path) || this.directories.has(path)
  }

  async readText(path: string): Promise<string> {
    const content = this.files.get(path)
    if (typeof content !== 'string') throw new Error(`No such text file: ${path}`)
    return content
  }

  async writeText(path: string, text: string): Promise<void> {
    if (this.failNextWrite) {
      this.failNextWrite = false
      throw new Error(`Disk full while writing ${path}`)
    }
    this.files.set(path, text)
  }

  async writeBytes(path: string, bytes: Uint8Array): Promise<void> {
    this.files.set(path, bytes)
  }

  async rename(from: string, to: string): Promise<void> {
    const content = this.files.get(from)
    if (content === undefined) throw new Error(`No such file: ${from}`)
    this.files.delete(from)
    this.files.set(to, content)
  }

  async copy(from: string, to: string): Promise<void> {
    const content = this.files.get(from)
    if (content === undefined) throw new Error(`No such file: ${from}`)
    this.files.set(to, content)
  }

  async remove(path: string): Promise<void> {
    this.files.delete(path)
  }

  async mkdir(path: string): Promise<void> {
    this.directories.add(path)
  }

  textOf(path: string): string | undefined {
    const content = this.files.get(path)
    return typeof content === 'string' ? content : undefined
  }

  paths(): string[] {
    return [...this.files.keys()].sort()
  }
}
