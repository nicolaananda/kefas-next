import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowRight, ArrowLeft, UploadCloud, Scissors, Check } from 'lucide-react';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';
import { cn } from '@/lib/utils';
import { API_BASE_URL, UPLOADS_BASE_URL } from '@/lib/api';

// Dummy QRIS - In production, this should be real
const QRIS_IMAGE = "/qris.webp";

interface BookingModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    barber: { id: number; name: string; username?: string };
    timeSlot: { start: string; end: string; label: string };
    bookingDate: Date;
    onSuccess?: () => void;
}

interface Service {
    id: number;
    name: string;
    price: number;
    imageUrl?: string | null;
}

export default function BookingModal({ open, onOpenChange, barber, timeSlot, bookingDate, onSuccess }: BookingModalProps) {
    const [step, setStep] = useState(1); // 1: Details, 2: Payment
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');

    // Service State
    const [services, setServices] = useState<Service[]>([]);
    const [selectedServiceId, setSelectedServiceId] = useState<string>('');
    const [selectedService, setSelectedService] = useState<Service | null>(null);

    const [paymentProof, setPaymentProof] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const [isLoadingServices, setIsLoadingServices] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [qrisModalOpen, setQrisModalOpen] = useState(false);

    useEffect(() => {
        if (open) {
            fetchServices();
        }
    }, [open]);

    const fetchServices = async () => {
        setIsLoadingServices(true);
        try {
            const url = `${API_BASE_URL}/services?barberId=${barber.id}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                const availableServices = data.filter((s: any) => s.isActive);

                // Sort: potong/haircut first, then others
                availableServices.sort((a: any, b: any) => {
                    const getPriority = (name: string): number => {
                        const n = name.toLowerCase();
                        if (n.includes('potong') || n.includes('head barber') || n.includes('haircut') || n.includes('cukur')) return 0;
                        if (n.includes('keramas')) return 1;
                        if (n.includes('shav') || n.includes('beard')) return 2;
                        if (n.includes('toning')) return 3;
                        if (n.includes('perm')) return 4;
                        if (n.includes('highlight') || n.includes('fashion colour') || n.includes('fashion color') || n.includes('coloring')) return 5;
                        if (n.includes('semir')) return 6;
                        return 99;
                    };
                    return getPriority(a.name) - getPriority(b.name);
                });

                setServices(availableServices);
                if (availableServices.length > 0) {
                    setSelectedServiceId(availableServices[0].id.toString());
                    setSelectedService(availableServices[0]);
                }
            }
        } catch (error) {
            console.error("Failed to fetch services", error);
        } finally {
            setIsLoadingServices(false);
        }
    };

    const handleServiceChange = (value: string) => {
        setSelectedServiceId(value);
        const service = services.find(s => s.id.toString() === value);
        setSelectedService(service || null);
    };


    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // Validate file type
            if (!file.type.startsWith('image/')) {
                setError("Hanya file gambar yang diperbolehkan");
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                setError("File terlalu besar (Maks 5MB)");
                return;
            }

            try {
                // Show compression toast
                toast.loading('Mengompres gambar...', { id: 'compress' });

                // ⚡ AUTO-COMPRESS before upload
                const options = {
                    maxSizeMB: 0.2,          // Target 200KB
                    maxWidthOrHeight: 1920,  // Max dimension
                    useWebWorker: true,
                    fileType: 'image/jpeg',  // Convert all to JPEG
                };

                const compressedFile = await imageCompression(file, options);

                // Calculate compression ratio
                const ratio = ((1 - compressedFile.size / file.size) * 100).toFixed(0);

                toast.success(`Gambar dikompres ${ratio}% ✨`, {
                    id: 'compress',
                    description: `${(file.size / 1024 / 1024).toFixed(1)}MB → ${(compressedFile.size / 1024).toFixed(0)}KB`
                });

                setPaymentProof(compressedFile);
                setPreviewUrl(URL.createObjectURL(compressedFile));
                setError('');
            } catch (error) {
                toast.error('Gagal mengompres gambar', { id: 'compress' });
                console.error('Compression error:', error);
                setError('Gagal memproses gambar');
            }
        }
    };

    const handleNextStep = () => {
        setError('');
        if (!customerName.trim()) return setError('Nama harus diisi');
        if (customerName.trim().length < 2) return setError('Nama minimal 2 karakter');
        if (!customerPhone.trim()) return setError('Nomor WhatsApp harus diisi');

        // Strict Indonesian phone validation
        const phonePattern = /^08\d{8,11}$/;
        if (!phonePattern.test(customerPhone.trim())) {
            return setError('Nomor WhatsApp tidak valid. Format: 08xxxxxxxxxx');
        }

        if (!selectedServiceId) return setError('Pilih layanan');

        setStep(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!paymentProof) return setError("Wajib upload bukti transfer!");

        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('barberId', barber.id.toString());
            formData.append('customerName', customerName.trim());
            formData.append('customerPhone', customerPhone.trim());
            formData.append('bookingDate', bookingDate.toISOString());
            formData.append('timeSlot', timeSlot.label);
            formData.append('serviceId', selectedServiceId);
            formData.append('proof', paymentProof);

            const res = await fetch(`${API_BASE_URL}/bookings`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Gagal membuat booking');
            }

            // Success - Clear form
            setCustomerName('');
            setCustomerPhone('');
            setPaymentProof(null);
            setPreviewUrl(null);
            setStep(1);
            onOpenChange(false);

            // 🎉 Confetti Explosion!
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#18181b', '#f4f4f5', '#22c55e'] // Black, White, Green
            });

            // Show premium toast notification
            toast.success('Booking Berhasil Dibuat! ✨', {
                description: (
                    <div className="space-y-2 mt-2">
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Nama:</span>
                            <span className="font-bold text-foreground">{customerName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Barber:</span>
                            <span className="font-bold text-foreground">{barber.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Waktu:</span>
                            <span className="font-bold text-foreground">{timeSlot.label} WIB</span>
                        </div>
                        <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-xs text-muted-foreground">
                                💬 Konfirmasi akan dikirim via WhatsApp oleh Kefas Barbershop dalam beberapa saat.
                            </p>
                        </div>
                    </div>
                ),
                duration: 6000,
                classNames: {
                    toast: 'bg-card border-border',
                    title: 'text-foreground font-bold',
                    description: 'text-muted-foreground',
                },
            });

            if (onSuccess) onSuccess();
        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan. Silakan coba lagi.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Format currency
    const formatRp = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(value);
    };

    return (
        <>
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-card p-0 max-h-[90vh] overflow-y-auto rounded-3xl border-none shadow-2xl gap-0">
                {/* Header Section */}
                <div className="bg-background border-b border-border p-4 flex flex-col items-center justify-center text-center">
                    <DialogTitle className="text-xl font-black text-foreground uppercase tracking-wide">
                        {step === 1 ? 'Booking Details' : 'Payment Verification'}
                    </DialogTitle>
                    <div className="mt-2 inline-flex items-center gap-2 bg-card px-3 py-1 rounded-full border border-border shadow-sm">
                        <span className="text-xs font-bold text-foreground">{barber.name}</span>
                        <span className="text-zinc-300">•</span>
                        <span className="text-xs font-medium text-muted-foreground">{timeSlot.label}</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-4">
                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-left-4 fade-in duration-300">
                            {/* Inputs Group */}
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Nama Lengkap</Label>
                                    <Input
                                        id="name"
                                        placeholder="Masukkan nama Anda"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        className="h-12 rounded-2xl bg-background border-transparent focus:ring-2 focus:ring-ring focus:bg-card transition-all text-sm font-medium"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="phone" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Nomor WhatsApp</Label>
                                    <Input
                                        id="phone"
                                        placeholder="08xxxxxxxxxx"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        className="h-12 rounded-2xl bg-background border-transparent focus:ring-2 focus:ring-ring focus:bg-card transition-all text-sm font-medium"
                                    />
                                </div>
                            </div>

                            {/* Service Selection */}
                            <div className="space-y-2">
                                <Label htmlFor="service" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">Pilih Layanan</Label>
                                {isLoadingServices ? (
                                    <div className="h-24 flex items-center justify-center bg-background rounded-2xl">
                                        <Loader2 className="w-5 h-5 animate-spin text-zinc-300" />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3 max-h-[260px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-600 [&::-webkit-scrollbar-thumb]:rounded-full">
                                        {services.map((service) => {
                                            const bgImage = service.imageUrl
                                                ? `${UPLOADS_BASE_URL}${service.imageUrl}`
                                                : null;
                                            const isSelected = selectedServiceId === service.id.toString();

                                            return (
                                                <button
                                                    key={service.id}
                                                    type="button"
                                                    onClick={() => handleServiceChange(service.id.toString())}
                                                    className={cn(
                                                        "relative h-24 rounded-2xl overflow-hidden transition-all duration-300 group text-left",
                                                        isSelected
                                                            ? "ring-2 ring-zinc-900 shadow-xl scale-[1.02]"
                                                            : "ring-1 ring-zinc-100 opacity-80 hover:opacity-100 hover:scale-[1.01]"
                                                    )}
                                                >
                                                    {bgImage ? (
                                                        <>
                                                            <div
                                                                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                                                                style={{ backgroundImage: `url('${bgImage}')` }}
                                                            />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                                        </>
                                                    ) : (
                                                        <div className="absolute inset-0 bg-muted" />
                                                    )}

                                                    {/* Checkmark Badge */}
                                                    <div className={cn(
                                                        "absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-all",
                                                        isSelected ? "bg-card text-foreground scale-100" : "bg-black/20 text-primary-foreground/0 scale-0"
                                                    )}>
                                                        <Check className="w-3 h-3 stroke-[3]" />
                                                    </div>

                                                    <div className="absolute bottom-0 left-0 w-full p-3 text-primary-foreground">
                                                        <p className={cn(
                                                            "text-[10px] font-bold uppercase tracking-wider mb-0.5 leading-tight",
                                                            !bgImage && "text-foreground"
                                                        )}>
                                                            {service.name}
                                                        </p>
                                                        <p className={cn(
                                                            "text-xs font-medium opacity-90",
                                                            !bgImage && "text-muted-foreground"
                                                        )}>
                                                            {formatRp(service.price)}
                                                        </p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
                            {/* Grid Layout for Compactness */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* Left Col: QRIS */}
                                <div className="bg-background p-3 rounded-2xl flex flex-col items-center justify-center border border-border text-center h-full">
                                    <button
                                        onClick={() => setQrisModalOpen(true)}
                                        className="relative group cursor-pointer bg-card p-1.5 rounded-xl border border-border shadow-sm mb-2 active:scale-95 transition-transform"
                                    >
                                        <img
                                            src={QRIS_IMAGE}
                                            alt="QRIS Code"
                                            className="w-28 h-28 object-contain rounded-lg"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">Tap untuk perbesar</span>
                                        </div>
                                    </button>
                                    <p className="text-[10px] text-muted-foreground leading-tight">
                                        Scan QRIS & Upload Bukti
                                    </p>
                                </div>

                                {/* Right Col: Details & Upload */}
                                <div className="flex flex-col gap-3">
                                    {/* Total Payment Card */}
                                    <div className="bg-background p-3 rounded-2xl border border-border flex flex-col items-center justify-center text-center">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total</span>
                                        <span className="text-xl font-black text-foreground">{selectedService ? formatRp(selectedService.price) : '-'}</span>
                                    </div>

                                    {/* Compact Upload Area */}
                                    <Label
                                        htmlFor="proof"
                                        className={cn(
                                            "flex flex-col items-center justify-center w-full flex-1 min-h-[80px] border-2 border-dashed rounded-2xl cursor-pointer transition-all overflow-hidden relative group",
                                            previewUrl
                                                ? "border-primary bg-card"
                                                : "border-border bg-background hover:bg-muted hover:border-zinc-300"
                                        )}
                                    >
                                        {previewUrl ? (
                                            <div className="relative w-full h-full p-1">
                                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                                                    <UploadCloud className="w-5 h-5 text-primary-foreground" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center text-muted-foreground group-hover:text-muted-foreground">
                                                <UploadCloud className="w-5 h-5 mb-1" />
                                                <p className="text-[10px] font-medium text-center leading-tight">Tap to<br />Upload</p>
                                            </div>
                                        )}
                                        <Input
                                            id="proof"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleFileChange}
                                        />
                                    </Label>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-medium flex items-center gap-2">
                            <div className="w-1 h-4 bg-red-500 rounded-full"></div>
                            {error}
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex gap-3 mt-5">
                        {step === 1 ? (
                            <>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => onOpenChange(false)}
                                    className="flex-1 rounded-full hover:bg-muted text-muted-foreground font-bold"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleNextStep}
                                    className="flex-[2] rounded-full bg-primary text-primary-foreground hover:bg-secondary font-bold"
                                >
                                    Lanjut Bayar
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setStep(1)}
                                    disabled={isSubmitting}
                                    className="flex-1 rounded-full hover:bg-muted text-muted-foreground font-bold"
                                >
                                    Kembali
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] rounded-full bg-primary text-primary-foreground hover:bg-secondary font-bold shadow-lg shadow-zinc-900/20"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Wait...
                                        </>
                                    ) : (
                                        'Konfirmasi'
                                    )}
                                </Button>
                            </>
                        )}
                    </div>
                </form>
            </DialogContent>
        </Dialog>

        {/* QRIS Zoom Modal */}
        <Dialog open={qrisModalOpen} onOpenChange={setQrisModalOpen}>
            <DialogContent className="max-w-sm p-0 bg-transparent border-none shadow-none flex items-center justify-center">
                <div className="relative">
                    <img
                        src={QRIS_IMAGE}
                        alt="QRIS Code"
                        className="w-[280px] h-[280px] object-contain rounded-2xl shadow-2xl"
                    />
                    <button
                        onClick={() => setQrisModalOpen(false)}
                        className="absolute -top-3 -right-3 w-8 h-8 bg-card border border-border rounded-full flex items-center justify-center shadow-lg hover:bg-destructive hover:text-white hover:border-destructive transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-center text-sm text-white mt-4 font-medium">Scan QRIS untuk pembayaran</p>
            </DialogContent>
        </Dialog>
        </>
    );
}
