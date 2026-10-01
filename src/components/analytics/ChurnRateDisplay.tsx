import { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { UserX, UserCheck, AlertTriangle, TrendingDown } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3881/api';

interface ChurnData {
    churnRate: number;
    retentionRate: number;
    activeCustomers: number;
    churnedCustomers: number;
    atRiskCustomers: number;
    totalCustomers: number;
    atRiskList: Array<{
        id: number;
        name: string;
        phone: string;
        daysSinceVisit: number;
        totalVisits: number;
    }>;
    churnedList: Array<{
        id: number;
        name: string;
        phone: string;
        daysSinceVisit: number;
        totalVisits: number;
    }>;
}

export default function ChurnRateDisplay() {
    const [data, setData] = useState<ChurnData | null>(null);
    const [loading, setLoading] = useState(true);
    const [periodDays, setPeriodDays] = useState(90);

    useEffect(() => {
        fetchData();
    }, [periodDays]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `${API_BASE_URL}/analytics/churn-rate?periodDays=${periodDays}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            setData(response.data.data);
        } catch (error) {
            console.error('Failed to fetch churn rate data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 bg-card border border-border rounded-lg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center h-64 bg-card border border-border rounded-lg">
                <div className="text-muted-foreground">No churn data available</div>
            </div>
        );
    }

    const chartData = [
        { name: 'Active', value: data.activeCustomers, color: '#18181b' }, // Zinc-900
        { name: 'At Risk', value: data.atRiskCustomers, color: '#71717a' }, // Zinc-500
        { name: 'Churned', value: data.churnedCustomers, color: '#d4d4d8' } // Zinc-300
    ];

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Churn Rate</p>
                            <p className="text-3xl font-bold text-foreground mt-1">
                                {data.churnRate.toFixed(1)}%
                            </p>
                        </div>
                        <TrendingDown className="w-8 h-8 text-foreground" />
                    </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Retention Rate</p>
                            <p className="text-3xl font-bold text-foreground mt-1">
                                {data.retentionRate.toFixed(1)}%
                            </p>
                        </div>
                        <UserCheck className="w-8 h-8 text-muted-foreground" />
                    </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">At Risk</p>
                            <p className="text-3xl font-bold text-foreground mt-1">
                                {data.atRiskCustomers}
                            </p>
                        </div>
                        <AlertTriangle className="w-8 h-8 text-muted-foreground" />
                    </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Churned</p>
                            <p className="text-3xl font-bold text-foreground mt-1">
                                {data.churnedCustomers}
                            </p>
                        </div>
                        <UserX className="w-8 h-8 text-zinc-300" />
                    </div>
                </div>
            </div>

            {/* Period Selector */}
            <div className="flex gap-2">
                {[30, 60, 90, 180].map(period => (
                    <button
                        key={period}
                        onClick={() => setPeriodDays(period)}
                        className={`px-4 py-2 rounded-lg transition-all ${periodDays === period
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'bg-card text-muted-foreground border border-border hover:bg-background'
                            }`}
                    >
                        {period} Days
                    </button>
                ))}
            </div>

            {/* Customer Distribution Chart */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-foreground mb-4">Customer Status Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                        <XAxis dataKey="name" stroke="#71717a" tick={{ fontSize: 12 }} />
                        <YAxis stroke="#71717a" tick={{ fontSize: 12 }} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #e4e4e7',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="value" stroke="#18181b" strokeWidth={2} name="Customers" dot={{ r: 4, fill: '#18181b' }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* At-Risk Customers */}
            {data.atRiskList.length > 0 && (
                <div className="bg-card border border-border rounded-lg p-6 overflow-x-auto shadow-sm">
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-foreground" />
                        At-Risk Customers (Need Attention!)
                    </h3>
                    <table className="w-full text-sm">
                        <thead className="bg-background">
                            <tr>
                                <th className="text-left py-3 px-6 text-muted-foreground font-medium">Customer</th>
                                <th className="text-right py-3 px-6 text-muted-foreground font-medium">Days Since Visit</th>
                                <th className="text-right py-3 px-6 text-muted-foreground font-medium">Total Visits</th>
                                <th className="text-right py-3 px-6 text-muted-foreground font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200">
                            {data.atRiskList.slice(0, 10).map((customer, index) => (
                                <tr key={index} className="hover:bg-background transition-colors">
                                    <td className="py-3 px-6">
                                        <div>
                                            <p className="text-foreground font-medium">{customer.name}</p>
                                            <p className="text-xs text-muted-foreground">{customer.phone}</p>
                                        </div>
                                    </td>
                                    <td className="py-3 px-6 text-right text-foreground font-semibold">
                                        {customer.daysSinceVisit} days
                                    </td>
                                    <td className="py-3 px-6 text-right text-muted-foreground">
                                        {customer.totalVisits}
                                    </td>
                                    <td className="py-3 px-6 text-right">
                                        <span className="px-2 py-1 rounded text-xs bg-muted text-muted-foreground border border-border">
                                            At Risk
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Churned Customers */}
            {data.churnedList.length > 0 && (
                <div className="bg-card border border-border rounded-lg p-6 overflow-x-auto shadow-sm">
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <UserX className="w-5 h-5 text-muted-foreground" />
                        Churned Customers (High-Value First)
                    </h3>
                    <table className="w-full text-sm">
                        <thead className="bg-background">
                            <tr>
                                <th className="text-left py-3 px-6 text-muted-foreground font-medium">Customer</th>
                                <th className="text-right py-3 px-6 text-muted-foreground font-medium">Days Since Visit</th>
                                <th className="text-right py-3 px-6 text-muted-foreground font-medium">Total Visits</th>
                                <th className="text-right py-3 px-6 text-muted-foreground font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200">
                            {data.churnedList.slice(0, 10).map((customer, index) => (
                                <tr key={index} className="hover:bg-background transition-colors">
                                    <td className="py-3 px-6">
                                        <div>
                                            <p className="text-foreground font-medium">{customer.name}</p>
                                            <p className="text-xs text-muted-foreground">{customer.phone}</p>
                                        </div>
                                    </td>
                                    <td className="py-3 px-6 text-right text-muted-foreground font-semibold">
                                        {customer.daysSinceVisit} days
                                    </td>
                                    <td className="py-3 px-6 text-right text-muted-foreground">
                                        {customer.totalVisits}
                                    </td>
                                    <td className="py-3 px-6 text-right">
                                        <span className="px-2 py-1 rounded text-xs bg-background text-muted-foreground border border-border">
                                            Churned
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Win-Back Strategies */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-foreground mb-3">💡 Win-Back Strategies</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.atRiskCustomers > 0 && (
                        <div className="bg-background border border-border rounded-lg p-4">
                            <h4 className="font-semibold text-foreground mb-2">⚠️ Immediate Action Needed</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                                {data.atRiskCustomers} customers are at risk of churning.
                            </p>
                            <ul className="text-xs text-muted-foreground space-y-1">
                                <li>• Send personalized "We miss you" message</li>
                                <li>• Offer 10-15% discount on next visit</li>
                                <li>• Remind them of loyalty benefits</li>
                            </ul>
                        </div>
                    )}
                    {data.churnedCustomers > 0 && (
                        <div className="bg-background border border-border rounded-lg p-4">
                            <h4 className="font-semibold text-foreground mb-2">🔄 Re-engagement Campaign</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                                {data.churnedCustomers} customers have churned.
                            </p>
                            <ul className="text-xs text-muted-foreground space-y-1">
                                <li>• Special comeback offer (20% off)</li>
                                <li>• Survey: Why did they stop coming?</li>
                                <li>• Highlight new services/improvements</li>
                            </ul>
                        </div>
                    )}
                    <div className="bg-background border border-border rounded-lg p-4">
                        <h4 className="font-semibold text-foreground mb-2">✅ Retention Best Practices</h4>
                        <ul className="text-xs text-muted-foreground space-y-1">
                            <li>• Send booking reminders every 2-3 weeks</li>
                            <li>• Loyalty program for regular customers</li>
                            <li>• Birthday/special occasion discounts</li>
                            <li>• Request feedback after each visit</li>
                        </ul>
                    </div>
                    <div className="bg-background border border-border rounded-lg p-4">
                        <h4 className="font-semibold text-foreground mb-2">📊 Monitor & Improve</h4>
                        <ul className="text-xs text-muted-foreground space-y-1">
                            <li>• Track churn rate weekly</li>
                            <li>• Identify common churn patterns</li>
                            <li>• Improve service quality continuously</li>
                            <li>• Build strong barber-customer relationships</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
