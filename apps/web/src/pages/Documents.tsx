import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Download, Filter } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useToastStore } from '@/store/toast';
import { Card, CardContent } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeleton } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';

export function Documents() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const addToast = useToastStore((state) => state.addToast);

    const [filterType, setFilterType] = useState('');
    const [filterContract, setFilterContract] = useState('');

    // Fetch documents
    const { data: documentsData, isLoading, isError, refetch } = useQuery({
        queryKey: ['documents', filterType, filterContract],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filterType) params.append('type', filterType);
            if (filterContract) params.append('contractId', filterContract);

            // Note: If backend endpoint /documents does not exist yet, this might 404.
            // But we implement the UI per requirements.
            const res = await api.get(`/documents?${params.toString()}`);
            return res.data;
        },
    });

    const documents = Array.isArray(documentsData?.data) ? documentsData.data : (documentsData?.data?.data || []);

    // Fetch active contracts for selectors
    const { data: contractsData } = useQuery({
        queryKey: ['active-contracts-short'],
        queryFn: async () => {
            const res = await api.get('/contracts?status=ACTIVE&limit=100');
            return res.data;
        }
    });
    const activeContracts = Array.isArray(contractsData?.data) ? contractsData.data : (contractsData?.data?.data || []);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formContractId, setFormContractId] = useState('');
    const [formDocType, setFormDocType] = useState('CONTRACT');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const documentTypes = [
        { label: 'Müqavilə (CONTRACT)', value: 'CONTRACT' },
        { label: 'Təhvil-təslim aktı (ACT)', value: 'ACT' },
        { label: 'Borc xəbərdarlığı (DEBT_NOTICE)', value: 'DEBT_NOTICE' },
        { label: 'Hesab-faktura (INVOICE)', value: 'INVOICE' },
        { label: 'Qəbz (RECEIPT)', value: 'RECEIPT' },
    ];

    const generateDocMutation = useMutation({
        mutationFn: async (payload: any) => {
            const res = await api.post('/documents/generate', payload);
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            addToast({ message: 'Sənəd uğurla yaradıldı', type: 'success' });
            setIsModalOpen(false);

            // Optionally auto-download or open
            if (data?.data?.filePath) {
                window.open(data.data.filePath, '_blank');
            }
        },
        onError: (err: any) => {
            addToast({ message: err.response?.data?.error || 'Xəta baş verdi. Sistem API-si mövcud olmaya bilər.', type: 'error' });
        },
        onSettled: () => setIsSubmitting(false)
    });

    const handleGenerate = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        generateDocMutation.mutate({
            contractId: formContractId,
            type: formDocType
        });
    };

    const canGenerate = user?.role === 'OWNER' || user?.role === 'STAFF';

    return (
        <div className="flex-1 space-y-6 p-6 max-w-7xl mx-auto pb-24">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-extrabold font-heading text-text flex items-center gap-2">
                    <FileText className="w-8 h-8 text-gold" />
                    Sənədlər
                </h1>
                {canGenerate && (
                    <Button onClick={() => setIsModalOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Sənəd Yarat
                    </Button>
                )}
            </div>

            <Card variant="elevated">
                <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-64">
                        <Select
                            label="Sənəd Növü"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            options={[
                                { label: 'Bütün növlər', value: '' },
                                ...documentTypes
                            ]}
                        />
                    </div>
                    <div className="w-full sm:w-64">
                        <Select
                            label="Müqavilə üzrə filtrlə"
                            value={filterContract}
                            onChange={(e) => setFilterContract(e.target.value)}
                            options={[
                                { label: 'Bütün müqavilələr', value: '' },
                                ...activeContracts.map((c: any) => ({
                                    label: `${c.number} - ${c.tenant.fullName}`,
                                    value: c.id
                                }))
                            ]}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card variant="default">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-4"><TableSkeleton rows={8} columns={4} /></div>
                    ) : isError ? (
                        <div className="text-center py-12 text-red">
                            <p>Məlumatları yükləmək mümkün olmadı və ya API mövcud deyil.</p>
                            <Button variant="outline" onClick={() => refetch()} className="mt-4">Yenidən cəhd et</Button>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="text-center py-16 text-muted">
                            <Filter className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>Sənəd tapılmadı.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Növ</TableHead>
                                    <TableHead>Müqavilə</TableHead>
                                    <TableHead>Yaradılma Tarixi</TableHead>
                                    <TableHead className="text-right">Əməliyyat</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {documents.map((doc: any) => (
                                    <TableRow key={doc.id} className="hover:bg-surface transition-colors">
                                        <TableCell>
                                            <span className="font-semibold text-text">{doc.type}</span>
                                        </TableCell>
                                        <TableCell className="text-sm text-text">
                                            {doc.contract?.number || 'Məchul'}
                                            <span className="text-muted ml-1">({doc.contract?.tenant?.fullName})</span>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted">
                                            {new Date(doc.generatedAt).toLocaleString('az-AZ')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => window.open(doc.filePath, '_blank')}
                                            >
                                                <Download className="w-4 h-4 text-gold mr-2" /> Endir
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Yeni Sənəd Yarat (Generasiya)">
                <form onSubmit={handleGenerate} className="space-y-4">
                    <Select
                        label="Müqavilə Seçin"
                        required
                        value={formContractId}
                        onChange={(e) => setFormContractId(e.target.value)}
                        options={[
                            { label: 'Seçin...', value: '' },
                            ...activeContracts.map((c: any) => ({
                                label: `${c.number} - ${c.tenant.fullName} (${c.property.name})`,
                                value: c.id
                            }))
                        ]}
                    />

                    <Select
                        label="Sənəd Növü"
                        required
                        value={formDocType}
                        onChange={(e) => setFormDocType(e.target.value)}
                        options={documentTypes}
                    />

                    <p className="text-xs text-muted mb-4 border-l-2 pl-2 border-gold/50">
                        Qeyd: Sənəd generasiya olunduqdan sonra avtomatik bulud yaddaşına (Supabase Storage) yüklənəcək.
                    </p>

                    <div className="flex gap-4 pt-4 mt-6 border-t border-border">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>Ləğv et</Button>
                        <Button type="submit" className="flex-1" disabled={isSubmitting || !formContractId}>
                            {isSubmitting ? 'Yaradılır...' : 'Generasiya Et'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
