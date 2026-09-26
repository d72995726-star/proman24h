/**
 * WebSocket Market Data Connector
 * Real-time market data streaming from Deriv WebSocket API
 */

interface WebSocketMessage {
  echo_req?: Record<string, any>;
  msg_type?: string;
  subscription?: {
    id: string;
  };
  tick?: {
    epoch: number;
    quote: number;
    symbol: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

interface MarketConnectorConfig {
  apiToken: string;
  appId: string;
  environment?: 'production' | 'staging';
  onTick?: (epoch: number, quote: number, symbol: string) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

class WebSocketMarketConnector {
  private ws: WebSocket | null = null;
  private config: MarketConnectorConfig;
  private subscriptions: Map<string, string> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 3000;
  private isConnecting: boolean = false;
  private messageQueue: any[] = [];

  constructor(config: MarketConnectorConfig) {
    this.config = {
      environment: 'production',
      ...config,
    };
  }

  /**
   * Connect to Deriv WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;

      try {
        const wsUrl =
          this.config.environment === 'production'
            ? 'wss://ws.derivws.com/websockets/v3'
            : 'wss://staging-ws.derivws.com/websockets/v3';

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.config.onConnect?.();

          // Authorize
          this.authorize();

          // Process queued messages
          while (this.messageQueue.length > 0) {
            const msg = this.messageQueue.shift();
            this.ws?.send(JSON.stringify(msg));
          }

          resolve();
        };

        this.ws.onmessage = (event) => this.handleMessage(JSON.parse(event.data));

        this.ws.onerror = (event) => {
          this.isConnecting = false;
          const error = new Error('WebSocket error');
          this.config.onError?.(error);
          reject(error);
        };

        this.ws.onclose = () => {
          this.isConnecting = false;
          this.config.onDisconnect?.();
          this.attemptReconnect();
        };

        // Set connection timeout
        setTimeout(() => {
          if (this.isConnecting) {
            this.ws?.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000);
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Authorize WebSocket connection
   */
  private authorize(): void {
    this.sendMessage({
      authorize: this.config.apiToken,
    });
  }

  /**
   * Subscribe to market tick stream
   */
  subscribeTick(symbol: string): void {
    const request = {
      ticks: symbol,
      subscribe: 1,
    };

    this.sendMessage(request);
  }

  /**
   * Subscribe to OHLC (Open, High, Low, Close) data
   */
  subscribeOHLC(symbol: string, granularity: number = 60): void {
    const request = {
      ohlc: symbol,
      subscribe: 1,
      granularity,
    };

    this.sendMessage(request);
  }

  /**
   * Get market price statistics
   */
  getPriceStatistics(symbol: string): void {
    const request = {
      ticks_history: symbol,
      adjust_start_time: 1,
      count: 100,
      end: 'latest',
      granularity: 60,
      start: Math.floor(Date.now() / 1000) - 6000, // Last 100 minutes
      style: 'candles',
    };

    this.sendMessage(request);
  }

  /**
   * Unsubscribe from market data
   */
  unsubscribe(subscriptionId: string): void {
    const request = {
      forget: subscriptionId,
    };

    this.sendMessage(request);
  }

  /**
   * Send message to WebSocket
   */
  private sendMessage(message: any): void {
    if (!this.ws) {
      this.messageQueue.push(message);
      return;
    }

    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else if (this.ws.readyState === WebSocket.CONNECTING) {
      this.messageQueue.push(message);
    } else {
      this.messageQueue.push(message);
      this.connect().catch((err) => this.config.onError?.(err));
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(msg: WebSocketMessage): void {
    if (msg.error) {
      this.config.onError?.(new Error(`API Error: ${msg.error.message}`));
      return;
    }

    if (msg.tick) {
      const { epoch, quote, symbol } = msg.tick;
      this.subscriptions.set(symbol, msg.subscription?.id || '');
      this.config.onTick?.(epoch, quote, symbol);
    }

    if (msg.subscription) {
      const symbol = Object.keys(this.subscriptions).find(
        (key) => this.subscriptions.get(key) === msg.subscription?.id,
      );
      if (symbol) {
        this.subscriptions.set(symbol, msg.subscription.id);
      }
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.config.onError?.(new Error('Max reconnection attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch((err) => {
        console.error('Reconnection failed:', err);
      });
    }, delay);
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscriptions.clear();
    this.messageQueue = [];
  }

  /**
   * Get current connection status
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get subscription list
   */
  getSubscriptions(): Map<string, string> {
    return new Map(this.subscriptions);
  }
}

export { WebSocketMarketConnector, MarketConnectorConfig, WebSocketMessage };
export default WebSocketMarketConnector;
