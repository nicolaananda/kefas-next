import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { API_BASE_URL } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Trash2, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SpecialHours {
    id: number;
    barberId: number;
    date: string;
    openTime: string;
    closeTime: string;
    notes: string | null;
    barber?: { name: string };
}

interface Barber {
    id: number;
    name: string;
    username: string;
    defaultOffDay?: number | null;
}

interface OffDay {
    id: number;
    userId: number;
    date: string;
    reason: string;
    user: {
        name: string;
    };
}

export default function SchedulePage() {
    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [offDays, setOffDays] = useState<OffDay[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedBarber, setSelectedBarber] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [duration, setDuration] = useState<number | ''>('');
    const [reason, setReason] = useState('');

    // Recurring Off-Day State
    const [recurringBarber, setRecurringBarber] = useState<string>('');
    const [recurringDay, setRecurringDay] = useState<string>('');

    // Special Hours State
    const [specialHoursList, setSpecialHoursList] = useState<SpecialHours[]>([]);
    const [shBarber, setShBarber] = useState<string>('');
    const [shDate, setShDate] = useState<string>('');
    const [shOpen, setShOpen] = useState<string>('09:00');
    const [shClose, setShClose] = useState<string>('21:00');
    const [shNotes, setShNotes] = useState<string>('');

    const DAYS = [
        { value: '0', label: 'Sunday' },
        { value: '1', label: 'Monday' },
        { value: '2', label: 'Tuesday' },
        { value: '3', label: 'Wednesday' },
        { value: '4', label: 'Thursday' },
        { value: '5', label: 'Friday' },
        { value: '6', label: 'Saturday' },
    ];

    useEffect(() => {
        fetchBarbers();
        fetchOffDays();
        fetchSpecialHours();
    }, []);

    const fetchBarbers = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/users/barbers`);
            if (res.ok) {
                const data = await res.json();
                setBarbers(data);
            }
        } catch (error) {
            console.error('Error fetching barbers:', error);
        }
    };

    const fetchSpecialHours = async () => {
        try {
            const today = new Date();
            const future = new Date();
            future.setMonth(future.getMonth() + 3);
            const startStr = format(today, 'yyyy-MM-dd');
            const endStr = format(future, 'yyyy-MM-dd');
            const res = await fetch(`${API_BASE_URL}/special-hours?start=${startStr}&end=${endStr}`);
            if (res.ok) {
                const data = await res.json();
                setSpecialHoursList(data);
            }
        } catch (error) {
            console.error('Error fetching special hours:', error);
        }
    };

    const handleSaveSpecialHours = async () => {
        if (!shBarber || !shDate || !shOpen || !shClose) {
            alert('Pilih barber, tanggal, jam buka, dan jam tutup');
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/special-hours`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ barberId: shBarber, date: shDate, openTime: shOpen, closeTime: shClose, notes: shNotes || undefined })
            });
            if (res.ok) {
                alert('Jam khusus berhasil disimpan');
                fetchSpecialHours();
                setShDate('');
                setShNotes('');
            } else {
                const err = await res.json();
                alert(err.error || 'Gagal menyimpan jam khusus');
            }
        } catch (error) {
            console.error('Error saving special hours:', error);
        }
    };

    const handleDeleteSpecialHours = async (id: number) => {
        if (!confirm('Hapus jam khusus ini?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/special-hours/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) fetchSpecialHours();
        } catch (error) {
            console.error('Error deleting special hours:', error);
        }
    };

    const fetchOffDays = async () => {
        try {
            const today = new Date();
            const future = new Date();
            future.setMonth(future.getMonth() + 3);

            // Format as YYYY-MM-DD manually to avoid timezone shifts
            const startStr = format(today, 'yyyy-MM-dd');
            const endStr = format(future, 'yyyy-MM-dd');

            console.log('Fetching offdays:', startStr, endStr);

            const res = await fetch(`${API_BASE_URL}/offdays?start=${startStr}&end=${endStr}`);
            if (res.ok) {
                const data = await res.json();
                console.log('Offdays data:', data);
                setOffDays(data);
            }
        } catch (error) {
            console.error('Error fetching off days:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddOffDay = async () => {
        if (!selectedBarber || !selectedDate) {
            alert('Please select a barber and a date');
            return;
        }
        if (typeof duration !== 'number' || duration < 1) {
            alert('Durasi wajib diisi (minimal 1 hari)');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/offdays`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: selectedBarber,
                    date: selectedDate,
                    duration,
                    reason: reason || 'Manual Off Day'
                })
            });

            if (res.ok) {
                const data = await res.json();
                alert(data.message || 'Off day added successfully');
                fetchOffDays();
                setReason('');
                setDuration('');
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to add off day');
            }
        } catch (error) {
            console.error('Error adding off day:', error);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure?')) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/offdays/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                fetchOffDays();
            }
        } catch (error) {
            console.error('Error deleting off day:', error);
        }
    };

    const handleSetRecurringOffDay = async () => {
        if (!recurringBarber || !recurringDay) {
            alert('Please select a barber and a day');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/users/${recurringBarber}/default-offday`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    defaultOffDay: parseInt(recurringDay)
                })
            });

            if (res.ok) {
                alert('Recurring off-day set successfully');
                fetchBarbers();
                setRecurringDay('');
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to set recurring off-day');
            }
        } catch (error) {
            console.error('Error setting recurring off-day:', error);
        }
    };

    const handleClearRecurringOffDay = async (barberId: number) => {
        if (!confirm('Clear recurring off-day for this barber?')) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/users/${barberId}/default-offday`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    defaultOffDay: null
                })
            });

            if (res.ok) {
                fetchBarbers();
            }
        } catch (error) {
            console.error('Error clearing recurring off-day:', error);
        }
    };

    const getDayName = (dayNum: number | null | undefined) => {
        if (dayNum === null || dayNum === undefined) return 'None';
        const day = DAYS.find(d => d.value === dayNum.toString());
        return day ? day.label : 'Unknown';
    };

    return (
        <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Schedule Management</h1>
                <p className="text-muted-foreground">Manage off days for staff.</p>
            </div>

            {/* Recurring Weekly Off-Days Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Recurring Weekly Off-Days</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Set Recurring Off-Day Form */}
                    <div className="space-y-4 pb-6 border-b">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select Barber</label>
                            <Select value={recurringBarber} onValueChange={setRecurringBarber}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select staff..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {barbers.map((b) => (
                                        <SelectItem key={b.id} value={b.id.toString()}>
                                            {b.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select Day</label>
                            <Select value={recurringDay} onValueChange={setRecurringDay}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select day of week..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {DAYS.map((day) => (
                                        <SelectItem key={day.value} value={day.value}>
                                            {day.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button onClick={handleSetRecurringOffDay} className="w-full bg-primary text-primary-foreground hover:bg-secondary">
                            Set Recurring Off-Day
                        </Button>
                    </div>

                    {/* Current Recurring Off-Days */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-foreground">Current Settings</h4>
                        {barbers.length === 0 ? (
                            <p className="text-center text-muted-foreground py-4">No barbers found.</p>
                        ) : (
                            <div className="space-y-2">
                                {barbers.map((barber) => (
                                    <div key={barber.id} className="flex justify-between items-center p-3 border rounded-lg bg-background">
                                        <div>
                                            <p className="font-bold text-foreground">{barber.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Weekly off-day: <span className="font-medium">{getDayName(barber.defaultOffDay)}</span>
                                            </p>
                                        </div>
                                        {barber.defaultOffDay !== null && barber.defaultOffDay !== undefined && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleClearRecurringOffDay(barber.id)}
                                            >
                                                Clear
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Special Hours Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Jam Buka Khusus per Tanggal
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Form */}
                    <div className="space-y-4 pb-6 border-b">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Pilih Barber</label>
                            <Select value={shBarber} onValueChange={setShBarber}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih barber..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {barbers.map((b) => (
                                        <SelectItem key={b.id} value={b.id.toString()}>
                                            {b.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tanggal</label>
                                <Input
                                    type="date"
                                    value={shDate}
                                    onChange={(e) => setShDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Jam Buka</label>
                                <Input
                                    type="time"
                                    value={shOpen}
                                    onChange={(e) => setShOpen(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Jam Tutup</label>
                                <Input
                                    type="time"
                                    value={shClose}
                                    onChange={(e) => setShClose(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Catatan (opsional)</label>
                            <Input
                                value={shNotes}
                                onChange={(e) => setShNotes(e.target.value)}
                                placeholder="e.g. Libur nasional, event khusus"
                            />
                        </div>
                        <Button onClick={handleSaveSpecialHours} className="w-full bg-primary text-primary-foreground hover:bg-secondary">
                            Simpan Jam Khusus
                        </Button>
                    </div>

                    {/* List */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-foreground">Jadwal Jam Khusus Mendatang</h4>
                        {specialHoursList.length === 0 ? (
                            <p className="text-center text-muted-foreground py-4">Belum ada jam khusus yang diatur.</p>
                        ) : (
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                {specialHoursList.map((sh) => (
                                    <div key={sh.id} className="flex justify-between items-center p-3 border rounded-lg bg-background">
                                        <div>
                                            <p className="font-bold text-foreground">
                                                {sh.barber?.name} — {format(new Date(sh.date), 'EEEE, d MMMM yyyy')}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Buka: <span className="font-medium">{sh.openTime}</span> — Tutup: <span className="font-medium">{sh.closeTime}</span>
                                                {sh.notes && <span className="ml-2 italic">({sh.notes})</span>}
                                            </p>
                                        </div>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleDeleteSpecialHours(sh.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Add Off Day Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Add Off Day</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select Barber</label>
                            <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select staff..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {barbers.map((b) => (
                                        <SelectItem key={b.id} value={b.id.toString()}>
                                            {b.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tanggal Mulai</label>
                                <Input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Durasi (hari)</label>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    placeholder="cth. 1"
                                    value={duration}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        if (val === '') {
                                            setDuration('');
                                            return;
                                        }
                                        const num = parseInt(val);
                                        if (!isNaN(num)) {
                                            setDuration(Math.min(num, 30));
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Alasan (Opsional)</label>
                            <Input
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="cth. Sakit, Cuti, Liburan"
                            />
                        </div>

                        <Button onClick={handleAddOffDay} className="w-full bg-primary text-primary-foreground hover:bg-secondary">
                            Set as Off Day
                        </Button>
                    </CardContent>
                </Card>

                {/* Upcoming Off Days List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Upcoming Off Days</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                        ) : offDays.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No upcoming off days set.</p>
                        ) : (
                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                                {offDays.map((od) => (
                                    <div key={od.id} className="flex justify-between items-center p-4 border rounded-lg bg-background">
                                        <div>
                                            <p className="font-bold text-foreground">{od.user.name}</p>
                                            <p className="text-sm text-muted-foreground">{format(new Date(od.date), 'EEEE, d MMMM yyyy')}</p>
                                        </div>
                                        <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(od.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
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
