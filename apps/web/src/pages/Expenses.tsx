import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Plus, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
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
    const [page, setPage] = useState(1);
    const limit = 20;

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
        queryKey: ['expenses', month, year, categoryFilter, page],
        queryFn: async () => {
            const dateFrom = new Date(year, month - 1, 1).toISOString();
            const dateTo = new Date(year, month, 0, 23, 59, 59).toISOString();

            const params = new URLSearchParams({
                dateFrom,
                dateTo,
                limit: String(limit),
                offset: String((page - 1) * limit)
            });
            if (categoryFilter) params.append('category', categoryFilter);

            const res = await api.get(`/expenses?${params.toString()}`);
            return res.data;
        },
    });

    const expenses = Array.isArray(expensesData?.data) ? expensesData.data : (expensesData?.data?.data || []);
    const totalAmount = expensesData?.meta?.totalAmount || expensesData?.data?.meta?.totalAmount || 0;
    const totalCount = expensesData?.meta?.total || expensesData?.data?.meta?.total || 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Report Modal State
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportStartDate, setReportStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);

    // Form State
    const [formAmount, setFormAmount] = useState('');
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
    const [formCategory, setFormCategory] = useState('Kommunal');
    const [formDescription, setFormDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Export state
    const [isExporting, setIsExporting] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailAddress, setEmailAddress] = useState(user?.email || '');

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

    const getReportPayload = () => {
        return {
            startDate: new Date(reportStartDate || '').toISOString(),
            endDate: new Date(new Date(reportEndDate || '').setHours(23, 59, 59)).toISOString(),
            category: categoryFilter || undefined,
        };
    };

    const handleExportExcel = async () => {
        setIsExporting(true);
        try {
            const res = await api.post('/hesabat/expenses', { ...getReportPayload(), format: 'excel' }, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'xercler_hesabati.xlsx');
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (error) {
            console.error("Export failed", error);
            addToast({ message: "Hesabat generasiyası xətası.", type: 'error' });
        } finally {
            setIsExporting(false);
            setIsReportModalOpen(false);
        }
    };

    const handleSendEmail = async () => {
        setIsExporting(true);
        try {
            await api.post('/hesabat/expenses/send-email', { ...getReportPayload(), email: emailAddress });
            addToast({ message: 'Hesabat email-ə göndərildi ✓', type: 'success' });
            setIsEmailModalOpen(false);
            setIsReportModalOpen(false);
        } catch (error) {
            console.error('Email send failed', error);
            addToast({ message: 'Email göndərilmədi. Yenidən cəhd edin.', type: 'error' });
        } finally {
            setIsExporting(false);
        }
    };

    const handlePrintPDF = async () => {
        setIsExporting(true);
        try {
            const res = await api.post('/hesabat/expenses', { ...getReportPayload(), format: 'pdf' }, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'xercler_hesabati.pdf');
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (error) {
            console.error("PDF generation failed", error);
            addToast({ message: "PDF generasiyası xətası.", type: 'error' });
        } finally {
            setIsExporting(false);
            setIsReportModalOpen(false);
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
                <div className="flex gap-2">
                    <Button onClick={() => setIsReportModalOpen(true)} className="bg-gold border-gold text-black hover:bg-gold2">
                        📊 Hesabat
                    </Button>
                    <Button onClick={() => setIsModalOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Əlavə Et
                    </Button>
                </div>
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
                        <>
                            <div className="hidden md:block overflow-x-auto">
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
                            </div>

                            {/* Mobile Card List View */}
                            <div className="md:hidden flex flex-col divide-y divide-border">
                                {expenses.map((expense: any) => (
                                    <div key={`mob-${expense.id}`} className="p-4 hover:bg-surface transition-colors flex items-center justify-between">
                                        <div className="flex-1 min-w-0 pr-2">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 bg-red/10 text-red border border-red/20">
                                                        {expense.category}
                                                    </span>
                                                    <span className="text-xs text-muted truncate">{new Date(expense.date).toLocaleDateString('az-AZ')}</span>
                                                </div>
                                                <span className="font-bold text-red shrink-0 ml-2">-{formatMoney(expense.amount)}</span>
                                            </div>
                                            <div className="text-sm font-medium text-text truncate mb-1">{expense.description || '-'}</div>
                                            <div className="text-xs text-muted truncate flex justify-between">
                                                <span>Əlavə edən: {expense.createdByUser?.name || 'Sistem'}</span>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" className="shrink-0 h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); setDeleteId(expense.id); }}>
                                            <Trash2 className="w-4 h-4 text-red/60 hover:text-red" />
                                        </Button>
                                    </div>
                                ))}
                                {/* Total Mobile Row */}
                                <div className="p-4 bg-surface/30 flex justify-between items-center">
                                    <span className="font-bold text-text">Yekun:</span>
                                    <span className="font-extrabold text-red text-lg">-{formatMoney(totalAmount)}</span>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-4">
                    <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                        <ChevronLeft className="w-4 h-4 mr-1" /> Əvvəlki
                    </Button>
                    <span className="text-sm text-muted">Səhifə {page} / {totalPages}</span>
                    <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                        Sonrakı <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            )}

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

            {/* Expenses Report Modal */}
            <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title="Xərclər Hesabatı Yarat">
                <div className="space-y-4">
                    <p className="text-sm text-muted">Xərclər hesabatını generə etmək üçün tarix aralığını seçin (hazırkı kateqoriya süzgəci nəzərə alınacaq).</p>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <Input
                            label="Başlanğıc tarixi"
                            type="date"
                            value={reportStartDate}
                            onChange={(e) => setReportStartDate(e.target.value)}
                        />
                        <Input
                            label="Bitmə tarixi"
                            type="date"
                            value={reportEndDate}
                            onChange={(e) => setReportEndDate(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-2 pt-4 border-t border-border mt-6">
                        <div className="flex gap-4">
                            <Button variant="outline" className="flex-1" onClick={handleExportExcel} disabled={isExporting}>
                                {isExporting ? 'Yüklənir...' : 'Excel Yüklə'}
                            </Button>
                            <Button className="flex-1 bg-gold hover:bg-gold2 text-black" onClick={handlePrintPDF} disabled={isExporting}>
                                {isExporting ? 'Hazırlanır...' : 'PDF Yüklə'}
                            </Button>
                        </div>
                        <Button
                            className="w-full bg-blue border-blue/50 text-white"
                            onClick={() => setIsEmailModalOpen(true)}
                            disabled={isExporting}
                        >
                            MAIL-a göndər
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isEmailModalOpen} onClose={() => setIsEmailModalOpen(false)} title="Hesabatı E-poçta Göndər">
                <div className="space-y-4">
                    <Input
                        label="E-poçt ünvanı"
                        type="email"
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                    />
                    <div className="flex gap-4">
                        <Button variant="outline" className="flex-1" onClick={() => setIsEmailModalOpen(false)}>Ləğv et</Button>
                        <Button className="flex-1" onClick={handleSendEmail} disabled={isExporting || !emailAddress}>
                            Göndər
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
