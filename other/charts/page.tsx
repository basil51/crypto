"use client";

import { createChart, ColorType, ISeriesApi } from "lightweight-charts";
import { useEffect, useRef } from "react";

interface Candle {
    time: number;           // unix timestamp
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface Props {
    data: Candle[];
    height?: number;
}

export default function PriceChart({ data, height = 400 }: Props) {
    const chartContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: height,
            layout: {
                background: { type: ColorType.Solid, color: "#ffffff" },
                textColor: "#333",
            },
            grid: {
                vertLines: { color: "#e1e1e1" },
                horzLines: { color: "#e1e1e1" },
            },
            crosshair: {
                mode: 1,
            },
        });

        // 📌 Candlestick series
        const candleSeries = chart.addCandlestickSeries({
            upColor: "#0f9d58",
            downColor: "#db4437",
            borderUpColor: "#0f9d58",
            borderDownColor: "#db4437",
            wickUpColor: "#0f9d58",
            wickDownColor: "#db4437",
        });

        candleSeries.setData(
            data.map((c) => ({
                time: c.time,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
            }))
        );

        // 📌 Volume histogram below the candles
        const volumeSeries = chart.addHistogramSeries({
            priceFormat: {
                type: "volume",
            },
            priceScaleId: "",
            color: "#26a69a",
            scaleMargins: {
                top: 0.8,   // candles above
                bottom: 0,  // volume below
            },
        });

        volumeSeries.setData(
            data.map((c) => ({
                time: c.time,
                value: c.volume,
                color: c.close >= c.open ? "#0f9d58" : "#db4437",
            }))
        );

        // Resize chart on window resize
        const handleResize = () => {
            chart.applyOptions({
                width: chartContainerRef.current?.clientWidth,
            });
        };
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            chart.remove();
        };
    }, [data, height]);

    return <div ref={chartContainerRef} className="w-full" />;
}



//--------------------------------

export async function fetchCandles(symbol: string) {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=300`;

    const res = await fetch(url);
    const raw = await res.json();

    return raw.map((c: any) => ({
        time: c[0] / 1000,
        open: parseFloat(c[1]),
        high: parseFloat(c[2]),
        low: parseFloat(c[3]),
        close: parseFloat(c[4]),
        volume: parseFloat(c[5]),
    }));
}

//--------------------------------  

import PriceChart from "@/components/PriceChart";
import { fetchCandles } from "@/lib/binance";

export default async function TokenPage({ params }: any) {
    const candles = await fetchCandles(params.symbol);

    return (
        <div className="p-4">
            <h1 className="text-xl font-bold mb-4">{params.symbol} Price Chart</h1>
            <PriceChart data={candles} height={450} />
        </div>
    );
}
