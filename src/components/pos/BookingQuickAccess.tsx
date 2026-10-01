import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePosStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Clock, User, Phone, Sparkles } from 'lucide-react';
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
    serviceId: number | null;
    status: string;
}

export default function BookingQuickAccess() {
    const { user, token } = useAuth();
    const { setCustomerInfo, setBookingId, addToCart, clearCart, setBarber } = usePosStore();
    const [isOpen, setIsOpen] = useState(false);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && user?.id) {
            fetchTodayBookings();
        }
    }, [isOpen, user?.id]);

    // Auto-refresh every 30 seconds when modal is open
    useEffect(() => {
        if (!isOpen) return;

        const interval = setInterval(() => {
            if (user?.id) {
                fetchTodayBookings();
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [isOpen, user?.id]);

    const fetchTodayBookings = async () => {
        if (!user?.id || !token) return;

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/bookings/barber/${user.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const allBookings: Booking[] = await res.json();

                // Filter only today's bookings
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);

                const todayList = allBookings.filter(b => {
                    const bookingDate = new Date(b.bookingDate);
                    return bookingDate >= today && bookingDate < tomorrow &&
                           (b.status === 'confirmed' || b.status === 'pending');
                });

                setBookings(todayList);
            }
        } catch (error) {
            console.error('Failed to fetch bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectBooking = (booking: Booking) => {
        // Clear existing cart
        clearCart();

        // Set customer info
        setCustomerInfo(booking.customerName, booking.customerPhone || '');

        // Set booking ID for tracking
        setBookingId(booking.id);

        // Set barber (self)
        if (user) {
            setBarber({
                id: user.id,
                name: user.name || 'Staff',
                username: user.username || ''
            });
        }

        // Add service to cart if available
        if (booking.serviceId && booking.serviceName && booking.servicePrice) {
            addToCart({
                id: String(booking.serviceId),
                name: booking.serviceName,
                price: booking.servicePrice,
                qty: 1
            });
        }

        // Close modal
        setIsOpen(false);
    };

    const getStatusBadge = (status: string) => {
        if (status === 'confirmed') {
            return <Badge variant="default" className="text-xs">Dikonfirmasi</Badge>;
        }
        return <Badge variant="secondary" className="text-xs">Menunggu</Badge>;
    };

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                className="h-9 font-bold transition-all border-border relative"
                onClick={() => setIsOpen(true)}
            >
                <Calendar className="h-4 w-4 mr-2" />
                Booking
                {bookings.length > 0 && (
                    <Badge
                        variant="destructive"
                        className="ml-2 h-5 min-w-[20px] px-1.5 text-xs font-bold"
                    >
                        {bookings.length}
                    </Badge>
                )}
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Booking Hari Ini
                        </DialogTitle>
                    </DialogHeader>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : bookings.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Calendar className="h-16 w-16 mx-auto mb-4 opacity-20" />
                            <p className="text-lg font-medium">Tidak ada booking hari ini</p>
                            <p className="text-sm mt-1">Booking yang dikonfirmasi akan muncul di sini</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {bookings.map((booking) => (
                                <div
                                    key={booking.id}
                                    className="border rounded-lg p-4 hover:bg-muted/50 transition-all cursor-pointer group"
                                    onClick={() => handleSelectBooking(booking)}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="space-y-1 flex-1">
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-bold text-lg">{booking.customerName}</span>
                                                {getStatusBadge(booking.status)}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Phone className="h-3 w-3" />
                                                {booking.customerPhone}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="flex items-center gap-1 text-sm font-medium">
                                                <Clock className="h-3 w-3" />
                                                {booking.timeSlot}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t">
                                        <div className="text-sm">
                                            <span className="font-medium">{booking.serviceName || 'Potong Rambut'}</span>
                                            {booking.servicePrice && (
                                                <span className="text-muted-foreground ml-2">
                                                    • Rp {booking.servicePrice.toLocaleString('id-ID')}
                                                </span>
                                            )}
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Sparkles className="h-4 w-4 mr-1" />
                                            Buat Invoice
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                        Klik booking untuk otomatis mengisi form POS
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
