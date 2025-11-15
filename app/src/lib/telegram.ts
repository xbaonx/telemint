/**
 * Telegram WebApp SDK integration
 */

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    chat?: any;
    start_param?: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  BackButton: {
    isVisible: boolean;
    show(): void;
    hide(): void;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText(text: string): void;
    show(): void;
    hide(): void;
    enable(): void;
    disable(): void;
    showProgress(leaveActive?: boolean): void;
    hideProgress(): void;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
  };
  HapticFeedback: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
    selectionChanged(): void;
  };
  ready(): void;
  expand(): void;
  close(): void;
  showPopup(params: {
    title?: string;
    message: string;
    buttons?: Array<{ id?: string; type?: string; text?: string }>;
  }, callback?: (buttonId: string) => void): void;
  showAlert(message: string, callback?: () => void): void;
  showConfirm(message: string, callback?: (confirmed: boolean) => void): void;
  openLink(url: string, options?: { try_instant_view?: boolean }): void;
  openTelegramLink(url: string): void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

class TelegramService {
  private webApp: TelegramWebApp | null = null;

  constructor() {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      this.webApp = window.Telegram.WebApp;
      this.init();
    }
  }

  /**
   * Initialize Telegram WebApp
   */
  private init() {
    if (!this.webApp) return;

    // Notify Telegram that the app is ready
    this.webApp.ready();

    // Expand to full height
    this.webApp.expand();

    // Apply theme
    this.applyTheme();

    console.log('📱 Telegram WebApp initialized:', {
      version: this.webApp.version,
      platform: this.webApp.platform,
      colorScheme: this.webApp.colorScheme,
    });
  }

  /**
   * Apply Telegram theme to the app
   */
  applyTheme() {
    if (!this.webApp) return;

    const { themeParams, colorScheme } = this.webApp;
    const root = document.documentElement;

    // Apply theme colors
    if (themeParams.bg_color) {
      root.style.setProperty('--tg-bg-color', themeParams.bg_color);
      document.body.style.backgroundColor = themeParams.bg_color;
    }

    if (themeParams.text_color) {
      root.style.setProperty('--tg-text-color', themeParams.text_color);
    }

    if (themeParams.button_color) {
      root.style.setProperty('--tg-button-color', themeParams.button_color);
    }

    // Apply dark/light mode class
    if (colorScheme === 'dark') {
      document.body.classList.add('dark');
      document.body.classList.add('tg-viewport-dark');
    } else {
      document.body.classList.add('tg-viewport');
    }
  }

  /**
   * Check if running inside Telegram
   */
  isAvailable(): boolean {
    return this.webApp !== null;
  }

  /**
   * Get user data
   */
  getUser() {
    return this.webApp?.initDataUnsafe.user;
  }

  /**
   * Get color scheme
   */
  getColorScheme(): 'light' | 'dark' {
    return this.webApp?.colorScheme || 'light';
  }

  /**
   * Show alert
   */
  showAlert(message: string, callback?: () => void) {
    if (this.webApp) {
      try {
        this.webApp.showAlert(message, callback);
      } catch {
        alert(message);
        callback?.();
      }
    } else {
      alert(message);
      callback?.();
    }
  }

  /**
   * Show confirm dialog
   */
  showConfirm(message: string, callback?: (confirmed: boolean) => void) {
    if (this.webApp) {
      try {
        this.webApp.showConfirm(message, callback);
      } catch {
        const confirmed = confirm(message);
        callback?.(confirmed);
      }
    } else {
      const confirmed = confirm(message);
      callback?.(confirmed);
    }
  }

  /**
   * Haptic feedback
   */
  haptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning') {
    if (!this.webApp?.HapticFeedback) return;
    try {
      if (type === 'success' || type === 'error' || type === 'warning') {
        this.webApp.HapticFeedback.notificationOccurred(type);
      } else {
        this.webApp.HapticFeedback.impactOccurred(type);
      }
    } catch {}
  }

  /**
   * Open external link
   */
  openLink(url: string) {
    if (this.webApp) {
      this.webApp.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  }

  /**
   * Close the WebApp
   */
  close() {
    this.webApp?.close();
  }

  /**
   * Get init data for backend verification
   */
  getInitData(): string {
    return this.webApp?.initData || '';
  }
}

// Export singleton instance
export const telegram = new TelegramService();
