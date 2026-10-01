import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KeyRound, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface UserOption {
    id: number;
    name: string;
    username: string;
    role: string;
}

export default function ChangePasswordPage() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<UserOption[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data: UserOption[] = await res.json();
                setUsers(data);
                // Default ke diri sendiri
                if (currentUser) {
                    setSelectedUserId(String(currentUser.id));
                }
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    };

    const isOwnAccount = selectedUserId === String(currentUser?.id);

    const resetForm = () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
    };

    const handleUserChange = (val: string) => {
        setSelectedUserId(val);
        setMessage(null);
        resetForm();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Konfirmasi password tidak cocok' });
            return;
        }

        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password baru minimal 6 karakter' });
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');

            let res: Response;
            if (isOwnAccount) {
                // Ganti password sendiri — butuh password lama
                res = await fetch(`${API_BASE_URL}/auth/change-password`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ currentPassword, newPassword })
                });
            } else {
                // Reset password user lain — owner bypass, no current password needed
                res = await fetch(`${API_BASE_URL}/users/${selectedUserId}/password`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ newPassword })
                });
            }

            const data = await res.json();
            if (!res.ok) {
                setMessage({ type: 'error', text: data.error || 'Gagal mengubah password' });
                return;
            }

            setMessage({ type: 'success', text: 'Password berhasil diubah' });
            resetForm();
        } catch {
            setMessage({ type: 'error', text: 'Terjadi kesalahan, coba lagi' });
        } finally {
            setLoading(false);
        }
    };

    const selectedUser = users.find(u => String(u.id) === selectedUserId);

    return (
        <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Ganti Password</h1>
                <p className="text-muted-foreground">Ubah password akun Anda atau akun barber.</p>
            </div>

            <Card className="max-w-md border-border shadow-sm bg-card">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <KeyRound className="w-6 h-6 text-muted-foreground" />
                        <div>
                            <CardTitle>Ganti Password</CardTitle>
                            <CardDescription>Pilih user yang ingin diganti passwordnya</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>User</Label>
                            <Select value={selectedUserId} onValueChange={handleUserChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih user..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.map(u => (
                                        <SelectItem key={u.id} value={String(u.id)}>
                                            {u.name} ({u.username}){u.id === Number(currentUser?.id) ? ' — Saya' : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {isOwnAccount && (
                            <div className="space-y-2">
                                <Label htmlFor="currentPassword">Password Saat Ini</Label>
                                <Input
                                    id="currentPassword"
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required
                                />
                            </div>
                        )}

                        {!isOwnAccount && selectedUser && (
                            <p className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded-md">
                                Reset password untuk <strong>{selectedUser.name}</strong>. Password lama tidak diperlukan.
                            </p>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="newPassword">Password Baru</Label>
                            <Input
                                id="newPassword"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        {message && (
                            <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                {message.text}
                            </p>
                        )}

                        <Button type="submit" className="w-full" disabled={loading || !selectedUserId}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Ganti Password
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
