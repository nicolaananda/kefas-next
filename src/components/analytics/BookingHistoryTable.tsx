import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Download, Calendar, User, Phone } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3881/api';

interface Booking {
    id: number;
    barberId: number;
    barber: {
        id: number;
        name: string;
    };
    customerName: string;
    customerPhone: string;
    bookingDate: string;
    timeSlot: string;
    serviceName: string | null;
    servicePrice: number | null;
    status: string;
    paymentProof: string | null;
    createdAt: string;
}

interface BookingHistoryData {
    bookings: Booking[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    };
}

export default function BookingHistoryTable() {
    const [data, setData] = useState<BookingHistoryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        barberId: '',
        status: '',
        customerPhone: '',
        limit: 50,
        offset: 0
    });

    useEffect(() => {
        fetchData();
    }, [filters]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value.toString());
            });

            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/analytics/booking-history?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setData(response.data.data);
        } catch (error) {
            console.error('Failed to fetch booking history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value, offset: 0 }));
    };

    const handlePageChange = (newOffset: number) => {
        setFilters(prev => ({ ...prev, offset: newOffset }));
    };

    const exportToCSV = () => {
        if (!data || data.bookings.length === 0) return;

        const headers = ['ID', 'Customer Name', 'Phone', 'Barber', 'Date', 'Time', 'Service', 'Price', 'Status', 'Created At'];
        const rows = data.bookings.map(booking => [
            booking.id,
            booking.customerName,
            booking.customerPhone,
            booking.barber.name,
            new Date(booking.bookingDate).toLocaleDateString('id-ID'),
            booking.timeSlot,
            booking.serviceName || '-',
            booking.servicePrice || 0,
            booking.status,
            new Date(booking.createdAt).toLocaleString('id-ID')
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `booking-history-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
                return 'bg-primary text-primary-foreground';
            case 'completed':
                return 'bg-accent text-foreground';
            case 'cancelled':
                return 'bg-muted text-muted-foreground line-through';
            default:
                return 'bg-muted text-muted-foreground border border-zinc-300';
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(value);
    };

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center h-64 bg-card border border-border rounded-lg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-foreground mb-4">Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div>
                        <label className="block text-sm text-muted-foreground mb-1">Start Date</label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            className="w-full bg-card border border-zinc-300 rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-muted-foreground mb-1">End Date</label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            className="w-full bg-card border border-zinc-300 rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-muted-foreground mb-1">Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="w-full bg-card border border-zinc-300 rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                        >
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-muted-foreground mb-1">Customer Phone</label>
                        <input
                            type="text"
                            value={filters.customerPhone}
                            onChange={(e) => handleFilterChange('customerPhone', e.target.value)}
                            placeholder="Search by phone..."
                            className="w-full bg-card border border-zinc-300 rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={exportToCSV}
                            disabled={!data || data.bookings.length === 0}
                            className="w-full bg-primary hover:bg-secondary disabled:bg-accent disabled:text-muted-foreground disabled:cursor-not-allowed text-primary-foreground px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm"
                        >
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Results Summary */}
            {data && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <p>
                        Showing {data.pagination.offset + 1} - {Math.min(data.pagination.offset + data.bookings.length, data.pagination.total)} of {data.pagination.total} bookings
                    </p>
                </div>
            )}

            {/* Bookings Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-background">
                            <tr>
                                <th className="text-left py-3 px-6 text-muted-foreground font-medium">ID</th>
                                <th className="text-left py-3 px-6 text-muted-foreground font-medium">Customer</th>
                                <th className="text-left py-3 px-6 text-muted-foreground font-medium">Barber</th>
                                <th className="text-left py-3 px-6 text-muted-foreground font-medium">Date & Time</th>
                                <th className="text-left py-3 px-6 text-muted-foreground font-medium">Service</th>
                                <th className="text-right py-3 px-6 text-muted-foreground font-medium">Price</th>
                                <th className="text-center py-3 px-6 text-muted-foreground font-medium">Status</th>
                                <th className="text-left py-3 px-6 text-muted-foreground font-medium">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200">
                            {data && data.bookings.length > 0 ? (
                                data.bookings.map((booking) => (
                                    <tr key={booking.id} className="hover:bg-background transition-colors">
                                        <td className="py-3 px-6 text-muted-foreground">#{booking.id}</td>
                                        <td className="py-3 px-6">
                                            <div>
                                                <p className="text-foreground font-medium flex items-center gap-2">
                                                    <User className="w-3 h-3 text-muted-foreground" />
                                                    {booking.customerName}
                                                </p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                                                    <Phone className="w-3 h-3 text-muted-foreground" />
                                                    {booking.customerPhone}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="py-3 px-6 text-foreground">{booking.barber.name}</td>
                                        <td className="py-3 px-6">
                                            <div>
                                                <p className="text-foreground flex items-center gap-2">
                                                    <Calendar className="w-3 h-3 text-muted-foreground" />
                                                    {new Date(booking.bookingDate).toLocaleDateString('id-ID', {
                                                        weekday: 'short',
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">{booking.timeSlot}</p>
                                            </div>
                                        </td>
                                        <td className="py-3 px-6 text-foreground">{booking.serviceName || '-'}</td>
                                        <td className="py-3 px-6 text-right text-foreground font-medium">
                                            {booking.servicePrice ? formatCurrency(booking.servicePrice) : '-'}
                                        </td>
                                        <td className="py-3 px-6 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(booking.status)} border-transparent`}>
                                                {booking.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-6 text-xs text-muted-foreground">
                                            {new Date(booking.createdAt).toLocaleDateString('id-ID')}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                                        No bookings found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {data && data.pagination.total > filters.limit && (
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => handlePageChange(Math.max(0, filters.offset - filters.limit))}
                        disabled={filters.offset === 0}
                        className="px-4 py-2 bg-card border border-zinc-300 hover:bg-background disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed text-foreground rounded-lg transition-all shadow-sm"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-muted-foreground">
                        Page {Math.floor(filters.offset / filters.limit) + 1} of {Math.ceil(data.pagination.total / filters.limit)}
                    </span>
                    <button
                        onClick={() => handlePageChange(filters.offset + filters.limit)}
                        disabled={!data.pagination.hasMore}
                        className="px-4 py-2 bg-card border border-zinc-300 hover:bg-background disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed text-foreground rounded-lg transition-all shadow-sm"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
