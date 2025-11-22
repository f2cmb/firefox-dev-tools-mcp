import { firefox, type Browser, type Page } from 'playwright';

const DEFAULT_NAVIGATION_TIMEOUT = 30000;

/**
 * Manages Firefox browser instance and page via Playwright
 */
export class FirefoxBrowser {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private headless: boolean;
  private connecting: boolean = false;

  constructor(headless: boolean = false) {
    this.headless = headless;
  }

  /**
   * Launch Firefox and create a new page
   */
  async connect(): Promise<Page> {
    // Return existing page if already connected
    if (this.page) {
      return this.page;
    }

    // Prevent race conditions on concurrent connect calls
    if (this.connecting) {
      // Wait for the connection to complete
      while (this.connecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (this.page) {
        return this.page;
      }
    }

    this.connecting = true;

    try {
      console.error('Launching Firefox...');
      this.browser = await firefox.launch({
        headless: this.headless,
      });

      this.page = await this.browser.newPage();
      console.error('Firefox ready');

      return this.page;
    } catch (error) {
      // Cleanup browser if page creation failed
      if (this.browser) {
        await this.browser.close().catch(() => {});
        this.browser = null;
      }
      throw error;
    } finally {
      this.connecting = false;
    }
  }

  /**
   * Get the current page
   */
  getPage(): Page {
    if (!this.page) {
      throw new Error('Firefox not connected. Call connect() first.');
    }
    return this.page;
  }

  /**
   * Navigate to URL with error handling
   */
  async goto(url: string, timeout: number = DEFAULT_NAVIGATION_TIMEOUT): Promise<void> {
    const page = this.getPage();

    // Validate URL protocol
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error(`Invalid protocol: ${parsedUrl.protocol}. Only HTTP and HTTPS are supported.`);
      }
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(`Invalid URL format: ${url}`);
      }
      throw error;
    }

    console.error(`Navigating to ${url}`);

    try {
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Timeout')) {
          throw new Error(`Navigation timeout after ${timeout}ms for ${url}`);
        }
        if (error.message.includes('net::')) {
          throw new Error(`Network error navigating to ${url}: ${error.message}`);
        }
        throw new Error(`Failed to navigate to ${url}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      console.error('Firefox closed');
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.page !== null;
  }
}
