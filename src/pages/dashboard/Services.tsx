import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Plus,
    Pencil,
    Trash2,
    Scissors,
    Loader2,
    Search,
    SortAsc,
    Users
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { API_BASE_URL, UPLOADS_BASE_URL } from '@/lib/api';

interface Service {
    id: number;
    name: string;
    price: number;
    commissionType: 'percentage' | 'flat';
    commissionValue: number;
    imageUrl?: string | null;
    allowedBarberIds?: string | null;
}

interface Barber {
    id: number;
    name: string;
    username: string;
}

export default function ServicesPage() {
    const [services, setServices] = useState<Service[]>([]);
    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Filter & Sort
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('name');

    // Form State
    const [currentId, setCurrentId] = useState<number | null>(null);
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [commissionType, setCommissionType] = useState<'percentage' | 'flat'>('percentage');
    const [commissionValue, setCommissionValue] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [selectedBarberIds, setSelectedBarberIds] = useState<number[]>([]); // empty = all barbers

    useEffect(() => {
        fetchServices();
        fetchBarbers();
    }, []);

    const fetchServices = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/services`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch services');
            const data = await res.json();
            setServices(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBarbers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch barbers');
            const data = await res.json();
            setBarbers(data);
        } catch (error) {
            console.error(error);
        }
    };

    const toggleBarber = (id: number) => {
        setSelectedBarberIds(prev =>
            prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
        );
    };

    const getBarberNames = (service: Service): string => {
        if (!service.allowedBarberIds) return 'Semua barber';
        const ids = service.allowedBarberIds.split(',').map(id => parseInt(id.trim())).filter(Boolean);
        if (ids.length === 0) return 'Semua barber';
        return barbers.filter(b => ids.includes(b.id)).map(b => b.name).join(', ') || 'Semua barber';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const method = currentId ? 'PATCH' : 'POST';
            const url = currentId ? `${API_BASE_URL}/services/${currentId}` : `${API_BASE_URL}/services`;

            const formData = new FormData();
            formData.append('name', name);
            formData.append('price', price);
            formData.append('commissionType', commissionType);
            formData.append('commissionValue', commissionValue);
            formData.append('allowedBarberIds', selectedBarberIds.join(','));
            if (imageFile) {
                formData.append('image', imageFile);
            }

            await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            await fetchServices();
            handleClose();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this service?')) return;
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_BASE_URL}/services/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            await fetchServices();
        } catch (error) {
            console.error(error);
        }
    };

    const handleEdit = (service: Service) => {
        setCurrentId(service.id);
        setName(service.name);
        setPrice(service.price.toString());
        setCommissionType(service.commissionType);
        setCommissionValue(service.commissionValue.toString());
        const ids = service.allowedBarberIds
            ? service.allowedBarberIds.split(',').map(id => parseInt(id.trim())).filter(Boolean)
            : [];
        setSelectedBarberIds(ids);
        setIsDialogOpen(true);
    };

    const handleClose = () => {
        setIsDialogOpen(false);
        setTimeout(() => {
            setCurrentId(null);
            setName('');
            setPrice('');
            setCommissionType('percentage');
            setCommissionValue('');
            setImageFile(null);
            setSelectedBarberIds([]);
        }, 150);
    };

    // Filter Logic
    const filteredServices = services
        .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            if (sortBy === 'price_asc') return a.price - b.price;
            if (sortBy === 'price_desc') return b.price - a.price;
            return a.name.localeCompare(b.name);
        });

    return (
        <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Services Menu</h1>
                    <p className="text-muted-foreground">Manage your service offerings and pricing.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="font-bold shadow-lg shadow-primary/20">
                            <Plus className="mr-2 h-4 w-4" /> Add Service
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{currentId ? 'Edit Service' : 'Add New Service'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Service Name</Label>
                                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="price">Price (IDR)</Label>
                                <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} required />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="commissionType">Commission Type</Label>
                                    <Select value={commissionType} onValueChange={(v: 'percentage' | 'flat') => setCommissionType(v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                                            <SelectItem value="flat">Flat Rate (IDR)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="commissionValue">
                                        {commissionType === 'percentage' ? 'Percentage (%)' : 'Amount (IDR)'}
                                    </Label>
                                    <Input
                                        id="commissionValue"
                                        type="number"
                                        value={commissionValue}
                                        onChange={(e) => setCommissionValue(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Barber Assignment */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Users className="w-4 h-4" /> Barber yang bisa layanan ini
                                </Label>
                                <p className="text-xs text-muted-foreground">Kosongkan = semua barber bisa</p>
                                <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg border border-border">
                                    {barbers.map(barber => {
                                        const isSelected = selectedBarberIds.includes(barber.id);
                                        return (
                                            <button
                                                key={barber.id}
                                                type="button"
                                                onClick={() => toggleBarber(barber.id)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                                    isSelected
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-background text-muted-foreground border border-border hover:border-primary'
                                                }`}
                                            >
                                                {barber.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="image">Background Image</Label>
                                <Input id="image" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                                <p className="text-[10px] text-muted-foreground">Optional. Will be auto-converted to WebP.</p>
                            </div>

                            <DialogFooter className="pt-4">
                                <Button type="submit">{currentId ? 'Save Changes' : 'Create'}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Toolbar */}
            <div className="flex gap-4 items-center bg-card p-4 rounded-lg border border-border shadow-sm">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search services..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-[180px]">
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger>
                            <div className="flex items-center gap-2">
                                <SortAsc className="w-4 h-4 text-muted-foreground" />
                                <SelectValue placeholder="Sort by" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="name">Name (A-Z)</SelectItem>
                            <SelectItem value="price_asc">Price (Low to High)</SelectItem>
                            <SelectItem value="price_desc">Price (High to Low)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="hidden md:block ml-auto text-sm text-muted-foreground">
                    Showing {filteredServices.length} items
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin text-foreground" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredServices.map((service) => (
                        <Card key={service.id} className="group hover:border-primary transition-all duration-300 hover:shadow-lg hover:shadow-zinc-200/50 cursor-default relative overflow-hidden bg-card border-border">
                            {service.imageUrl && (
                                <div
                                    className="absolute inset-0 z-0 opacity-40 mix-blend-overlay group-hover:scale-105 transition-transform duration-700"
                                    style={{ backgroundImage: `url(${UPLOADS_BASE_URL}${service.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                                />
                            )}
                            <div className="absolute top-0 right-0 p-4 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex gap-2 z-20">
                                <Button size="icon" variant="secondary" className="h-8 w-8 bg-muted hover:bg-accent text-foreground" onClick={() => handleEdit(service)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => handleDelete(service.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>

                            <CardContent className="p-6 flex flex-col h-full gap-4 pt-8 relative z-10 drop-shadow-sm">
                                <div className="p-3 w-12 h-12 bg-muted/80 backdrop-blur rounded-xl text-foreground flex items-center justify-center border border-border">
                                    <Scissors className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-lg leading-tight text-foreground group-hover:underline decoration-2 underline-offset-4 drop-shadow">{service.name}</h3>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="secondary" className="text-[10px] font-bold bg-muted/80 backdrop-blur text-muted-foreground">Service</Badge>
                                        <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground border-border bg-background/50 backdrop-blur">ID: {service.id}</Badge>
                                    </div>
                                    <div className="flex items-center gap-1 mt-1">
                                        <Users className="w-3 h-3 text-muted-foreground" />
                                        <span className="text-[10px] text-muted-foreground">{getBarberNames(service)}</span>
                                    </div>
                                </div>
                                <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                                    <span className="text-sm text-foreground/80 font-medium font-bold drop-shadow">Price</span>
                                    <span className="text-xl font-black font-mono text-foreground drop-shadow">IDR {service.price.toLocaleString('id-ID')}</span>
                                </div>
                                <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground font-medium">Commission</span>
                                    <span className="font-mono font-bold text-foreground bg-background px-2 py-1 rounded">
                                        {service.commissionType === 'percentage'
                                            ? `${service.commissionValue}%`
                                            : `IDR ${service.commissionValue.toLocaleString('id-ID')}`
                                        }
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
