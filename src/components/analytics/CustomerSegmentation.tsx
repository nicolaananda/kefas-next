import { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Users, Star, AlertTriangle, XCircle } from 'lucide-react';

const COLORS = ['#18181b', '#52525b', '#a1a1aa', '#d4d4d8', '#f4f4f5']; // Monochrome Zinc
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3881/api';

interface Customer {
    customerId: number;
    name: string;
    phone: string;
    recency: number;
    frequency: number;
    monetary: number;
    rfmScore: number;
    segment: string;
}

interface SegmentationData {
    segments: Record<string, Customer[]>;
    summary: Record<string, number>;
}

export default function CustomerSegmentation() {
    const [data, setData] = useState<{ segments: { name: string; value: number }[], total: number } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API_BASE_URL}/analytics/customer-segmentation`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.data.success) {
                    const segments = [
                        { name: 'VIP', value: res.data.data.summary.VIP },
                        { name: 'Regular', value: res.data.data.summary.Regular },
                        { name: 'Occasional', value: res.data.data.summary.Occasional },
                        { name: 'At-Risk', value: res.data.data.summary['At-Risk'] },
                        { name: 'Lost', value: res.data.data.summary.Lost }
                    ].filter(item => item.value > 0);

                    setData({
                        segments,
                        total: res.data.data.summary.total
                    });
                }
            } catch (error) {
                console.error('Failed to fetch individual segmentation data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="bg-card p-6 rounded-lg shadow-sm border border-border h-[400px] flex items-center justify-center">
                <div className="text-muted-foreground">Loading segmentation data...</div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="bg-card p-6 rounded-lg shadow-sm border border-border h-[400px] flex items-center justify-center">
                <div className="text-muted-foreground">No segmentation data available</div>
            </div>
        );
    }

    return (
        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
            <h2 className="text-xl font-bold mb-2 text-foreground">Customer Segments</h2>
            <p className="text-muted-foreground text-sm mb-6">Distribution based on RFM analysis</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Pie Chart */}
                <div className="h-[300px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data.segments}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.segments.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#fff', borderColor: '#e4e4e7', color: '#18181b' }}
                                itemStyle={{ color: '#18181b' }}
                            />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Legend/Details */}
                <div className="flex flex-col justify-center space-y-4">
                    {data.segments.map((segment, index) => (
                        <div key={segment.name} className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                />
                                <span className="font-medium text-foreground">{segment.name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-foreground font-bold">{segment.value}</span>
                                <span className="text-xs text-muted-foreground w-12 text-right">
                                    {((segment.value / data.total) * 100).toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    ))}

                    <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                        <span className="text-muted-foreground font-medium">Total Customers</span>
                        <span className="text-2xl font-bold text-foreground">{data.total}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
