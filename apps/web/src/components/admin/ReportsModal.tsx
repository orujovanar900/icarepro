import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { FileText, Download, X, Calendar as CalendarIcon, FileSpreadsheet } from 'lucide-react';
import { api } from '@/lib/api';
import { useToastStore } from '@/store/toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ReportsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const REPORT_TYPES = [
    { value: 'organizations', label: 'Təşkilatlar' },
    { value: 'revenue', label: 'Gəlir (MRR)' },
    { value: 'listings', label: 'Elanlar' },
    { value: 'queue', label: 'Növbə Aktivliyi' },
    { value: 'churn', label: 'Churn (Dayandırılanlar)' },
    { value: 'growth', label: 'Qeydiyyat Böyüməsi' },
    { value: 'billing', label: 'Billing Tarixçəsi' },
];

export function ReportsModal({ isOpen, onClose }: ReportsModalProps) {
    const [reportType, setReportType] = useState('organizations');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [organizationId, setOrganizationId] = useState('');
    const [orgsList, setOrgsList] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const addToast = useToastStore(s => s.addToast);

    // Fetch orgs list for the dropdown
    useEffect(() => {
        if (isOpen && (reportType === 'organizations' || reportType === 'churn' || reportType === 'billing')) {
            if (orgsList.length === 0) {
                api.get('/admin/users').then((res) => {
                    setOrgsList(res.data.data || []);
                }).catch(() => {});
            }
        }
    }, [isOpen, reportType, orgsList.length]);

    const setQuickDate = (mode: string) => {
        const now = new Date();
        const endStr = now.toISOString().split('T')[0] ?? '';
        setDateTo(endStr);
        
        let start = new Date();
        if (mode === 'month') {
            start.setDate(1);
        } else if (mode === '3months') {
            start.setMonth(now.getMonth() - 3);
        } else if (mode === '6months') {
            start.setMonth(now.getMonth() - 6);
        } else if (mode === 'year') {
            start.setFullYear(now.getFullYear(), 0, 1);
        }
        setDateFrom(start.toISOString().split('T')[0] ?? '');
    };

    const handleExport = async (format: 'pdf' | 'excel') => {
        setIsLoading(true);
        try {
            const payload: any = {
                reportType,
                format: 'json'
            };
            if (dateFrom) payload.dateFrom = dateFrom;
            if (dateTo) payload.dateTo = dateTo;
            if (organizationId && organizationId !== 'ALL' && (reportType === 'organizations' || reportType === 'churn' || reportType === 'billing')) {
                payload.organizationId = organizationId;
            }

            const res = await api.post('/admin/reports/export', payload);
            const data = res.data?.data;

            if (!data || data.length === 0 || Object.keys(data).length === 0) {
                addToast({ message: 'Bu period üçün məlumat tapılmadı', type: 'info' });
                setIsLoading(false);
                return;
            }

            const label = REPORT_TYPES.find(r => r.value === reportType)?.label || 'Hesabat';
            const filename = `icarepro-${reportType}-${dateFrom || 'all'}-${dateTo || 'all'}`;

            if (format === 'excel') {
                exportToExcel(data, filename, label, reportType);
            } else {
                exportToPDF(data, filename, label);
            }

            addToast({ message: 'Hesabat uğurla yükləndi', type: 'success' });
            onClose();
        } catch (error) {
            console.error(error);
            addToast({ message: 'Səhv baş verdi', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const formatDataForTable = (data: any, reportType: string) => {
        if (reportType === 'organizations' || reportType === 'churn') {
            return {
                head: [['#', 'Təşkilatın adı', 'Plan', 'Status', 'Bitmə tarixi', 'Obyekt sayı', 'Müqavilə sayı']],
                body: data.map((d: any, i: number) => [
                    i + 1,
                    d.name || '-',
                    d.subscriptionPlan || d.plan || '-',
                    d.subscriptionStatus || d.status || '-',
                    d.planExpiresAt ? new Date(d.planExpiresAt).toLocaleDateString() : '-',
                    d.propertiesCount ?? '-',
                    d.contractsCount ?? '-'
                ])
            };
        }
        if (reportType === 'revenue') {
             return {
                head: [['Ay', 'Aktiv Təşkilat', 'Təxmini MRR', 'Yeni Təşkilatlar', 'Dayandırılanlar']],
                body: data.map((d: any) => [
                    d.month,
                    d.activeOrgs,
                    `${d.estimatedMRR} ₼`,
                    d.newOrgs,
                    d.churnedOrgs
                ])
            };
        }
        if (reportType === 'growth') {
            return {
               head: [['Ay', 'Aylıq qeydiyyat', 'Kumulyativ cəmi']],
               body: data.map((d: any) => [
                   d.month,
                   d.count,
                   d.cumulative
               ])
           };
        }
        if (reportType === 'billing') {
            return {
                head: [['Təşkilatın adı', 'Əvvəlki plan', 'Yeni plan', 'Əvvəlki status', 'Yeni status', 'Dəyişmə tarixi', 'Bitmə tarixi', 'Kim dəyişdi', 'Qeyd']],
                body: data.map((d: any) => [
                    d.orgName || '-',
                    d.previousPlan || '-',
                    d.newPlan || '-',
                    d.previousStatus || '-',
                    d.newStatus || '-',
                    d.changedAt ? new Date(d.changedAt).toLocaleString() : '-',
                    d.expiresAt ? new Date(d.expiresAt).toLocaleDateString() : '-',
                    d.changedBy || 'System',
                    d.note || '-'
                ])
            };
        }
        // Generic fallback for objects/arrays
        let rows = Array.isArray(data) ? data : [data];
        if (reportType === 'listings' && data.topListingsByQueue) {
            rows = data.topListingsByQueue;
        } else if (reportType === 'queue' && data.topListings) {
            rows = data.topListings;
        }

        if (rows.length === 0) return { head: [['Boş']], body: [['Məlumat yoxdur']] };

        const head = [Object.keys(rows[0])];
        const body = rows.map((r: any) => Object.values(r).map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)));
        return { head, body };
    };

    const exportToExcel = (data: any, fileName: string, label: string, reportType: string) => {
        const { head, body } = formatDataForTable(data, reportType);
        const ws = XLSX.utils.aoa_to_sheet([...head, ...body]);
        
        // Auto sizing columns
        const colWidths = (head[0] || []).map((_: any, colIndex: number) => {
            return [...head, ...body].reduce((max: number, row: any) => Math.max(max, (row[colIndex]?.toString().length || 0) + 2), 10);
        });
        ws['!cols'] = colWidths.map((w: number) => ({ wch: w }));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, label?.substring(0, 31) ?? 'Hesabat'); // Max 31 chars for sheet name
        XLSX.writeFile(wb, `${fileName}.xlsx`);
    };

    const exportToPDF = (data: any, fileName: string, label: string) => {
        const doc = new jsPDF() as any;
        
        // Ensure fonts are loaded if possible, otherwise ASCII fallback
        doc.setFontSize(18);
        doc.text(`icarePro - ${label.replace('ə', 'e').replace('ı', 'i').replace('ş', 's').replace('ç', 'c')}`, 14, 20);
        
        doc.setFontSize(11);
        doc.setTextColor(100);
        let subheader = `Tarix araligi: ${dateFrom || 'Evvel'} -> ${dateTo || 'Indi'}`;
        doc.text(subheader, 14, 28);
        doc.text(`Export tarixi: ${new Date().toLocaleString()}`, 14, 34);

        const { head, body } = formatDataForTable(data, reportType);

        doc.autoTable({
            startY: 40,
            head: head,
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [201, 168, 76] }, // Gold base
            styles: { fontSize: 9 },
        });

        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(9);
            doc.setTextColor(150);
            doc.text('icarepro.az', 14, doc.internal.pageSize.height - 10);
            doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
        }

        doc.save(`${fileName}.pdf`);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Sistem Hesabatları">
            <div className="space-y-6">
                
                {/* Row 1 - Hesabat növü */}
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text">Hesabat növü <span className="text-red">*</span></label>
                    <Select
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value)}
                        options={REPORT_TYPES}
                        className="w-full"
                    />
                </div>

                {/* Row 2 - Tarix */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-text block">Tarix aralığı</label>
                    <div className="flex items-center gap-2">
                        <Input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="flex-1"
                        />
                        <span className="text-muted text-sm">—</span>
                        <Input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="flex-1"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setQuickDate('month')} className="text-xs h-7 px-2">Bu ay</Button>
                        <Button variant="ghost" size="sm" onClick={() => setQuickDate('3months')} className="text-xs h-7 px-2">Son 3 ay</Button>
                        <Button variant="ghost" size="sm" onClick={() => setQuickDate('6months')} className="text-xs h-7 px-2">Son 6 ay</Button>
                        <Button variant="ghost" size="sm" onClick={() => setQuickDate('year')} className="text-xs h-7 px-2">Bu il</Button>
                        <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs h-7 px-2 text-red hover:bg-red/10">Təmizlə</Button>
                    </div>
                </div>

                {/* Row 3 - Təşkilat */}
                {(reportType === 'organizations' || reportType === 'churn' || reportType === 'billing') && (
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-text">Təşkilat</label>
                        <Select
                            value={organizationId}
                            onChange={(e) => setOrganizationId(e.target.value)}
                            options={[{ label: 'Bütün təşkilatlar', value: 'ALL' }, ...orgsList.map(o => ({ label: o.name, value: o.id }))]}
                            className="w-full"
                        />
                    </div>
                )}

                {/* Row 4 - Buttons */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-border mt-6">
                    <Button variant="ghost" onClick={onClose} disabled={isLoading}>
                        Ləğv et
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={() => handleExport('excel')} 
                        disabled={isLoading}
                        className="bg-green-600/10 text-green-500 hover:bg-green-600/20"
                    >
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Excel yüklə
                    </Button>
                    <Button 
                        onClick={() => handleExport('pdf')} 
                        disabled={isLoading}
                        className="bg-gold text-surface"
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        PDF yüklə
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
