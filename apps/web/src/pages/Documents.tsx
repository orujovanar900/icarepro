import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Search, ChevronRight, ArrowLeft, Download, Trash2, Sparkles } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useToastStore } from '@/store/toast';
import { Card, CardContent } from '@/components/ui/Card';
import { TableSkeleton } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';


// Formatting helpers
const formatCurrency = (val: any) => val ? `₼ ${Number(val).toLocaleString('az-AZ')}` : '—';
const formatDate = (d: string) => new Date(d).toLocaleDateString('az-AZ');

export function Documents() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const addToast = useToastStore((state) => state.addToast);
    const navigate = useNavigate();

    const [searchParams, setSearchParams] = useSearchParams();
    const selectedContractId = searchParams.get('contractId');

    // Level 1 State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ACTIVE');
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch Contracts (Level 1)

    const { data: contractsData, isLoading: isContractsLoading } = useQuery({
        queryKey: ['contracts-with-docs', statusFilter],
        queryFn: async () => {
            const res = await api.get(`/contracts?status=${statusFilter}&include=documents`);
            return res.data;
        },
    });

    // Fetch Specific Contract Documents (Level 2)
    const { data: contractDocsData, isLoading: isDocsLoading } = useQuery({
        queryKey: ['contract-documents', selectedContractId],
        queryFn: async () => {
            // Note: will require backend /documents GET route implementation later
            const res = await api.get(`/documents?contractId=${selectedContractId}`);
            return res.data;
        },
        enabled: !!selectedContractId,
    });

    const deleteDocMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/documents/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contract-documents', selectedContractId] });
            queryClient.invalidateQueries({ queryKey: ['contracts-with-docs'] });
            addToast({ message: 'Sənəd silindi', type: 'success' });
            setDeleteId(null);
        },
        onError: () => {
            addToast({ message: 'Silinmə zamanı xəta baş verdi', type: 'error' });
        },
        onSettled: () => setIsDeleting(false)
    });

    const handleDelete = () => {
        if (deleteId) {
            setIsDeleting(true);
            deleteDocMutation.mutate(deleteId);
        }
    };

    const contracts = Array.isArray(contractsData?.data) ? contractsData.data : (contractsData?.data?.data || []);
    const documents = Array.isArray(contractDocsData?.data) ? contractDocsData.data : [];

    const filteredContracts = contracts.filter((c: any) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            c.number?.toLowerCase().includes(q) ||
            c.tenant?.fullName?.toLowerCase().includes(q) ||
            c.property?.name?.toLowerCase().includes(q)
        );
    });

    // Determine what to render based on URL state
    if (selectedContractId) {
        // Find contract info from the list if possible, or wait
        const contractInfo = contracts.find((c: any) => c.id === selectedContractId) || (contractDocsData as any)?.contractInfo;

        return (
            <div className="flex-1 space-y-6 p-6 max-w-7xl mx-auto pb-24">
                {/* Level 2: Documents for Contract */}
                <div className="flex items-center gap-3 text-sm text-muted mb-2">
                    <button onClick={() => setSearchParams({})} className="hover:text-text transition-colors flex items-center gap-1">
                        Sənədlər
                    </button>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-text font-medium">
                        {contractInfo ? `${contractInfo.number} (${contractInfo.tenant?.fullName})` : 'Yüklənir...'}
                    </span>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" onClick={() => setSearchParams({})}>
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <h1 className="text-3xl font-extrabold font-heading text-text flex items-center gap-2">
                            Müqavilə Sənədləri
                        </h1>
                    </div>
                </div>

                {contractInfo && (
                    <Card className="bg-surface border-border">
                        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <p className="text-muted text-xs uppercase font-semibold mb-1">İcarəçi</p>
                                <p className="font-medium text-text">{contractInfo.tenant?.fullName}</p>
                            </div>
                            <div>
                                <p className="text-muted text-xs uppercase font-semibold mb-1">Obyekt</p>
                                <p className="font-medium text-text">{contractInfo.property?.name}</p>
                            </div>
                            <div>
                                <p className="text-muted text-xs uppercase font-semibold mb-1">Məbləğ</p>
                                <p className="font-medium text-text">{formatCurrency(contractInfo.monthlyRent)}/ay</p>
                            </div>
                            <div>
                                <p className="text-muted text-xs uppercase font-semibold mb-1">Müddət</p>
                                <p className="font-medium text-text">{formatDate(contractInfo.startDate)} - {formatDate(contractInfo.endDate)}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {isDocsLoading ? (
                    <Card><CardContent className="p-4"><TableSkeleton rows={4} columns={3} /></CardContent></Card>
                ) : documents.length === 0 ? (
                    <Card className="border-dashed border-2 bg-transparent">
                        <CardContent className="p-16 text-center text-muted flex flex-col items-center">
                            <FileText className="w-12 h-12 opacity-20 mb-4" />
                            <h3 className="text-lg font-medium text-text mb-2">Bu müqavilə üçün sənəd yoxdur</h3>
                            <p className="max-w-sm mb-6">Siz AI Sənəd Ustası vasitəsilə akt, qəbz və bildirişlər yarada bilərsiniz.</p>
                            <Button
                                onClick={() => navigate(`/sanad-ustasi?contractId=${selectedContractId}`)}
                                className="bg-gold hover:bg-gold/90 text-[#080C14] font-bold"
                            >
                                İlk Sənədi Yarat
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        <div className="flex justify-end">
                            <Button
                                onClick={() => navigate(`/sanad-ustasi?contractId=${selectedContractId}`)}
                                className="bg-gold/10 text-gold border border-gold/30 hover:bg-gold/20 shadow-sm"
                            >
                                <Sparkles className="w-4 h-4 mr-2" />
                                ✦ Əlavə sənədi yarat
                            </Button>
                        </div>
                        <div className="grid gap-4">
                            {documents.map((doc: any) => (
                                <Card key={doc.id} className="hover:border-border transition-colors group">
                                    <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center shrink-0">
                                                <FileText className="w-5 h-5 text-muted" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-surface text-muted uppercase tracking-wide">
                                                        {doc.type}
                                                    </span>
                                                    <h3 className="font-medium text-text">{doc.title || `${doc.type} Sənədi`}</h3>
                                                </div>
                                                <p className="text-xs text-muted">
                                                    Yaradılıb: {new Date(doc.generatedAt || doc.createdAt).toLocaleString('az-AZ')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                            <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => {
                                                if (doc.filePath) window.open(doc.filePath, '_blank');
                                                else if (doc.content) {
                                                    const win = window.open('', '_blank');
                                                    win?.document.write(doc.content);
                                                    win?.document.close();
                                                    setTimeout(() => win?.print(), 500);
                                                } else {
                                                    addToast({ message: 'Sənəd faylı tapılmadı', type: 'error' });
                                                }
                                            }}>
                                                <Download className="w-4 h-4 mr-2" /> PDF Bax
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red hover:text-red hover:bg-red/10 h-9 w-9 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => setDeleteId(doc.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                <ConfirmDialog
                    isOpen={!!deleteId}
                    title="Sənədi Sil"
                    message="Bu sənədi silmək istədiyinizə əminsiniz? Bu əməliyyat geri alına bilməz."
                    confirmLabel="Bəli, Sil"
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteId(null)}
                    isLoading={isDeleting}
                />
            </div>
        );
    }

    // Level 1: List of Contracts
    return (
        <div className="flex-1 space-y-6 p-6 max-w-7xl mx-auto pb-24">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-extrabold font-heading text-text flex items-center gap-2">
                    <FileText className="w-8 h-8 text-gold" />
                    Sənədlər
                </h1>
                <div className="flex gap-4 items-center">
                    <Select
                        value={statusFilter}
                        onChange={(e: any) => setStatusFilter(e.target.value)}
                        options={[
                            { label: 'Aktiv Müqavilələr', value: 'ACTIVE' },
                            { label: 'Arxivlənmiş', value: 'ARCHIVED' },
                            { label: 'Qaralamalar', value: 'DRAFT' },
                        ]}
                        className="w-48 bg-surface border-border disabled:opacity-100 text-sm"
                    />
                    <Button onClick={() => navigate('/sanad-ustasi')} className="bg-gold/10 text-gold border border-gold/30 hover:bg-gold/20 shadow-sm whitespace-nowrap">
                        <Sparkles className="w-4 h-4 mr-2" />
                        ✦ Sənəd ustası ilə yarat
                    </Button>
                </div>
            </div>

            <Card className="bg-surface border-border p-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input
                        type="text"
                        placeholder="İcarəçi, müqavilə nömrəsi və ya obyekt axtarın..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent border-none text-sm text-text placeholder:text-muted focus:ring-0 pl-10 py-2.5 outline-none"
                    />
                </div>
            </Card>

            {isContractsLoading ? (
                <Card><CardContent className="p-4"><TableSkeleton rows={8} columns={4} /></CardContent></Card>
            ) : filteredContracts.length === 0 ? (
                <div className="text-center py-16 text-muted">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Müqavilə tapılmadı.</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {filteredContracts.map((contract: any) => (
                        <Card
                            key={contract.id}
                            className="hover:border-gold/30 hover:bg-surface/80 cursor-pointer transition-all border-border"
                            onClick={() => setSearchParams({ contractId: contract.id })}
                        >
                            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="bg-surface border border-border rounded-lg p-3 shrink-0">
                                        <FileText className="w-5 h-5 text-gold" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-text text-base">{contract.tenant?.fullName}</h3>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface border border-border text-muted">
                                                {contract.number}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted">{contract.property?.name}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t border-border sm:border-0 pt-3 sm:pt-0 mt-2 sm:mt-0">
                                    <div className="text-left sm:text-right">
                                        <p className="text-xs text-muted mb-0.5">Aylıq İcarə</p>
                                        <p className="font-medium text-text">{formatCurrency(contract.monthlyRent)}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-surface border border-border text-xs font-bold text-text" title="Sənəd sayı">
                                            {(contract.documents && contract.documents.length) || 0}
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-muted" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
