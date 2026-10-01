import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const res = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phone, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Login failed');
                return;
            }

            login(data.token, data.user);

            if (data.user.role === 'owner') {
                navigate('/dashboard');
            } else if (data.user.role === 'staff') {
                navigate('/barber');
            } else {
                navigate('/pos');
            }
        } catch (err) {
            console.error(err);
            setError('Something went wrong. Please try again.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background selection:bg-accent">
            <Card className="w-full max-w-md border-border shadow-xl shadow-zinc-200/50 bg-card">
                <CardHeader>
                    <div className="flex justify-center mb-6">
                        <img
                            src="/logo_kefas.PNG"
                            alt="Kefas Barbershop"
                            className="w-24 h-24 rounded-full object-cover shadow-sm border border-border hover:scale-105 transition-all duration-500"
                        />
                    </div>
                    <CardTitle className="text-2xl text-center text-foreground tracking-tight uppercase font-black">
                        Kefas <span className="font-light">Barbershop</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="phone" className="text-foreground font-bold uppercase text-xs tracking-wider">Nomor WhatsApp</Label>
                            <Input
                                id="phone"
                                type="tel"
                                value={phone}
                                onChange={(e: any) => setPhone(e.target.value)}
                                placeholder="Contoh: 08123456789"
                                className="bg-background border-border focus:ring-ring focus:border-primary"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-foreground font-bold uppercase text-xs tracking-wider">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e: any) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                className="bg-background border-border focus:ring-ring focus:border-primary"
                                required
                            />
                        </div>
                        {error && <p className="text-red-600 text-sm font-medium bg-red-50 p-2 rounded border border-red-100">{error}</p>}
                        <Button type="submit" className="w-full bg-primary hover:bg-secondary text-primary-foreground font-bold tracking-wide h-11">
                            Sign In
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="justify-center text-xs text-muted-foreground uppercase tracking-widest">
                    Management System
                </CardFooter>
            </Card>
        </div>
    );
}
