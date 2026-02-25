import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Plus, Filter } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useToastStore } from '@/store/toast';
import { Card, CardContent } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeleton } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Trash2 } from 'lucide-react';

const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('az-AZ', {
        style: 'currency',
        currency: 'AZN',
        maximumFractionDigits: 0,
    }).format(amount);
};

export function Expenses() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const addToast = useToastStore((state) => state.addToast);

    // Filter states from URL
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const month = parseInt(searchParams.get('month') || String(currentMonth), 10);
    const year = parseInt(searchParams.get('year') || String(currentYear), 10);
    const categoryFilter = searchParams.get('category') || '';

    const handleFilterChange = (key: string, value: string) => {
        const newParams = new URLSearchParams(searchParams);
        if (value) {
            newParams.set(key, value);
        } else {
            newParams.delete(key);
        }
        setSearchParams(newParams);
    };

    // Main fetch
    const { data: expensesData, isLoading, isError, refetch } = useQuery({
        queryKey: ['expenses', month, year, categoryFilter],
        queryFn: async () => {
            const dateFrom = new Date(year, month - 1, 1).toISOString();
            const dateTo = new Date(year, month, 0, 23, 59, 59).toISOString();

            const params = new URLSearchParams({
                dateFrom,
                dateTo,
                limit: '1000'
            });
            if (categoryFilter) params.append('category', categoryFilter);

            const res = await api.get(`/expenses?${params.toString()}`);
            return res.data;
        },
    });

    const expenses = Array.isArray(expensesData?.data) ? expensesData.data : (expensesData?.data?.data || []);
    const totalAmount = expensesData?.meta?.totalAmount || expensesData?.data?.meta?.totalAmount || 0;

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [formAmount, setFormAmount] = useState('');
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
    const [formCategory, setFormCategory] = useState('Kommunal');
    const [formDescription, setFormDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Delete confirm state
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const categories = ['Kommunal', 'Təmir', 'Əmək haqqı', 'Vergi', 'Təmizlik', 'Digər'];

    const addExpenseMutation = useMutation({
        mutationFn: async (payload: any) => {
            const res = await api.post('/expenses', payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            addToast({ message: 'Xərc uğurla əlavə edildi', type: 'success' });
            setIsModalOpen(false);
            // Reset
            setFormAmount('');
            setFormDescription('');
        },
        onError: (err: any) => {
            addToast({ message: err.response?.data?.error || 'Xəta baş verdi', type: 'error' });
        },
        onSettled: () => setIsSubmitting(false)
    });

    const handleAddExpense = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        addExpenseMutation.mutate({
            amount: Number(formAmount),
            date: formDate,
            category: formCategory,
            description: formDescription,
        });
    };

    const handleDeleteExpense = async () => {
        if (!deleteId) return;
        setIsDeleting(true);
        try {
            await api.delete(`/expenses/${deleteId}`);
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            addToast({ message: 'Xərc silindi', type: 'success' });
            setDeleteId(null);
        } catch (err: any) {
            addToast({ message: err.response?.data?.error || 'Xəta baş verdi', type: 'error' });
        } finally {
            setIsDeleting(false);
        }
    };

    const monthsList = [
        'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
        'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
    ];

    if (user?.role !== 'OWNER') {
        return (
            <div className="flex-1 flex justify-center items-center p-6 pb-24 text-red font-bold">
                İcazəniz yoxdur. Ancaq OWNER xərcləri görə bilər.
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-6 p-6 max-w-7xl mx-auto pb-24">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-extrabold font-heading text-text flex items-center gap-2">
                    <ArrowUpRight className="w-8 h-8 text-red" />
                    Məxaric
                </h1>
                <Button onClick={() => setIsModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Xərc Əlavə Et
                </Button>
            </div>

            {/* Filters */}
            <Card variant="elevated">
                <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-48">
                        <Select
                            label="Ay"
                            value={month}
                            onChange={(e) => handleFilterChange('month', e.target.value)}
                            options={monthsList.map((m, i) => ({ label: m, value: i + 1 }))}
                        />
                    </div>
                    <div className="w-full sm:w-48">
                        <Select
                            label="İl"
                            value={year}
                            onChange={(e) => handleFilterChange('year', e.target.value)}
                            options={Array.from({ length: 5 }, (_, i) => ({
                                label: String(currentYear - i),
                                value: currentYear - i
                            }))}
                        />
                    </div>
                    <div className="w-full sm:w-48">
                        <Select
                            label="Kateqoriya"
                            value={categoryFilter}
                            onChange={(e) => handleFilterChange('category', e.target.value)}
                            options={[
                                { label: 'Bütün Kateqoriyalar', value: '' },
                                ...categories.map(c => ({ label: c, value: c }))
                            ]}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card variant="default">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-4"><TableSkeleton rows={10} columns={5} /></div>
                    ) : isError ? (
                        <div className="text-center py-12 text-red">
                            <p>Məlumatları yükləmək mümkün olmadı.</p>
                            <Button variant="outline" onClick={() => refetch()} className="mt-4">Yenidən cəhd et</Button>
                        </div>
                    ) : expenses.length === 0 ? (
                        <div className="text-center py-16 text-muted">
                            <Filter className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>Bu dövr üçün xərc tapılmadı.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tarix</TableHead>
                                    <TableHead>Kateqoriya</TableHead>
                                    <TableHead>Açıqlama</TableHead>
                                    <TableHead>Əlavə edən</TableHead>
                                    <TableHead className="text-right">Məbləğ</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expenses.map((expense: any) => (
                                    <TableRow key={expense.id} className="hover:bg-surface transition-colors">
                                        <TableCell>{new Date(expense.date).toLocaleDateString('az-AZ')}</TableCell>
                                        <TableCell>
                                            <span className="px-2 py-1 flex items-center w-fit justify-center rounded text-xs tracking-wider font-medium bg-red/10 text-red border border-red/20">
                                                {expense.category}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-sm text-text max-w-[200px] truncate">{expense.description || '-'}</TableCell>
                                        <TableCell className="text-sm text-muted">{expense.createdByUser?.name || 'Sistem'}</TableCell>
                                        <TableCell className="text-right font-bold text-red">
                                            -{formatMoney(expense.amount)}
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDeleteId(expense.id); }}>
                                                <Trash2 className="w-4 h-4 text-red/60 hover:text-red" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {/* Total Row */}
                                <TableRow className="bg-surface/50">
                                    <TableCell colSpan={5} className="text-right font-bold text-text">
                                        Yekun Xərc (Cari Dövr):
                                    </TableCell>
                                    <TableCell className="text-right font-extrabold text-red text-lg">
                                        -{formatMoney(totalAmount)}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Add Expense Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Yeni Xərc Əlavə Et">
                <form onSubmit={handleAddExpense} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Məbləğ (₼)"
                            type="number"
                            step="0.01"
                            required
                            value={formAmount}
                            onChange={(e) => setFormAmount(e.target.value)}
                        />
                        <Input
                            label="Tarix"
                            type="date"
                            required
                            value={formDate}
                            onChange={(e) => setFormDate(e.target.value)}
                        />
                    </div>

                    <Select
                        label="Kateqoriya"
                        required
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        options={categories.map(c => ({ label: c, value: c }))}
                    />

                    <Input
                        label="Açıqlama (İxtiyari)"
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                    />

                    <div className="flex gap-4 pt-4 mt-6 border-t border-border">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>Ləğv et</Button>
                        <Button type="submit" variant="danger" className="flex-1" disabled={isSubmitting || !formAmount}>
                            {isSubmitting ? 'Əlavə edilir...' : 'Təsdiqlə'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirm */}
            <ConfirmDialog
                isOpen={!!deleteId}
                title="Xərci Sil"
                message="Bu xərc qeydini silmək istədiyinizdən əminsinizmi? Bu əməliyyat geri alına bilməz."
                confirmLabel="Bəli, Sil"
                onConfirm={handleDeleteExpense}
                onCancel={() => setDeleteId(null)}
                isLoading={isDeleting}
            />
        </div>
    );
}
