import { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, TrendingUp } from 'lucide-react';

// Monochrome Zinc Scale for Heatmap
const HOURLY_COLORS = ['#f4f4f5', '#e4e4e7', '#d4d4d8', '#a1a1aa', '#71717a', '#52525b', '#3f3f46', '#27272a', '#18181b'];

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3881/api';

interface HeatmapData {
    day: string;
    dayIndex: number;
    hour: number;
    count: number;
    revenue: number;
}

interface PeakHoursData {
    heatmap: HeatmapData[];
    peakHours: Array<{ hour: number; count: number; revenue: number }>;
    offPeakHours: Array<{ hour: number; count: number; revenue: number }>;
}

interface PeakHoursHeatmapProps {
    startDate?: string;
    endDate?: string;
}

export default function PeakHoursHeatmap({ startDate, endDate }: PeakHoursHeatmapProps) {
    const [data, setData] = useState<PeakHoursData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [startDate, endDate]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/analytics/peak-hours?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setData(response.data.data);
        } catch (error) {
            console.error('Failed to fetch peak hours data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getColor = (value: number, max: number) => {
        if (value === 0) return '#f4f4f5'; // bg-muted
        const index = Math.ceil((value / max) * (HOURLY_COLORS.length - 1));
        return HOURLY_COLORS[Math.min(index, HOURLY_COLORS.length - 1)];
    };

    if (loading) {
        return (
            <div className="bg-card p-6 rounded-lg shadow-sm border border-border h-[400px] flex items-center justify-center">
                <div className="text-muted-foreground">Loading heatmap data...</div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="bg-card p-6 rounded-lg shadow-sm border border-border h-[400px] flex items-center justify-center">
                <div className="text-muted-foreground">No peak hours data available</div>
            </div>
        );
    }

    const { heatmap, peakHours, offPeakHours } = data;
    const maxCount = Math.max(...heatmap.map(d => d.count));
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="space-y-6">
            <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Peak Hours Heatmap</h2>
                        <p className="text-muted-foreground text-sm">Traffic intensity by day and hour</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <div className="min-w-[800px]">
                        <div className="grid grid-cols-[auto_repeat(24,1fr)] gap-1">
                            {/* Header Row (Hours) */}
                            <div className="h-8"></div>
                            {hours.map(hour => (
                                <div key={hour} className="text-xs text-muted-foreground text-center">
                                    {hour}
                                </div>
                            ))}

                            {/* Data Rows */}
                            {days.map((day, dayIndex) => (
                                <>
                                    <div key={day} className="text-xs font-medium text-muted-foreground flex items-center h-8">
                                        {day}
                                    </div>
                                    {hours.map(hour => {
                                        const cell = heatmap.find(d => d.dayIndex === dayIndex && d.hour === hour);
                                        const count = cell ? cell.count : 0;
                                        return (
                                            <div
                                                key={`${day}-${hour}`}
                                                className="h-8 rounded-sm transition-all hover:scale-110 relative group"
                                                style={{ backgroundColor: getColor(count, maxCount) }}
                                            >
                                                <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-primary text-primary-foreground text-xs rounded pointer-events-none whitespace-nowrap z-10 shadow-lg">
                                                    {count} bookings
                                                </div>
                                            </div>
                                        );
                                    })}
                                </>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2 text-xs text-muted-foreground">
                    <span>Less Busy</span>
                    <div className="flex gap-0.5">
                        {HOURLY_COLORS.map(color => (
                            <div key={color} className="w-4 h-4 rounded-sm" style={{ backgroundColor: color }} />
                        ))}
                    </div>
                    <span>More Busy</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-foreground" /> Busiest Hours
                    </h3>
                    <div className="space-y-3">
                        {peakHours.map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-full bg-primary text-zinc-50 flex items-center justify-center text-xs font-bold text-primary-foreground">
                                        {index + 1}
                                    </span>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-foreground">{item.hour}:00 - {item.hour + 1}:00</span>
                                        <span className="text-xs text-muted-foreground">Average Traffic</span>
                                    </div>
                                </div>
                                <span className="text-lg font-bold text-foreground">{item.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-foreground" /> Quietest Hours
                    </h3>
                    <div className="space-y-3">
                        {offPeakHours.reverse().map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">
                                        {index + 1}
                                    </span>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-foreground">{item.hour}:00 - {item.hour + 1}:00</span>
                                        <span className="text-xs text-muted-foreground">Average Traffic</span>
                                    </div>
                                </div>
                                <span className="text-lg font-bold text-muted-foreground">{item.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
