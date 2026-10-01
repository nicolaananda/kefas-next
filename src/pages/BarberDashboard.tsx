import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, Phone, DollarSign, CheckCircle2, LogOut, ShoppingCart } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface Booking {
    id: number;
    customerName: string;
    customerPhone: string;
    bookingDate: string;
    timeSlot: string;
    serviceName: string | null;
    servicePrice: number | null;
    status: string;
}

interface BarberStats {
    todayBookings: number;
    upcomingBookings: number;
    estimatedCommission: number;
}

export default function BarberDashboard() {
    const { user, token, logout } = useAuth();
    const navigate = useNavigate();
    const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
    const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
    const [stats, setStats] = useState<BarberStats>({
        todayBookings: 0,
        upcomingBookings: 0,
        estimatedCommission: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.id) {
            fetchBookings();
            const interval = setInterval(fetchBookings, 30000); // Refresh every 30s
            return () => clearInterval(interval);
        }
    }, [user?.id]);

    const fetchBookings = async () => {
        if (!user?.id || !token) return;

        try {
            const res = await fetch(`${API_BASE_URL}/bookings/barber/${user.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const bookings: Booking[] = await res.json();

                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);

                // Filter today's bookings
                const todayList = bookings.filter(b => {
                    const bookingDate = new Date(b.bookingDate);
                    return bookingDate >= today && bookingDate < tomorrow;
                });

                // Filter upcoming bookings (next 7 days, excluding today)
                const nextWeek = new Date(today);
                nextWeek.setDate(nextWeek.getDate() + 7);
                const upcomingList = bookings.filter(b => {
                    const bookingDate = new Date(b.bookingDate);
                    return bookingDate >= tomorrow && bookingDate <= nextWeek;
                });

                // Calculate estimated commission (assuming 50% commission rate)
                const estimatedCommission = todayList.reduce((sum, b) => {
                    return sum + (b.servicePrice ? b.servicePrice * 0.5 : 0);
                }, 0);

                setTodayBookings(todayList);
                setUpcomingBookings(upcomingList);
                setStats({
                    todayBookings: todayList.length,
                    upcomingBookings: upcomingList.length,
                    estimatedCommission
                });
            }
        } catch (error) {
            console.error('Failed to fetch bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
            pending: { variant: "secondary", label: "Menunggu" },
            confirmed: { variant: "default", label: "Dikonfirmasi" },
            completed: { variant: "outline", label: "Selesai" },
            cancelled: { variant: "destructive", label: "Dibatalkan" }
        };
        const config = variants[status] || variants.pending;
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold text-foreground">
                            Halo, {user?.name}! 👋
                        </h1>
                        <p className="text-muted-foreground">
                            Ini jadwal booking kamu hari ini dan minggu depan
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="default"
                            onClick={() => navigate('/pos')}
                            className="flex items-center gap-2"
                        >
                            <ShoppingCart className="h-4 w-4" />
                            Buka POS
                        </Button>
                        <Button
                            variant="outline"
                            onClick={logout}
                            className="flex items-center gap-2"
                        >
                            <LogOut className="h-4 w-4" />
                            Logout
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Booking Hari Ini</CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.todayBookings}</div>
                            <p className="text-xs text-muted-foreground">Customer menunggu</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Booking Minggu Ini</CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.upcomingBookings}</div>
                            <p className="text-xs text-muted-foreground">7 hari ke depan</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Estimasi Komisi Hari Ini</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                Rp {stats.estimatedCommission.toLocaleString('id-ID')}
                            </div>
                            <p className="text-xs text-muted-foreground">Dari booking terkonfirmasi</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Today's Bookings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5" />
                            Booking Hari Ini
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {todayBookings.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>Tidak ada booking hari ini</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {todayBookings.map((booking) => (
                                    <div
                                        key={booking.id}
                                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="space-y-1 flex-1">
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-semibold">{booking.customerName}</span>
                                                {getStatusBadge(booking.status)}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Phone className="h-3 w-3" />
                                                    {booking.customerPhone}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {booking.timeSlot}
                                                </div>
                                            </div>
                                            <div className="text-sm">
                                                <span className="font-medium">{booking.serviceName || 'Potong Rambut'}</span>
                                                {booking.servicePrice && (
                                                    <span className="text-muted-foreground ml-2">
                                                        • Rp {booking.servicePrice.toLocaleString('id-ID')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Upcoming Bookings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Booking Minggu Depan (7 Hari)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {upcomingBookings.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>Belum ada booking minggu depan</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {upcomingBookings.map((booking) => (
                                    <div
                                        key={booking.id}
                                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="space-y-1 flex-1">
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-semibold">{booking.customerName}</span>
                                                {getStatusBadge(booking.status)}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(booking.bookingDate), 'EEEE, dd MMMM yyyy', { locale: idLocale })}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {booking.timeSlot}
                                                </div>
                                            </div>
                                            <div className="text-sm">
                                                <span className="font-medium">{booking.serviceName || 'Potong Rambut'}</span>
                                                {booking.servicePrice && (
                                                    <span className="text-muted-foreground ml-2">
                                                        • Rp {booking.servicePrice.toLocaleString('id-ID')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
