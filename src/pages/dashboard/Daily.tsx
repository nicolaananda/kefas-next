import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Banknote,
    CreditCard,
    DollarSign,
    Receipt,
    User,
    RefreshCcw,
    TrendingUp,
    Calendar,
    Users,
    Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { API_BASE_URL } from '@/lib/api';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface Transaction {
    id: number;
    invoiceCode: string;
    time: string;
    customerName: string;
    barberName: string;
    totalAmount: number;
    paymentMethod: string;
    items: any[];
}

interface DailyData {
    totalRevenue: number;
    transactionCount: number;
    cashTotal: number;
    qrisTotal: number;
    topBarber: {
        name: string;
        revenue: number;
        count: number;
    } | null;
    recentTransactions: Transaction[];
}

export default function DailyPage() {
    const [data, setData] = useState<DailyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState<any[]>([]);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/dashboard/daily`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch daily data');
            const json = await res.json();

            // Sort recentTransactions descending (newest first)
            if (json.recentTransactions) {
                json.recentTransactions.sort((a: Transaction, b: Transaction) =>
                    new Date(b.time).getTime() - new Date(a.time).getTime()
                );
            }

            setData(json);

            // Process chart data: Group interactions by hour
            if (json.recentTransactions) {
                const hours = Array.from({ length: 15 }, (_, i) => i + 9); // 09:00 to 23:00
                const hourlyData = hours.map(hour => {
                    const txs = json.recentTransactions.filter((t: Transaction) => {
                        const d = new Date(t.time);
                        return d.getHours() === hour;
                    });
                    const revenue = txs.reduce((sum: number, t: Transaction) => sum + t.totalAmount, 0);
                    return {
                        hour: `${hour}:00`,
                        revenue,
                        count: txs.length
                    };
                });
                setChartData(hourlyData);
            }

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex h-[50vh] items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );

    if (!data) return <div className="p-8 text-center text-destructive">Failed to load data.</div>;

    return (
        <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1">Daily Overview</h1>
                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(), 'EEEE, dd MMMM yyyy')}
                        <span className="mx-1">•</span>
                        <span className="flex items-center gap-1 text-emerald-500 font-medium">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            Live Updates
                        </span>
                    </p>
                </div>
                <Button variant="outline" onClick={fetchData} className="gap-2 border-border hover:bg-background hover:text-foreground">
                    <RefreshCcw className="w-4 h-4" /> Refresh Data
                </Button>
            </div>

            {/* Premium Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border shadow-sm border-border bg-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-foreground">IDR {data.totalRevenue.toLocaleString('id-ID')}</div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-foreground" /> +100% from yesterday
                        </p>
                    </CardContent>
                </Card>

                <Card className="border shadow-sm border-border bg-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Transactions</CardTitle>
                        <Receipt className="h-4 w-4 text-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-foreground">{data.transactionCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">Invoices generated today</p>
                    </CardContent>
                </Card>

                <Card className="border shadow-sm border-border bg-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Payment Methods</CardTitle>
                        <CreditCard className="h-4 w-4 text-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1 mt-1">
                            <div className="flex justify-between text-xs items-center border-b border-border pb-1">
                                <span className="flex items-center gap-1 text-muted-foreground"><Banknote className="w-3 h-3" /> Cash</span>
                                <span className="font-mono font-bold text-foreground">IDR {data.cashTotal.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between text-xs items-center pt-1">
                                <span className="flex items-center gap-1 text-muted-foreground"><CreditCard className="w-3 h-3" /> QRIS</span>
                                <span className="font-mono font-bold text-foreground">IDR {data.qrisTotal.toLocaleString('id-ID')}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border shadow-sm border-primary bg-primary text-primary-foreground">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Top Performer</CardTitle>
                        <User className="h-4 w-4 text-primary-foreground" />
                    </CardHeader>
                    <CardContent>
                        {data.topBarber ? (
                            <>
                                <div className="text-2xl font-black text-primary-foreground">{data.topBarber.name}</div>
                                <div className="flex justify-between items-center mt-1">
                                    <Badge variant="outline" className="text-[10px] border-border text-zinc-300 bg-secondary">
                                        {data.topBarber.count} Cuts
                                    </Badge>
                                    <span className="text-xs font-mono font-bold text-zinc-300">
                                        IDR {data.topBarber.revenue.toLocaleString('id-ID')}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <div className="text-sm text-muted-foreground italic">No data available</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid gap-4 md:grid-cols-7">
                <Card className="col-span-4 border-border shadow-sm bg-card">
                    <CardHeader>
                        <CardTitle className="text-base font-bold text-foreground">Hourly Revenue Trend</CardTitle>
                        <CardDescription className="text-muted-foreground">Revenue breakdown by hour for today</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis
                                        dataKey="hour"
                                        stroke="#71717a"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#71717a"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${value / 1000}k`}
                                    />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px', color: '#f4f4f5' }}
                                        formatter={(value: number) => [`IDR ${value.toLocaleString('id-ID')}`, 'Revenue']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#34d399"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorRevenue)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3 border-border shadow-sm bg-card">
                    <CardHeader>
                        <CardTitle className="text-base font-bold text-foreground">Customers Activity</CardTitle>
                        <CardDescription className="text-muted-foreground">Visits distribution by hour</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <XAxis
                                        dataKey="hour"
                                        stroke="#71717a"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#71717a"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        allowDecimals={false}
                                    />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" />
                                    <Tooltip
                                        cursor={{ fill: '#27272a' }}
                                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px', color: '#f4f4f5' }}
                                        formatter={(value: number) => [value, 'Customers']}
                                    />
                                    <Bar dataKey="count" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Transactions Table */}
            <Card className="border-border shadow-sm bg-card">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="font-bold text-foreground">Recent Transactions</CardTitle>
                        <CardDescription className="text-muted-foreground">Latest invoices generated today</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">View All</Button>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-border overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-background uppercase tracking-wider text-xs font-semibold text-muted-foreground border-b border-border">
                                <tr>
                                    <th className="p-4">Time</th>
                                    <th className="p-4">Invoice</th>
                                    <th className="p-4">Customer</th>
                                    <th className="p-4">Barber</th>
                                    <th className="p-4 hidden md:table-cell">Details</th>
                                    <th className="p-4 text-right">Amount</th>
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {data.recentTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center text-muted-foreground font-medium">
                                            No transactions found for today.
                                        </td>
                                    </tr>
                                ) : (
                                    data.recentTransactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-background transition-colors cursor-pointer" onClick={() => setSelectedTransaction(tx)}>
                                            <td className="p-4 font-mono text-muted-foreground w-[100px]">
                                                {format(new Date(tx.time), 'HH:mm')}
                                            </td>
                                            <td className="p-4 font-bold text-foreground font-mono tracking-tight">{tx.invoiceCode}</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-muted-foreground" />
                                                    <span className="font-medium text-foreground">{tx.customerName}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                                                    {tx.barberName.charAt(0)}
                                                </div>
                                                <span className="font-medium text-foreground">{tx.barberName}</span>
                                            </td>
                                            <td className="p-4 hidden md:table-cell">
                                                <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                    {tx.items.map((i: any) => `${i.name}${i.qty > 1 ? ` (x${i.qty})` : ''}`).join(', ')}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right font-bold font-mono text-foreground">
                                                IDR {tx.totalAmount.toLocaleString('id-ID')}
                                            </td>
                                            <td className="p-4 text-center">
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        tx.paymentMethod === 'cash'
                                                            ? 'border-zinc-300 text-muted-foreground bg-muted'
                                                            : 'border-primary text-primary-foreground bg-primary'
                                                    }
                                                >
                                                    {tx.paymentMethod.toUpperCase()}
                                                </Badge>
                                            </td>
                                            <td className="p-4 text-center">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
                <DialogContent className="sm:max-w-md bg-card text-foreground">
                    <DialogHeader>
                        <DialogTitle>Transaction Details</DialogTitle>
                        <DialogDescription>
                            Invoice: <span className="font-mono text-foreground font-bold">{selectedTransaction?.invoiceCode}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">Date</p>
                                <p className="font-medium">{selectedTransaction && format(new Date(selectedTransaction.time), 'dd MMM yyyy HH:mm')}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Staff</p>
                                <p className="font-medium">{selectedTransaction?.barberName}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Payment Method</p>
                                <div className="mt-1">
                                    <Badge variant="outline" className="border-zinc-300">
                                        {selectedTransaction?.paymentMethod.toUpperCase()}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-border pt-4">
                            <h4 className="font-semibold mb-2 text-sm text-foreground">Items</h4>
                            <div className="space-y-2">
                                {selectedTransaction?.items.map((item: any, i: number) => (
                                    <div key={i} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-foreground">{item.name}</span>
                                            <span className="text-xs text-muted-foreground">@{item.price.toLocaleString('id-ID')} x {item.qty || 1}</span>
                                        </div>
                                        <span className="font-mono font-medium">
                                            IDR {((item.price) * (item.qty || 1)).toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-border pt-4 flex justify-between items-center bg-background p-3 rounded-lg -mx-2">
                            <span className="font-bold text-lg">Total Amount</span>
                            <span className="font-bold text-lg font-mono">
                                IDR {selectedTransaction?.totalAmount.toLocaleString('id-ID')}
                            </span>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
