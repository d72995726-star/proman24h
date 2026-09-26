'use client';

import React, { useState, useEffect } from 'react';
import { useMarketAnalyzer } from '@/hooks/useMarketAnalyzer';
import { MarketMetrics, TradeSignal } from '@/lib/market-analyzer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, BarChart3, Zap } from 'lucide-react';

interface MarketAnalyzerPanelProps {
  symbol: string;
  onSignalReceived?: (signal: TradeSignal) => void;
}

export function MarketAnalyzerPanel({ symbol, onSignalReceived }: MarketAnalyzerPanelProps) {
  const { metrics, signal, historyLength, addTick, analyzeNow } = useMarketAnalyzer({
    symbol,
    onSignalGenerated: (sig) => onSignalReceived?.(sig),
  });

  const [displayMetrics, setDisplayMetrics] = useState<MarketMetrics | null>(null);
  const [displaySignal, setDisplaySignal] = useState<TradeSignal | null>(null);

  useEffect(() => {
    if (metrics) setDisplayMetrics(metrics);
    if (signal) setDisplaySignal(signal);
  }, [metrics, signal]);

  // Simulate market data (in production, connect to real WebSocket)
  useEffect(() => {
    const interval = setInterval(() => {
      const randomChange = (Math.random() - 0.5) * 100;
      const epoch = Math.floor(Date.now() / 1000);
      const quote = 5000 + randomChange;
      addTick(epoch, quote);
    }, 5000);

    return () => clearInterval(interval);
  }, [addTick]);

  // Auto-analyze every 10 seconds
  useEffect(() => {
    const analysisInterval = setInterval(analyzeNow, 10000);
    return () => clearInterval(analysisInterval);
  }, [analyzeNow]);

  if (!displayMetrics) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Market Analyzer - {symbol}</CardTitle>
          <CardDescription>Waiting for market data ({historyLength} ticks received)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500">Loading market data...</div>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = () => {
    if (displayMetrics.trend === 'BULLISH') return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (displayMetrics.trend === 'BEARISH') return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <BarChart3 className="w-4 h-4 text-gray-600" />;
  };

  const getTrendColor = () => {
    if (displayMetrics.trend === 'BULLISH') return 'bg-green-100 text-green-800';
    if (displayMetrics.trend === 'BEARISH') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getSignalColor = () => {
    if (displaySignal?.action === 'BUY') return 'bg-green-100 text-green-800';
    if (displaySignal?.action === 'SELL') return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  return (
    <div className="w-full space-y-4">
      {/* Main Signal Card */}
      {displaySignal && (
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                <CardTitle>Trade Signal</CardTitle>
              </div>
              <Badge className={getSignalColor()}>{displaySignal.action}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-semibold text-gray-600">Entry</div>
                <div className="text-lg font-bold">${displaySignal.entry.toFixed(4)}</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-600">Confidence</div>
                <div className="text-lg font-bold">{(displaySignal.confidence * 100).toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-600">Take Profit</div>
                <div className="text-lg font-bold text-green-600">${displaySignal.takeProfit.toFixed(4)}</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-600">Stop Loss</div>
                <div className="text-lg font-bold text-red-600">${displaySignal.stopLoss.toFixed(4)}</div>
              </div>
            </div>
            <div className="text-sm text-gray-700 bg-blue-50 p-2 rounded">
              <strong>Reason:</strong> {displaySignal.reason}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getTrendIcon()}
            Market Analysis - {symbol}
          </CardTitle>
          <CardDescription>
            {displayMetrics.trend} · {historyLength} data points
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="indicators">Indicators</TabsTrigger>
              <TabsTrigger value="levels">Levels</TabsTrigger>
              <TabsTrigger value="prediction">Prediction</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded">
                  <div className="text-sm text-gray-600">Current Price</div>
                  <div className="text-2xl font-bold">${displayMetrics.currentPrice.toFixed(4)}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <div className="text-sm text-gray-600">Price Change</div>
                  <div className={`text-2xl font-bold ${displayMetrics.priceChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {displayMetrics.priceChange > 0 ? '+' : ''}
                    {displayMetrics.priceChange.toFixed(2)}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <div className="text-sm text-gray-600">% Change</div>
                  <div className={`text-2xl font-bold ${displayMetrics.percentChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {displayMetrics.percentChange > 0 ? '+' : ''}
                    {displayMetrics.percentChange.toFixed(2)}%
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <div className="text-sm text-gray-600">Volatility</div>
                  <div className="text-2xl font-bold">{displayMetrics.volatility.toFixed(2)}%</div>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <div className="text-sm text-gray-600">Momentum</div>
                  <div className={`text-2xl font-bold ${displayMetrics.momentum > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {displayMetrics.momentum.toFixed(4)}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <div className="text-sm text-gray-600">Trend</div>
                  <Badge className={getTrendColor()}>{displayMetrics.trend}</Badge>
                </div>
              </div>
            </TabsContent>

            {/* Indicators Tab */}
            <TabsContent value="indicators" className="space-y-4">
              <div className="space-y-3">
                <div className="bg-gray-50 p-4 rounded">
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold">RSI (14)</span>
                    <span className="font-bold">{displayMetrics.rsi.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        displayMetrics.rsi > 70 ? 'bg-red-600' : displayMetrics.rsi < 30 ? 'bg-green-600' : 'bg-blue-600'
                      }`}
                      style={{ width: `${displayMetrics.rsi}%` }}
                    />
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded">
                  <div className="font-semibold mb-2">MACD</div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <div className="text-gray-600">Line</div>
                      <div className="font-bold">{displayMetrics.macd.line.toFixed(4)}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Signal</div>
                      <div className="font-bold">{displayMetrics.macd.signal.toFixed(4)}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Histogram</div>
                      <div className={`font-bold ${displayMetrics.macd.histogram > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {displayMetrics.macd.histogram.toFixed(4)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded">
                  <div className="font-semibold mb-2">Moving Averages</div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <div className="text-gray-600">SMA 10</div>
                      <div className="font-bold">${displayMetrics.movingAverage_10.toFixed(4)}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">SMA 20</div>
                      <div className="font-bold">${displayMetrics.movingAverage_20.toFixed(4)}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">SMA 50</div>
                      <div className="font-bold">${displayMetrics.movingAverage_50.toFixed(4)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Support/Resistance Tab */}
            <TabsContent value="levels" className="space-y-4">
              <div>
                <div className="font-semibold mb-2">Support Levels</div>
                <div className="space-y-1">
                  {displayMetrics.support.length > 0 ? (
                    displayMetrics.support.map((level, i) => (
                      <div key={i} className="bg-green-50 p-2 rounded text-sm">
                        <span className="font-semibold">${level.toFixed(4)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 text-sm">No support levels identified</div>
                  )}
                </div>
              </div>

              <div>
                <div className="font-semibold mb-2">Resistance Levels</div>
                <div className="space-y-1">
                  {displayMetrics.resistance.length > 0 ? (
                    displayMetrics.resistance.map((level, i) => (
                      <div key={i} className="bg-red-50 p-2 rounded text-sm">
                        <span className="font-semibold">${level.toFixed(4)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 text-sm">No resistance levels identified</div>
                  )}
                </div>
              </div>

              <div>
                <div className="font-semibold mb-2">Bollinger Bands (20, 2)</div>
                <div className="space-y-1">
                  <div className="bg-gray-50 p-2 rounded text-sm">
                    <div className="text-gray-600">Upper Band</div>
                    <div className="font-bold">${displayMetrics.bollinger.upper.toFixed(4)}</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded text-sm">
                    <div className="text-gray-600">Middle Band</div>
                    <div className="font-bold">${displayMetrics.bollinger.middle.toFixed(4)}</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded text-sm">
                    <div className="text-gray-600">Lower Band</div>
                    <div className="font-bold">${displayMetrics.bollinger.lower.toFixed(4)}</div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Prediction Tab */}
            <TabsContent value="prediction" className="space-y-4">
              <div className="bg-blue-50 p-4 rounded border border-blue-200">
                <div className="font-semibold mb-3">AI Price Prediction</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Next Direction</div>
                    <Badge className={displayMetrics.prediction.nextDirection === 'UP' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {displayMetrics.prediction.nextDirection}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Confidence</div>
                    <div className="text-lg font-bold">{(displayMetrics.prediction.confidence * 100).toFixed(1)}%</div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-sm text-gray-600">Target Price</div>
                  <div className="text-2xl font-bold text-blue-600">${displayMetrics.prediction.targetPrice.toFixed(4)}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Expected Movement: {((displayMetrics.prediction.targetPrice - displayMetrics.currentPrice) / displayMetrics.currentPrice * 100).toFixed(2)}%
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default MarketAnalyzerPanel;
