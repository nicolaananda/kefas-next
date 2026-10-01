import { useEffect, useState } from 'react';
import { Calendar, User, Phone, Clock, Filter, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { API_BASE_URL } from '@/lib/api';

interface Booking {
    id: number;
    barberId: number;
    barber: { id: number; name: string };
    customerName: string;
    customerPhone: string;
    bookingDate: string;
    timeSlot: string;
    status: string;
    createdAt: string;
    paymentProof: string | null;
}

export default function BookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('active');
    const [filterDate, setFilterDate] = useState<string>('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [updatingBookingIds, setUpdatingBookingIds] = useState<Set<number>>(new Set());

    // Reschedule Modal State
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [selectedBookingForReschedule, setSelectedBookingForReschedule] = useState<Booking | null>(null);
    const [newDate, setNewDate] = useState<string>('');
    const [newTimeSlot, setNewTimeSlot] = useState<string>('');
    const [newBarberId, setNewBarberId] = useState<string>('');
    const [availableBarbers, setAvailableBarbers] = useState<{ id: number; name: string }[]>([]);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [submittingReschedule, setSubmittingReschedule] = useState(false);

    useEffect(() => {
        fetchBookings();
        fetchBarbers(); // Need barbers for the reschedule dropdown
        const interval = setInterval(fetchBookings, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, [filterStatus, filterDate]);

    // Fetch slots when date or barber changes
    useEffect(() => {
        if (newDate && newBarberId) {
            fetchAvailableSlots(newDate, parseInt(newBarberId));
        } else {
            setAvailableSlots([]);
        }
    }, [newDate, newBarberId]);

    const fetchBarbers = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/users/barbers`);
            if (res.ok) {
                const data = await res.json();
                setAvailableBarbers(data);
            }
        } catch (error) {
            console.error('Failed to fetch barbers:', error);
        }
    };

    const fetchAvailableSlots = async (date: string, barberId: number) => {
        setLoadingSlots(true);
        try {
            const res = await fetch(`${API_BASE_URL}/slots/available?date=${date}&barberId=${barberId}`);
            if (res.ok) {
                const data = await res.json();
                setAvailableSlots(data.availableSlots || []);
            }
        } catch (error) {
            console.error('Failed to fetch available slots:', error);
        } finally {
            setLoadingSlots(false);
        }
    };

    const openRescheduleModal = (booking: Booking) => {
        setSelectedBookingForReschedule(booking);
        setNewDate('');
        setNewTimeSlot('');
        setNewBarberId(booking.barberId.toString());
        setIsRescheduleModalOpen(true);
    };

    const handleReschedule = async () => {
        if (!selectedBookingForReschedule || !newDate || !newTimeSlot) return;

        setSubmittingReschedule(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/bookings/${selectedBookingForReschedule.id}/reschedule`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    newBookingDate: newDate,
                    newTimeSlot: newTimeSlot,
                    newBarberId: parseInt(newBarberId)
                })
            });

            if (res.ok) {
                setIsRescheduleModalOpen(false);
                fetchBookings();
                // We could add a toast notification here
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to reschedule');
            }
        } catch (error) {
            console.error('Reschedule error:', error);
            alert('An error occurred while rescheduling');
        } finally {
            setSubmittingReschedule(false);
        }
    };

    const fetchBookings = async () => {
        try {
            const token = localStorage.getItem('token');
            let url = `${API_BASE_URL}/bookings?`;

            if (filterStatus !== 'all') {
                url += `status=${filterStatus}&`;
            }

            if (filterDate) {
                url += `date=${filterDate}&`;
            }

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data: Booking[] = await res.json();

                // Sort: Pending first, then by Creation Date Descending (Newest First)
                const sorted = data.sort((a, b) => {
                    // Prioritize Pending
                    if (a.status === 'pending' && b.status !== 'pending') return -1;
                    if (a.status !== 'pending' && b.status === 'pending') return 1;

                    // Then by CreatedAt Descending
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                });

                setBookings(sorted);
            }
        } catch (error) {
            console.error('Failed to fetch bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateBookingStatus = async (bookingId: number, newStatus: string) => {
        if (updatingBookingIds.has(bookingId)) return;
        setUpdatingBookingIds(prev => new Set(prev).add(bookingId));
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                fetchBookings(); // Refresh list
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.error || 'Failed to update booking status');
            }
        } catch (error) {
            console.error('Failed to update booking:', error);
        } finally {
            setUpdatingBookingIds(prev => { const s = new Set(prev); s.delete(bookingId); return s; });
        }
    };

    const isBookingEnded = (booking: Booking): boolean => {
        const slotMatch = booking.timeSlot?.match(/^(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})$/);
        if (!slotMatch) return true; // fallback: jika format aneh, izinkan
        const [, , , endHour, endMinute] = slotMatch;
        const end = new Date(booking.bookingDate);
        end.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);
        return new Date() >= end;
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            pending: 'bg-muted text-muted-foreground border-border',
            confirmed: 'bg-primary text-primary-foreground border-primary',
            cancelled: 'bg-card text-muted-foreground line-through border-border',
            completed: 'bg-card text-foreground border-primary'
        };

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${styles[status as keyof typeof styles] || ''}`}>
                {status}
            </span>
        );
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-muted-foreground">Loading bookings...</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Bookings</h1>
                    <p className="text-muted-foreground">Manage customer appointments</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-end">
                <div className="flex-1">
                    <label className="text-sm text-muted-foreground mb-2 block font-medium">Filter by Date</label>
                    <Input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="bg-card border-border focus-visible:ring-zinc-900"
                    />
                </div>
                <div className="flex-1">
                    <label className="text-sm text-muted-foreground mb-2 block font-medium">Filter by Status</label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="bg-card border-border focus:ring-ring">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button
                    variant="outline"
                    onClick={() => {
                        setFilterDate('');
                        setFilterStatus('all');
                    }}
                    className="border-border hover:bg-background text-foreground"
                >
                    <Filter className="w-4 h-4 mr-2" />
                    Reset
                </Button>
            </div>

            {/* Bookings List */}
            <div className="space-y-4">
                {bookings.length === 0 ? (
                    <div className="text-center py-12 bg-card rounded-lg border border-border shadow-sm">
                        <Calendar className="w-12 h-12 mx-auto text-zinc-300 mb-4" />
                        <p className="text-muted-foreground">No bookings found</p>
                    </div>
                ) : (
                    bookings.map((booking) => (
                        <div
                            key={booking.id}
                            className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-all duration-200"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center gap-4 flex-wrap">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-muted-foreground" />
                                            <span className="font-bold text-foreground">
                                                {formatDate(booking.bookingDate)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-foreground font-mono">{booking.timeSlot}</span>
                                        </div>
                                        {getStatusBadge(booking.status)}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Barber</p>
                                            <p className="font-bold text-foreground">{booking.barber.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Customer</p>
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-muted-foreground" />
                                                <p className="font-medium text-foreground">{booking.customerName}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Phone</p>
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-4 h-4 text-muted-foreground" />
                                                <p className="font-mono text-foreground">{booking.customerPhone}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Additional Info Row: Proof & Notes */}
                                    {booking.paymentProof && (
                                        <div className="mt-2 pt-2 border-t border-zinc-50 flex items-center gap-2">
                                            <p className="text-xs text-muted-foreground">Bukti Transfer:</p>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedImage(booking.paymentProof)}
                                                className="text-xs bg-muted hover:bg-accent text-foreground px-2 py-1 rounded flex items-center gap-1 transition-colors h-auto"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                Lihat Gambar
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            {booking.status === 'pending' && (
                                <div className="flex gap-2 mt-4">
                                    <Button
                                        size="sm"
                                        className="bg-primary text-primary-foreground hover:bg-secondary font-bold shadow-sm"
                                        onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                        disabled={updatingBookingIds.has(booking.id)}
                                    >
                                        {updatingBookingIds.has(booking.id) ? 'Confirming...' : 'Confirm'}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-border text-foreground hover:bg-background font-medium"
                                        onClick={() => openRescheduleModal(booking)}
                                    >
                                        Reschedule
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-muted-foreground hover:text-red-500 hover:bg-red-50"
                                        onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            )}
                            {booking.status === 'confirmed' && (
                                <div className="flex gap-2 mt-4">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-primary text-foreground hover:bg-background font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={() => updateBookingStatus(booking.id, 'completed')}
                                        disabled={!isBookingEnded(booking)}
                                        title={!isBookingEnded(booking) ? 'Tunggu sampai jadwal booking berakhir' : ''}
                                    >
                                        Mark Complete
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-border text-foreground hover:bg-background font-medium"
                                        onClick={() => openRescheduleModal(booking)}
                                    >
                                        Reschedule
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Reschedule Modal */}
            <Dialog open={isRescheduleModalOpen} onOpenChange={setIsRescheduleModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Reschedule Booking</DialogTitle>
                    </DialogHeader>
                    {selectedBookingForReschedule && (
                        <div className="grid gap-4 py-4">
                            <div className="text-sm border p-3 rounded-md bg-background">
                                <p className="font-semibold text-foreground">{selectedBookingForReschedule.customerName}</p>
                                <p className="text-muted-foreground">
                                    Current: {formatDate(selectedBookingForReschedule.bookingDate)} at {selectedBookingForReschedule.timeSlot}
                                </p>
                            </div>

                            <div className="grid gap-2">
                                <label className="text-sm font-medium">New Date</label>
                                <Input
                                    type="date"
                                    value={newDate}
                                    onChange={(e) => {
                                        setNewDate(e.target.value);
                                        setNewTimeSlot(''); // Reset slot when date changes
                                    }}
                                    min={new Date().toISOString().split('T')[0]} // Cannot schedule for past dates
                                />
                            </div>

                            <div className="grid gap-2">
                                <label className="text-sm font-medium">New Barber</label>
                                <Select value={newBarberId} onValueChange={setNewBarberId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select barber" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableBarbers.map((b) => (
                                            <SelectItem key={b.id} value={b.id.toString()}>
                                                {b.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <label className="text-sm font-medium">New Time Slot</label>
                                <Select value={newTimeSlot} onValueChange={setNewTimeSlot} disabled={!newDate || availableSlots.length === 0}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={
                                            !newDate ? "Select date first" :
                                                loadingSlots ? "Loading slots..." :
                                                    availableSlots.length === 0 ? "No slots available" :
                                                        "Select time slot"
                                        } />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableSlots.map((slot) => (
                                            <SelectItem key={slot} value={slot}>
                                                {slot}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                className="w-full mt-2"
                                onClick={handleReschedule}
                                disabled={!newDate || !newTimeSlot || submittingReschedule}
                            >
                                {submittingReschedule ? "Saving..." : "Save Reschedule"}
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
            {/* Image Preview Modal */}
            <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
                <DialogContent className="max-w-3xl bg-card border-border p-0 overflow-hidden">
                    <DialogHeader className="p-4 border-b border-border">
                        <DialogTitle>Bukti Transfer</DialogTitle>
                    </DialogHeader>
                    {selectedImage && (
                        <div className="flex items-center justify-center bg-primary/5 p-4">
                            <img
                                src={selectedImage}
                                alt="Payment Proof"
                                className="max-h-[80vh] w-auto object-contain rounded-md shadow-lg"
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
