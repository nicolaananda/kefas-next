'use client';

import { useState, useEffect } from 'react';

import { usePosStore } from '@/lib/store';
import { API_BASE_URL, UPLOADS_BASE_URL } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Scissors } from 'lucide-react';

interface Service {
    id: number;
    name: string;
    price: number;
    imageUrl?: string | null;
}

export default function ServiceGrid() {
    const { addToCart, selectedBarber } = usePosStore();
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(false); // Default false to avoid flash if fast? No, let's keep logic

    useEffect(() => {
        setLoading(true);
        const token = localStorage.getItem('token');
        fetch(`${API_BASE_URL}/services`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then((res) => {
                if (!res.ok) throw new Error('Failed to fetch services');
                return res.json();
            })
            .then((data) => {
                setServices(data);
                setLoading(false);
            })
            .catch((err) => console.error(err));
    }, []);

    const [searchTerm, setSearchTerm] = useState('');

    const filteredServices = services.filter(service => {
        // Search filter
        if (!service.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;

        if (!selectedBarber) return true;

        const serviceName = service.name.toLowerCase();

        // Owner (Bagus) Logic
        if (selectedBarber.username === 'bagus') {
            // Hide regular haircut
            if ((serviceName.includes('haircut') || serviceName.includes('cukur')) && !serviceName.includes('head')) return false;
            // Show everything else (including 'Haircut by Head')
            return true;
        }

        // Other Barbers Logic
        else {
            // Hide owner exclusive services
            if (serviceName.includes('head') || serviceName.includes('owner')) return false;
            // Show everything else (including regular 'Haircut')
            return true;
        }
    });

    if (loading) return <div>Loading Services...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold tracking-tight uppercase text-foreground flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                    Select Service
                </h2>
                <input
                    type="text"
                    placeholder="Search..."
                    className="p-2 border border-border rounded-md text-sm w-full max-w-xs bg-card text-foreground placeholder-zinc-400 focus:ring-1 focus:ring-ring focus:border-primary outline-none transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                {filteredServices.map((service) => {
                    const bgImage = service.imageUrl ? `${UPLOADS_BASE_URL}${service.imageUrl}` : null;

                    return (
                        <Card key={service.id} className={`cursor-pointer group hover:shadow-lg transition-all duration-200 border-border selection:none active:scale-[0.98] overflow-hidden relative ${bgImage ? 'border-0 bg-primary' : 'bg-card border'}`}>
                            <CardContent className="p-0 h-full">
                                <Button
                                    variant="ghost"
                                    className={`w-full h-auto p-4 flex flex-row items-center justify-between gap-3 text-left rounded-none whitespace-normal relative z-10 ${bgImage ? 'hover:bg-black/20 text-primary-foreground min-h-[100px] items-end' : 'hover:bg-background min-h-[80px]'}`}
                                    disabled={!selectedBarber}
                                    onClick={() =>
                                        addToCart({
                                            id: service.id.toString(),
                                            name: service.name,
                                            price: service.price,
                                            qty: 1,
                                        })
                                    }
                                >
                                    {bgImage && (
                                        <>
                                            <div
                                                className="absolute inset-0 z-[-1] bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                                                style={{ backgroundImage: `url('${bgImage}')` }}
                                            />
                                            <div className="absolute inset-0 z-[-1] bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
                                        </>
                                    )}

                                    <div className="flex items-center gap-3 w-full">
                                        {!bgImage && (
                                            <div className="p-2 bg-muted rounded-lg group-hover:bg-accent text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0">
                                                <Scissors className="h-5 w-5" />
                                            </div>
                                        )}
                                        <div className={`font-bold text-sm md:text-base line-clamp-2 leading-tight flex-1 ${bgImage ? 'text-primary-foreground text-lg drop-shadow-md' : 'text-foreground'}`}>
                                            {service.name}
                                        </div>
                                    </div>
                                    <div className={`font-mono font-bold text-sm whitespace-nowrap ${bgImage ? 'text-primary-foreground/90 bg-black/30 px-2 py-1 rounded backdrop-blur-sm' : 'text-foreground'}`}>
                                        {service.price.toLocaleString('id-ID')}
                                    </div>
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
            {!selectedBarber && (
                <div className="bg-muted border border-border rounded-lg p-4 text-center">
                    <p className="text-muted-foreground font-medium">
                        Please select a barber first to unlock services.
                    </p>
                </div>
            )}
        </div>
    );
}
