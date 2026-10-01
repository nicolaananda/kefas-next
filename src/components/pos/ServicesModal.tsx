import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Scissors, Sparkles, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { API_BASE_URL, UPLOADS_BASE_URL } from '@/lib/api';

interface Service {
    id: number;
    name: string;
    price: number;
    imageUrl?: string | null;
}

interface ServicesModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function ServicesModal({ open, onOpenChange }: ServicesModalProps) {
    const [services, setServices] = useState<Service[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (open) {
            fetch(`${API_BASE_URL}/services`)
                .then(res => {
                    if (!res.ok) throw new Error('Failed to fetch');
                    return res.json();
                })
                .then(data => {
                    setServices(data);
                    setIsLoading(false);
                })
                .catch(err => console.error(err));
        }
    }, [open]);

    // Format currency
    const formatRp = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(value);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-card border-border text-foreground shadow-2xl overflow-hidden p-0 gap-0">
                <div className="bg-primary p-6 text-primary-foreground text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-secondary/50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-secondary/50 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

                    <DialogHeader className="relative z-10">
                        <DialogTitle className="text-2xl font-bold flex flex-col items-center gap-2">
                            <div className="w-12 h-12 bg-card/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <Scissors className="w-6 h-6 text-primary-foreground" />
                            </div>
                            Service Menu
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Professional cuts & treatments
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="h-[60vh] md:h-auto md:max-h-[60vh] p-6 bg-card overflow-y-auto">
                    {isLoading ? (
                        <div className="text-center text-muted-foreground py-10">Loading services...</div>
                    ) : (
                        <div className="space-y-4">
                            {services.map((service, idx) => (
                                <div
                                    key={service.id}
                                    className="group flex items-center justify-between p-3 rounded-lg hover:bg-background border border-transparent hover:border-border transition-all cursor-default"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-muted flex flex-shrink-0 items-center justify-center overflow-hidden border border-border text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                                            {service.imageUrl ? (
                                                <img src={`${UPLOADS_BASE_URL}${service.imageUrl}`} alt={service.name} className="w-full h-full object-cover" />
                                            ) : (
                                                idx % 2 === 0 ? <Scissors className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />
                                            )}
                                        </div>
                                        <span className="font-semibold text-foreground group-hover:text-foreground">{service.name}</span>
                                    </div>
                                    <Badge variant="secondary" className="bg-muted text-foreground border-border group-hover:bg-primary group-hover:text-primary-foreground transition-colors px-3 py-1 text-sm">
                                        {formatRp(service.price)}
                                    </Badge>
                                </div>
                            ))}

                            {services.length === 0 && (
                                <div className="text-center text-muted-foreground py-10">No services available</div>
                            )}
                        </div>
                    )}

                    <div className="bg-background rounded-xl p-4 md:p-6 mb-6">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Kefas Member?</p>
                        <p className="text-sm font-semibold text-foreground">Get 10% OFF on your 5th visit!</p>
                    </div>
                </div>

                <div className="p-4 bg-background border-t border-border text-center">
                    <button
                        onClick={() => onOpenChange(false)}
                        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Close Menu
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
