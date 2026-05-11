export interface ServerCaptureResult {
  buffer: Buffer
  width: number
  height: number
}

const VIEWPORT = { width: 1280, height: 720 } as const
const NAVIGATION_TIMEOUT_MS = 15_000
const SETTLE_TIMEOUT_MS = 5_000

export default class ServerCaptureProvider {
  async capture(url: string): Promise<ServerCaptureResult> {
    const { chromium } = await import('playwright')
    const browser = await chromium.launch({ headless: true })

    try {
      const page = await browser.newPage({
        viewport: VIEWPORT,
        deviceScaleFactor: 1,
      })

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
      await browser.close()
    }
  }
}
