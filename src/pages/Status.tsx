import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { MapPin, MessageCircle, Search, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Instagram } from 'lucide-react';
import BookingModal from '@/components/booking/BookingModal';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { format, addDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { VersionFooter } from '@/components/VersionFooter';

interface Barber {
    id: number;
    name: string;
    username: string;
    availability: string;
    defaultOffDay?: number | null;
}

interface BookingData {
    barber: { id: number; name: string; username: string };
    timeSlot: { start: string; end: string; label: string };
}

interface HistoryItem {
    type: 'booking' | 'transaction';
    date: string;
    barberName: string;
    customerName: string;
    service: string | null;
    amount: number | null;
    status: string;
    timeSlot: string | null;
    paymentMethod: string | null;
    invoiceCode: string | null;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    pending: { label: 'Menunggu Konfirmasi', color: 'text-amber-600 bg-amber-50 border-amber-200' },
    confirmed: { label: 'Dikonfirmasi ✓', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    completed: { label: 'Selesai', color: 'text-muted-foreground bg-background border-border' },
    cancelled: { label: 'Dibatalkan', color: 'text-red-600 bg-red-50 border-red-200' },
};

function getBarberPhoto(username: string): string | null {
    if (username === 'oky') return '/foto_oky.webp';
    if (username === 'khoirul') return '/foto_khoirul.webp';
    return null;
}

function getBarberRole(username: string): string {
    if (username === 'oky') return 'Head Barber';
    return 'Barber';
}

export default function StatusPage() {
    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [bookingModalOpen, setBookingModalOpen] = useState(false);

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [imageModalOpen, setImageModalOpen] = useState(false);

    const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(null);
    const [existingBookings, setExistingBookings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [currentOffDays, setCurrentOffDays] = useState<any[]>([]);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const [lastBookedInfo, setLastBookedInfo] = useState<{ barberName: string; slot: string } | null>(null);

    const [statusPhone, setStatusPhone] = useState('');
    const [statusResults, setStatusResults] = useState<HistoryItem[] | null>(null);
    const [statusLoading, setStatusLoading] = useState(false);
    const [statusError, setStatusError] = useState('');
    const [statusSectionOpen, setStatusSectionOpen] = useState(false);

    // Map of barberId -> special hours for selected date
    const [specialHoursMap, setSpecialHoursMap] = useState<Record<number, { openTime: string; closeTime: string }>>({});

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            await Promise.all([
                fetchBarbers(),
                fetchBookingsForDate(selectedDate),
                fetchOffDaysForDate(selectedDate),
                fetchSpecialHoursForDate(selectedDate),
            ]);
            setIsLoading(false);
        };
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [selectedDate]);

    useEffect(() => {
        if (!lastBookedInfo) return;
        const t = setTimeout(() => setLastBookedInfo(null), 6000);
        return () => clearTimeout(t);
    }, [lastBookedInfo]);

    const fetchBarbers = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/users/barbers`);
            if (res.ok) {
                const data = await res.json();
                const sorted = data.sort((a: Barber, b: Barber) => {
                    if (a.username === 'oky') return -1;
                    if (b.username === 'oky') return 1;
                    return a.name.localeCompare(b.name);
                });
                setBarbers(sorted);
            }
        } catch (err) {
            console.error('Error fetching barbers:', err);
        }
    };

    const fetchBookingsForDate = async (date: Date) => {
        try {
            const dateStr = format(date, 'yyyy-MM-dd');
            const res = await fetch(`${API_BASE_URL}/bookings/date/${dateStr}`);
            if (res.ok) setExistingBookings(await res.json());
        } catch (err) {
            console.error('Error fetching bookings:', err);
        }
    };

    const fetchOffDaysForDate = async (date: Date) => {
        try {
            const dateStr = format(date, 'yyyy-MM-dd');
            const res = await fetch(`${API_BASE_URL}/offdays?start=${dateStr}&end=${dateStr}`);
            if (res.ok) setCurrentOffDays(await res.json());
        } catch (err) {
            console.error('Error fetching off days:', err);
        }
    };

    const fetchSpecialHoursForDate = async (date: Date) => {
        try {
            const dateStr = format(date, 'yyyy-MM-dd');
            const res = await fetch(`${API_BASE_URL}/special-hours/date/${dateStr}`);
            if (res.ok) {
                const data: Array<{ barberId: number; openTime: string; closeTime: string }> = await res.json();
                // Build a map: barberId -> { openTime, closeTime }
                const map: Record<number, { openTime: string; closeTime: string }> = {};
                data.forEach(sh => { map[sh.barberId] = { openTime: sh.openTime, closeTime: sh.closeTime }; });
                setSpecialHoursMap(map);
            }
        } catch (err) {
            console.error('Error fetching special hours:', err);
        }
    };

    const handleCheckStatus = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!statusPhone.trim()) return;
        setStatusLoading(true);
        setStatusError('');
        setStatusResults(null);
        try {
            const res = await fetch(`${API_BASE_URL}/bookings/status?phone=${encodeURIComponent(statusPhone.trim())}`);
            if (!res.ok) throw new Error((await res.json()).error || 'Gagal mengecek status');
            const data = await res.json();
            setStatusResults(data);
            if (data.length === 0) setStatusError('Tidak ada booking ditemukan untuk nomor ini.');
        } catch (err: any) {
            setStatusError(err.message || 'Terjadi kesalahan. Coba lagi.');
        } finally {
            setStatusLoading(false);
        }
    };

    const generateTimeSlots = (forDate: Date, barberId: number) => {
        const slots = [];
        const now = new Date();
        const isToday = forDate.toDateString() === now.toDateString();
        const currentHour = now.getHours();

        let OPENING_HOUR: number;
        let CLOSING_HOUR: number;

        const sh = specialHoursMap[barberId];
        if (sh) {
            OPENING_HOUR = parseInt(sh.openTime.split(':')[0], 10);
            CLOSING_HOUR = parseInt(sh.closeTime.split(':')[0], 10);
        } else {
            const isFriday = forDate.getDay() === 5;
            OPENING_HOUR = isFriday ? 13 : 11;
            CLOSING_HOUR = 21;
        }

        for (let h = OPENING_HOUR; h < CLOSING_HOUR; h++) {
            let start: string, end: string;
            if (h <= 17) {
                start = `${String(h).padStart(2, '0')}:00`;
                end = `${String(h + 1).padStart(2, '0')}:00`;
            } else if (h === 18) {
                start = '18:30'; end = '19:30';
            } else if (h === 19) {
                start = '19:30'; end = '20:30';
            } else if (h === 20) {
                start = '20:30'; end = '21:30';
            } else {
                continue;
            }
            if (isToday) {
                const [slotHour, slotMin] = start.split(':').map(Number);
                const slotTotalMins = slotHour * 60 + slotMin;
                const nowTotalMins = currentHour * 60 + now.getMinutes();
                if (slotTotalMins <= nowTotalMins) continue;
            }
            slots.push({ start, end, label: `${start} - ${end}` });
        }
        return slots;
    };

    const isBarberOffday = (username: string, date: Date) => {
        const manualOff = currentOffDays.find((od: any) => od.user.username === username);
        if (manualOff) return true;
        const barber = barbers.find(b => b.username === username);
        if (barber?.defaultOffDay !== null && barber?.defaultOffDay !== undefined) {
            if (date.getDay() === barber.defaultOffDay) return true;
        }
        return false;
    };

    const bookingDaysAhead = parseInt(import.meta.env.VITE_BOOKING_DAYS_AHEAD || '3', 10);
    const dateOptions = Array.from({ length: bookingDaysAhead }, (_, i) => addDays(new Date(), i));

    return (
        <div className="min-h-screen bg-background text-foreground pb-24">
            {/* Offline Warning */}
            {!isOnline && (
                <div className="bg-red-500 text-white text-center py-2 px-4 text-sm font-semibold sticky top-0 z-50">
                    ⚠️ Tidak ada koneksi internet. Beberapa fitur mungkin tidak tersedia.
                </div>
            )}

            {/* ── Hero ── */}
            <div className="relative overflow-hidden border-b border-border">
                <div className="absolute inset-0 bg-gradient-to-b from-brand/5 to-transparent pointer-events-none" />
                <div className="max-w-2xl mx-auto px-4 pt-12 pb-10 text-center relative">
                    <img
                        src="/logo_kefas.PNG"
                        alt="Kefas Barbershop Logo"
                        className="h-40 w-auto object-contain mx-auto mb-4 drop-shadow-xl"
                    />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Jl. Diponegoro No.19, Kutorejo<br />
                        Kertosono · Nganjuk · Jawa Timur 64313
                    </p>
                </div>
            </div>

            <main className="max-w-2xl mx-auto px-4">
                {/* Success Banner */}
                {lastBookedInfo && (
                    <div className="mt-6 rounded-xl border border-emerald-700 bg-emerald-950 px-5 py-4 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div>
                            <p className="font-bold text-emerald-300 text-sm">Booking berhasil dibuat!</p>
                            <p className="text-xs text-emerald-500 mt-0.5">{lastBookedInfo.barberName} · {lastBookedInfo.slot}</p>
                        </div>
                    </div>
                )}

                {/* ── Section: Pilih Tanggal ── */}
                <div className="flex items-center gap-3 mt-10 mb-5">
                    <span className="text-sm font-bold tracking-[0.25em] text-brand/70 uppercase shrink-0">
                        Pilih Tanggal
                    </span>
                    <div className="h-px flex-1 bg-border" />
                </div>

                {/* Date Selector */}
                <div className="mb-10">
                    <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                        {dateOptions.map((date, i) => {
                            const isSelected = selectedDate.toDateString() === date.toDateString();
                            return (
                                <button
                                    key={i}
                                    onClick={() => setSelectedDate(date)}
                                    className={`
                                        flex-shrink-0 flex flex-col items-center px-6 py-4 rounded-xl transition-all duration-200 min-w-[84px]
                                        ${isSelected
                                            ? 'bg-brand text-brand-foreground shadow-lg shadow-brand/20'
                                            : 'bg-card border border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                                        }
                                    `}
                                >
                                    <span className="text-xs font-bold uppercase tracking-wider mb-1 opacity-70">
                                        {i === 0 ? 'Hari ini' : format(date, 'EEE', { locale: idLocale })}
                                    </span>
                                    <span className="text-3xl font-black leading-none">{format(date, 'd')}</span>
                                    <span className="text-xs opacity-50 mt-1">{format(date, 'MMM')}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Section: Pilih Barber ── */}
                <div className="flex items-center gap-3 mb-5">
                    <span className="text-sm font-bold tracking-[0.25em] text-brand/70 uppercase shrink-0">
                        Pilih Barber
                    </span>
                    <div className="h-px flex-1 bg-border" />
                </div>

                {/* Barbers */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                        <div className="w-6 h-6 border-2 border-border border-t-brand rounded-full animate-spin" />
                        <p className="text-muted-foreground text-sm">Memuat jadwal...</p>
                    </div>
                ) : barbers.length === 0 ? (
                    <p className="text-center py-20 text-muted-foreground text-sm">Tidak ada barber tersedia.</p>
                ) : (
                    <div className="space-y-3">
                        {barbers.map((barber) => {
                            const onOffday = isBarberOffday(barber.username, selectedDate);
                            const isToday = selectedDate.toDateString() === new Date().toDateString();
                            const actualAvailability = onOffday
                                ? 'offday'
                                : isToday ? barber.availability : 'available';

                            const isAvailable = actualAvailability === 'available';
                            const isOffday = actualAvailability === 'offday';

                            const timeSlots = generateTimeSlots(selectedDate, barber.id);
                            const bookedSlots = existingBookings.filter(b =>
                                b.barberId === barber.id && timeSlots.some(s => s.label === b.timeSlot)
                            ).length;
                            const availableSlotCount = isOffday ? 0 : timeSlots.length - bookedSlots;
                            const barberPhoto = getBarberPhoto(barber.username);
                            const barberRole = getBarberRole(barber.username);

                            return (
                                <div
                                    key={barber.id}
                                    className={`rounded-2xl border overflow-hidden transition-all duration-200
                                        ${isOffday ? 'opacity-50 grayscale border-border bg-card' : 'border-border bg-card'}`}
                                >
                                    <div className="flex h-48">
                                        {/* Photo Panel */}
                                        <div
                                            className="relative w-28 sm:w-36 shrink-0 cursor-pointer overflow-hidden"
                                            onClick={() => {
                                                if (barberPhoto) {
                                                    setSelectedImage(barberPhoto);
                                                    setImageModalOpen(true);
                                                }
                                            }}
                                        >
                                            {barberPhoto ? (
                                                <img
                                                    src={barberPhoto}
                                                    alt={barber.name}
                                                    className="absolute inset-0 w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 bg-secondary flex items-center justify-center text-3xl font-black text-muted-foreground">
                                                    {barber.name.charAt(0)}
                                                </div>
                                            )}
                                            {/* Gradient */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                                            {/* Availability badge */}
                                            <div className="absolute top-2 right-2">
                                                <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-wide backdrop-blur-sm
                                                    ${isOffday
                                                        ? 'bg-black/50 text-zinc-400'
                                                        : isAvailable
                                                            ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-700/40'
                                                            : 'bg-black/50 text-zinc-400'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full
                                                        ${isOffday ? 'bg-zinc-500' : isAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`}
                                                    />
                                                    {isOffday ? 'LIBUR' : isAvailable ? 'OPEN' : 'BUSY'}
                                                </span>
                                            </div>
                                            {/* Name overlay */}
                                            <div className="absolute bottom-0 left-0 right-0 px-3 py-2.5">
                                                <p className="font-black text-white text-sm leading-tight">{barber.name}</p>
                                                <p className="text-[9px] text-white/55 uppercase tracking-widest mt-0.5">{barberRole}</p>
                                            </div>
                                        </div>

                                        {/* Slots Panel */}
                                        <div className="flex-1 p-3 border-l border-border overflow-hidden">
                                            {!isOffday ? (
                                                <>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="text-sm font-bold tracking-[0.2em] text-muted-foreground uppercase">
                                                            Pilih Jam
                                                        </p>
                                                        <span className={`text-[10px] font-bold
                                                            ${availableSlotCount === 0
                                                                ? 'text-destructive'
                                                                : availableSlotCount <= 3
                                                                    ? 'text-brand'
                                                                    : 'text-muted-foreground'
                                                            }`}>
                                                            {availableSlotCount === 0 ? 'Penuh' : `${availableSlotCount} slot`}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-1">
                                                        {timeSlots.map((slot, idx) => {
                                                            const isBooked = existingBookings.some(b =>
                                                                b.barberId === barber.id && b.timeSlot === slot.label
                                                            );
                                                            return (
                                                                <button
                                                                    key={idx}
                                                                    disabled={isBooked}
                                                                    onClick={() => {
                                                                        if (!isBooked) {
                                                                            setSelectedBooking({
                                                                                barber: { id: barber.id, name: barber.name, username: barber.username },
                                                                                timeSlot: slot,
                                                                            });
                                                                            setBookingModalOpen(true);
                                                                        }
                                                                    }}
                                                                    className={`py-1.5 rounded-lg text-xs font-semibold transition-all duration-150
                                                                        ${isBooked
                                                                            ? 'text-muted-foreground/25 line-through cursor-not-allowed'
                                                                            : 'bg-secondary border border-border text-foreground hover:bg-brand hover:text-brand-foreground hover:border-brand active:scale-95'
                                                                        }`}
                                                                >
                                                                    {slot.start}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="h-full flex items-center justify-center">
                                                    <p className="text-xs text-muted-foreground">Libur hari ini</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── Cek Status Booking ── */}
                <div className="mt-10 border border-border rounded-2xl bg-card overflow-hidden">
                    <button
                        onClick={() => setStatusSectionOpen(prev => !prev)}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/50 transition-colors text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-foreground">Cek Status Booking</p>
                                <p className="text-xs text-muted-foreground">Masukkan nomor HP untuk melihat riwayat</p>
                            </div>
                        </div>
                        {statusSectionOpen
                            ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                            : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                        }
                    </button>

                    {statusSectionOpen && (
                        <div className="px-5 pb-5 border-t border-border pt-4 space-y-3">
                            <form onSubmit={handleCheckStatus} className="flex gap-2">
                                <input
                                    type="tel"
                                    placeholder="08123456789"
                                    value={statusPhone}
                                    onChange={e => setStatusPhone(e.target.value)}
                                    className="flex-1 bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand text-foreground placeholder-muted-foreground/50"
                                />
                                <button
                                    type="submit"
                                    disabled={statusLoading}
                                    className="px-5 py-2.5 bg-brand text-brand-foreground rounded-xl text-sm font-bold hover:bg-brand/80 transition-colors disabled:opacity-40"
                                >
                                    {statusLoading ? '...' : 'Cek'}
                                </button>
                            </form>

                            {statusError && (
                                <div className="flex items-center gap-2 text-sm text-brand bg-brand/10 border border-brand/30 rounded-xl px-4 py-3">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    {statusError}
                                </div>
                            )}

                            {statusResults && statusResults.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
                                        {statusResults.length} riwayat · 90 hari terakhir
                                    </p>
                                    {statusResults.map((item, idx) => {
                                        const st = STATUS_LABEL[item.status] ?? { label: item.status, color: 'text-muted-foreground bg-secondary border-border' };
                                        const isBooking = item.type === 'booking';
                                        return (
                                            <div key={idx} className="border border-border rounded-xl p-4 bg-secondary space-y-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-sm text-foreground">{item.customerName}</span>
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide
                                                                ${isBooking ? 'bg-blue-900 text-blue-300' : 'bg-card border border-border text-muted-foreground'}`}>
                                                                {isBooking ? 'Booking' : 'Walk-in'}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            {format(new Date(item.date), 'EEEE, d MMM yyyy', { locale: idLocale })}
                                                            {item.timeSlot && ` · ${item.timeSlot}`}
                                                        </p>
                                                    </div>
                                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ${st.color}`}>
                                                        {st.label}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                    <span>✂️ {item.barberName}</span>
                                                    {item.service && <span>· {item.service}</span>}
                                                    {item.amount && <span>· IDR {item.amount.toLocaleString('id-ID')}</span>}
                                                    {item.paymentMethod && (
                                                        <span className="ml-auto font-medium uppercase tracking-wide">{item.paymentMethod}</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <footer className="mt-16 border-t border-border pt-10 pb-6 text-center space-y-3">
                    <img src="/logo_kefas.PNG" alt="Kefas Barbershop" className="h-10 w-auto mx-auto opacity-30" />
                    <div className="flex justify-center gap-3">
                        <a
                            href="https://maps.google.com/?q=Jl.+Diponegoro+No.19+Kutorejo+Kertosono+Nganjuk"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-all"
                            aria-label="Location"
                        >
                            <MapPin className="w-4 h-4" />
                        </a>
                        <a
                            href="https://wa.me/6289570657799"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-all"
                            aria-label="WhatsApp Admin"
                        >
                            <MessageCircle className="w-4 h-4" />
                        </a>
                        <a
                            href="https://instagram.com/kefasbarbershop"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-all"
                            aria-label="Instagram @kefasbarbershop"
                        >
                            <Instagram className="w-4 h-4" />
                        </a>
                    </div>
                    <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Kefas Barbershop</p>
                    <VersionFooter />
                </footer>
            </main>

            {/* Modals */}
            {selectedBooking && (
                <BookingModal
                    open={bookingModalOpen}
                    onOpenChange={setBookingModalOpen}
                    barber={selectedBooking.barber}
                    timeSlot={selectedBooking.timeSlot}
                    bookingDate={selectedDate}
                    onSuccess={() => {
                        setLastBookedInfo({
                            barberName: selectedBooking.barber.name,
                            slot: selectedBooking.timeSlot.label,
                        });
                        fetchBarbers();
                        fetchBookingsForDate(selectedDate);
                    }}
                />
            )}

            <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-transparent border-none shadow-none flex items-center justify-center ring-0 focus:ring-0">
                    {selectedImage && (
                        <img
                            src={selectedImage}
                            alt="Full Profile"
                            className="w-auto max-h-[85vh] rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300"
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
