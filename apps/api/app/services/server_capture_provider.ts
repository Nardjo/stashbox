export interface ServerCaptureResult {
  buffer: Buffer
  width: number
  height: number
}

export interface ServerCaptureCookie {
  name: string
  value: string
  domain: string
  path: string
  expires?: number
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
}

export interface ServerCaptureOptions {
  cookies?: ServerCaptureCookie[]
}

const VIEWPORT = { width: 1280, height: 720 } as const
const NAVIGATION_TIMEOUT_MS = 15_000
const SETTLE_TIMEOUT_MS = 5_000

export default class ServerCaptureProvider {
  async capture(url: string, options: ServerCaptureOptions = {}): Promise<ServerCaptureResult> {
    const { chromium } = await import('playwright')
    const browser = await chromium.launch({ headless: true })

    try {
      const context = await browser.newContext({
        viewport: VIEWPORT,
        deviceScaleFactor: 1,
      })

      try {
        if (options.cookies?.length) {
          await context.addCookies(options.cookies).catch(() => {})
        }

        const page = await context.newPage()

        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: NAVIGATION_TIMEOUT_MS,
        })
        await page.waitForLoadState('networkidle', { timeout: SETTLE_TIMEOUT_MS }).catch(() => {})

        const buffer = await page.screenshot({
          type: 'png',
          fullPage: false,
          animations: 'disabled',
        })

        return {
          buffer,
          width: VIEWPORT.width,
          height: VIEWPORT.height,
        }
      } finally {
        await context.close()
      }
    } finally {
      await browser.close()
    }
  }
}
