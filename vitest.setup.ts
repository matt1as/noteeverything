import "@testing-library/jest-dom/vitest"
import "whatwg-fetch"
import { TextDecoder, TextEncoder } from "util"
import { vi } from "vitest"
import React from "react"

if (!global.TextEncoder) {
  // @ts-expect-error - TextEncoder needs to be assigned to global for some libraries
  global.TextEncoder = TextEncoder
}

if (!global.TextDecoder) {
  // @ts-expect-error - TextDecoder needs to be assigned to global for some libraries
  global.TextDecoder = TextDecoder
}

if (!window.matchMedia) {
  // Minimal matchMedia stub for components relying on it
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

if (!global.ResizeObserver) {
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // @ts-expect-error - assign to global for jsdom
  global.ResizeObserver = ResizeObserver
}

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: React.ComponentProps<"img">) =>
    React.createElement("img", props),
}))
