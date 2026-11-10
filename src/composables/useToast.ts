import { ref } from 'vue'

export type ToastKind = 'info' | 'error'

export interface Toast {
  id: number
  message: string
  kind: ToastKind
}

const TOAST_DURATION_MS = 6000

// Module-level so every caller shares the same list.
const toasts = ref<Toast[]>([])
let nextId = 1

export function useToast() {
  function dismiss(id: number): void {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  function show(message: string, kind: ToastKind = 'info'): void {
    const id = nextId++
    toasts.value.push({ id, message, kind })
    setTimeout(() => dismiss(id), TOAST_DURATION_MS)
  }

  function error(message: string): void {
    show(message, 'error')
  }

  return { toasts, show, error, dismiss }
}
