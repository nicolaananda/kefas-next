import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

interface DashboardData {
    stats: {
        totalRevenue: number;
        revenueGrowth: string;
        transactionCount: number;
        activeShift: boolean;
        activeBarbers: number;
        lastShiftStart: string;
    };
    chartData: { name: string; total: number }[];
    recentActivity: {
        id: string;
        barberName: string;
        serviceName: string;
        amount: number;
        time: string;
    }[];
}

import { API_BASE_URL } from '@/lib/api';

export function DashboardHome() {
    const navigate = useNavigate();
    const [data, setData] = useState<DashboardData | null>(null);
    const [bookingSummary, setBookingSummary] = useState<{ pending: any[]; upcoming: any[] } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const [statsRes, bookingsRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/dashboard/stats`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${API_BASE_URL}/bookings/summary`, { headers: { 'Authorization': `Bearer ${token}` } })
                ]);

                if (statsRes.ok) {
                    const json = await statsRes.json();
                    setData(json);
                }
                if (bookingsRes.ok) {
                    const json = await bookingsRes.json();
                    setBookingSummary(json);
                }
            } catch (error) {
                console.error('Failed to fetch dashboard data', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!data) return <div className="p-8 text-center text-destructive">Failed to load data.</div>;

    const { stats, chartData, recentActivity } = data;

    return (
        <div className="space-y-8 animate-in fade-in duration-700 p-8 pb-20">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">
                        Dashboard Overview
                    </h2>
                    <p className="text-muted-foreground">
                        Welcome back to your professional command center.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="default"
                        className="bg-primary text-primary-foreground hover:bg-secondary shadow-lg shadow-zinc-200/50 transition-all hover:scale-105"
                        onClick={() => navigate('/pos')}
                    >
                        Launch POS Station
                    </Button>
                </div>
            </div>

            {/* Quick Actions / Booking Summary */}
            {bookingSummary && (
                <div className="grid gap-4 md:grid-cols-2">
                    <Card className="bg-secondary/50 border-border">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wider">
                                Pending Bookings
                            </CardTitle>
                            <span className="bg-muted text-muted-foreground text-xs font-bold px-2 py-1 rounded-full border border-border">
                                {bookingSummary.pending.length} Waiting
                            </span>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {bookingSummary.pending.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic">No pending bookings.</p>
                                ) : (
                                    bookingSummary.pending.map((booking: any) => (
                                        <div key={booking.id} className="bg-card p-3 rounded-md border border-border shadow-sm flex justify-between items-center group hover:bg-muted transition-all cursor-pointer" onClick={() => navigate('/dashboard/bookings')}>
                                            <div>
                                                <p className="font-semibold text-foreground text-sm">{booking.customerName}</p>
                                                <p className="text-xs text-muted-foreground">{booking.serviceName} • {booking.timeSlot}</p>
                                            </div>
                                            <Button size="sm" variant="outline" className="h-7 text-xs">
                                                Review
                                            </Button>
                                        </div>
                                    ))
                                )}
                                {bookingSummary.pending.length > 0 && (
                                    <Button variant="link" className="px-0 text-foreground text-xs w-full mt-2 h-auto" onClick={() => navigate('/dashboard/bookings')}>
                                        View All Pending Bookings &rarr;
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wider">
                                Today's Appointments
                            </CardTitle>
                            <span className="bg-muted text-muted-foreground text-xs font-bold px-2 py-1 rounded-full border border-border">
                                {bookingSummary.upcoming.length} Scheduled
                            </span>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {bookingSummary.upcoming.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic">No appointments for today.</p>
                                ) : (
                                    bookingSummary.upcoming.map((booking: any) => (
                                        <div
                                            key={booking.id}
                                            className="bg-card p-3 rounded-md border border-border shadow-sm flex justify-between items-center group hover:bg-muted transition-all cursor-pointer"
                                            onClick={() => navigate('/pos', { state: { booking } })}
                                        >
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-foreground text-sm">{booking.customerName}</p>
                                                    <span className="text-[10px] bg-muted text-muted-foreground px-1 rounded font-bold">{booking.timeSlot}</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {booking.serviceName} w/ {booking.barberName}
                                                </p>
                                            </div>
                                            <Button size="sm" className="h-7 text-xs shadow-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                Process
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                <Card className="bg-card border-border shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            Total Revenue
                        </CardTitle>
                        <CreditCard className="h-4 w-4 text-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-foreground">
                            IDR {stats.totalRevenue.toLocaleString('id-ID')}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            <span
                                className={
                                    Number(stats.revenueGrowth) > 0
                                        ? 'text-foreground font-bold'
                                        : 'text-muted-foreground'
                                }
                            >
                                {Number(stats.revenueGrowth) > 0 ? '+' : ''}
                                {stats.revenueGrowth}%
                            </span>{' '}
                            from last month
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-card border-border shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            Transactions
                        </CardTitle>
                        <Receipt className="h-4 w-4 text-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-foreground">
                            {stats.transactionCount}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Processed this month
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 bg-card border-border shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-foreground font-bold">
                            Weekly Revenue Overview
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={chartData}>
                                <XAxis
                                    dataKey="name"
                                    stroke="var(--muted-foreground)"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="var(--muted-foreground)"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `Rp${value}`}
                                    width={80}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--card)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '0px',
                                        color: 'var(--foreground)',
                                        boxShadow: 'none'
                                    }}
                                    formatter={(value: number) => [
                                        `IDR ${value.toLocaleString('id-ID')}`,
                                        'Revenue',
                                    ]}
                                    cursor={{ fill: 'var(--muted)' }}
                                />
                                <Bar dataKey="total" fill="var(--foreground)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card className="col-span-3 bg-card border-border shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-foreground font-bold">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            {recentActivity.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No recent transactions.
                                </p>
                            ) : (
                                recentActivity.map((tx) => (
                                    <div
                                        className="flex items-center group cursor-default"
                                        key={tx.id}
                                    >
                                        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-foreground font-bold border border-border group-hover:bg-accent transition-colors text-xs">
                                            {tx.barberName[0]}
                                        </div>
                                        <div className="ml-4 space-y-1">
                                            <p className="text-sm font-medium leading-none text-foreground">
                                                {tx.barberName}
                                            </p>
                                            <p className="text-sm text-muted-foreground truncate max-w-[150px]">
                                                {tx.serviceName}
                                            </p>
                                        </div>
                                        <div className="ml-auto font-mono font-medium text-foreground bg-background px-2 py-0.5 rounded text-xs border border-border">
                                            +IDR {tx.amount.toLocaleString('id-ID')}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
