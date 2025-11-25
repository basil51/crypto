'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface PriceVolumeChartProps {
  data: Array<{
    timestamp: string;
    price: number;
    volume: number;
  }>;
  timeframe: string;
}

export default function PriceVolumeChart({ data, timeframe }: PriceVolumeChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (!data || data.length === 0) {
      setChartData([]);
      return;
    }

    // Format data for chart
    // Remove duplicates and sort by timestamp
    const uniqueData = Array.from(
      new Map(data.map(item => [item.timestamp, item])).values()
    ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const formatted = uniqueData.map((point, index) => {
      const date = new Date(point.timestamp);
      let timeLabel = '';
      
      // Show fewer labels for longer timeframes to avoid crowding
      const showLabel = timeframe === '1h' || timeframe === '24h' 
        ? true 
        : index % Math.ceil(uniqueData.length / 10) === 0 || index === uniqueData.length - 1;
      
      switch (timeframe) {
        case '1h':
          timeLabel = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
          break;
        case '24h':
          timeLabel = `${String(date.getHours()).padStart(2, '0')}:00`;
          break;
        case '7d':
          timeLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          break;
        case '30d':
          timeLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          break;
        case '1y':
          timeLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          break;
        default:
          timeLabel = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      }

      return {
        time: showLabel ? timeLabel : '',
        price: point.price,
        volume: point.volume,
        fullDate: point.timestamp,
        timestamp: date.getTime(), // For sorting
      };
    });

    setChartData(formatted);
  }, [data, timeframe]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-gray-400">
        <div className="text-center">
          <p>No price data available</p>
          <p className="text-sm mt-2">Price history will appear here once data is available</p>
        </div>
      </div>
    );
  }

  // Calculate price change
  const firstPrice = chartData[0]?.price || 0;
  const lastPrice = chartData[chartData.length - 1]?.price || 0;
  const priceChange = lastPrice - firstPrice;
  const priceChangePercent = firstPrice > 0 ? ((priceChange / firstPrice) * 100) : 0;
  const isPositive = priceChange >= 0;

  // Format price
  const formatPrice = (price: number) => {
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  // Format volume
  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(2)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(2)}K`;
    return `$${volume.toFixed(2)}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-black/90 border border-purple-500/30 rounded-lg p-3 backdrop-blur">
          <p className="text-sm text-gray-400 mb-1">{data.fullDate ? new Date(data.fullDate).toLocaleString() : ''}</p>
          <p className="text-white font-semibold">
            Price: <span className="text-purple-400">{formatPrice(data.price)}</span>
          </p>
          <p className="text-white font-semibold">
            Volume: <span className="text-pink-400">{formatVolume(data.volume)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      {/* Price Summary */}
      <div className="mb-4 flex items-center gap-4">
        <div>
          <p className="text-sm text-gray-400">Current Price</p>
          <p className="text-2xl font-bold text-white">{formatPrice(lastPrice)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Change ({timeframe})</p>
          <p className={`text-xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{formatPrice(priceChange)} ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
          </p>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis
            dataKey="time"
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
            tick={{ fill: '#9ca3af' }}
            interval="preserveStartEnd"
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            yAxisId="price"
            orientation="left"
            stroke="#9333ea"
            style={{ fontSize: '12px' }}
            tick={{ fill: '#9333ea' }}
            tickFormatter={formatPrice}
          />
          <YAxis
            yAxisId="volume"
            orientation="right"
            stroke="#ec4899"
            style={{ fontSize: '12px' }}
            tick={{ fill: '#ec4899' }}
            tickFormatter={formatVolume}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
            formatter={(value) => (
              <span className="text-sm text-gray-300">{value}</span>
            )}
          />
          <Area
            yAxisId="price"
            type="monotone"
            dataKey="price"
            stroke="#9333ea"
            strokeWidth={2}
            fill="url(#priceGradient)"
            name="Price"
          />
          <Area
            yAxisId="volume"
            type="monotone"
            dataKey="volume"
            stroke="#ec4899"
            strokeWidth={1}
            fill="url(#volumeGradient)"
            name="Volume"
            opacity={0.6}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

