import React, { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Download, Save, RefreshCw, Upload, FileText, CheckCircle2, Edit2, Printer } from 'lucide-react';
import { Document, Packer, Paragraph, AlignmentType } from "docx";
import { saveAs } from "file-saver";
import * as mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const SYSTEM = `Sən İcarə Pro-nun ekspert hüquqi köməkçisisən.
Azərbaycan qanunvericiliyini yaxşı bilirsən.

Vəzifən: İstifadəçi ilə söhbət edərək peşəkar icarə sənədi hazırlamaq.

QAYDALAR:
1. Sadəcə məlumat yazmırsan — hüquqi cəhətdən düzgün, peşəkar ifadələr işlədirsən
2. Lazım gəldikdə izah edirsən — məsələn depozit nə üçün vacibdir, hansı müddət daha etibarlıdır
3. Ağıllı təkliflər verirsən — məsələn "Adətən ticarət obyektləri üçün 1 illik müqavilə tövsiyə olunur"
4. Məbləği formatla: "1500" → "1.500 ₼"
5. Tarixi formatla: "yanvar 2026" → "01.01.2026"
6. Hər cavabda MÜTLƏq bu format:
   <msg>Mesajın</msg>
   <upd>{"sahə":"dəyər"}</upd>
   <chips>["Seçim 1","Seçim 2","Seçim 3"]</chips>

SAHƏLƏR: landlord, tenant, voen, phone, address, area, rent, deposit, paydate, period, utilities, extra

AĞILLI SUALLAR VƏ TƏKLİFLƏR:
- İcarəçi fiziki şəxsdirsə VÖEN istəmə
- Depozit soruşanda: "Adətən 1-2 aylıq icarə haqqı qədər depozit götürülür. Sizin üçün tövsiyə: X ₼"
- Müddət soruşanda: "Bu obyekt üçün minimum 6 ay tövsiyə olunur"
- Kommunal soruşanda: "Ticarət obyektlərində adətən icarəçi ödəyir"
- Bitdikdə sənədi qısa xülasə et

Hamısı bitdikdə: <upd>{"_done":true}</upd>

Əgər istifadəçi şablon yükləyibsə, həmin şablonu əsas götür, strukturunu qoru.`;

async function downloadWord(doc: any) {
    const document = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    text: "İCARƏ MÜQAVİLƏSİ",
                    alignment: AlignmentType.CENTER,
                    style: "Heading1"
                }),
                new Paragraph({
                    text: `Bakı şəhəri · ${new Date().getFullYear()}-ci il`,
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({ text: "" }),
                new Paragraph({ text: "TƏRƏFLƏR", style: "Heading2" }),
                new Paragraph({ text: `İcarəyə verən: ${doc.landlord || "___"}` }),
                new Paragraph({ text: `İcarəçi: ${doc.tenant || "___"}` }),
                new Paragraph({ text: `VÖEN: ${doc.voen || "—"}` }),
                new Paragraph({ text: `Əlaqə: ${doc.phone || "—"}` }),
                new Paragraph({ text: "" }),
                new Paragraph({ text: "OBYEKT", style: "Heading2" }),
                new Paragraph({ text: `Ünvan: ${doc.address || "___"}` }),
                new Paragraph({ text: `Sahə: ${doc.area ? doc.area + " m²" : "—"}` }),
                new Paragraph({ text: "" }),
                new Paragraph({ text: "MALİYYƏ", style: "Heading2" }),
                new Paragraph({ text: `Aylıq icarə: ${doc.rent ? "₼ " + doc.rent : "___"}` }),
                new Paragraph({ text: `Depozit: ${doc.deposit ? "₼ " + doc.deposit : "—"}` }),
                new Paragraph({ text: `Ödəniş tarixi: ${doc.paydate ? "Hər ayın " + doc.paydate + "-i" : "___"}` }),
                new Paragraph({ text: "" }),
                new Paragraph({ text: "MÜDDƏT", style: "Heading2" }),
                new Paragraph({ text: `İcarə müddəti: ${doc.period || "___"}` }),
                new Paragraph({ text: "" }),
                new Paragraph({ text: "ÜMUMİ MÜDDƏALAR", style: "Heading2" }),
                new Paragraph({ text: "1. İcarəçi obyekti müqavilədə göstərilən məqsəd üçün istifadə etməyi öhdəsinə götürür." }),
                new Paragraph({ text: `2. İcarə haqqı hər ayın ${doc.paydate || "___"}-dək ödənilməlidir.` }),
                new Paragraph({ text: `3. Kommunal xərclər ${doc.utilities || "___"} tərəfindən ödənilir.` }),
                new Paragraph({ text: "4. Müqavilə hər iki tərəfin razılığı ilə uzadıla bilər." }),
                ...(doc.extra ? [new Paragraph({ text: `5. ${doc.extra}` })] : []),
            ]
        }]
    });
    const blob = await Packer.toBlob(document);
    saveAs(blob, `Muqavile_${doc.tenant || "yeni"}.docx`);
}

const DOCS = [
    { id: "contract", icon: "📋", label: "Müqavilə", title: "İCARƏ MÜQAVİLƏSİ" },
    { id: "act", icon: "📦", label: "Qəbul-Təhvil", title: "QƏBUL-TƏHVİL AKTI" },
    { id: "notice", icon: "⚠️", label: "Borc Bildirişi", title: "BORC BİLDİRİŞİ" },
    { id: "receipt", icon: "🧾", label: "Qəbz", title: "ÖDƏNİŞ QƏBZİ" }
];

const splitIntoPages = (text: string) => {
    if (text.includes("===PAGE_BREAK===")) {
        return text.split("===PAGE_BREAK===").filter(page => page.trim().length > 0);
    }
    const charsPerPage = 3000;
    const pages = [];
    for (let i = 0; i < text.length; i += charsPerPage) {
        pages.push(text.slice(i, i + charsPerPage));
    }
    return pages;
};

interface Message {
    from: 'ai' | 'user';
    text: string;
    chips?: string[];
}

interface HistoryItem {
    role: 'user' | 'assistant';
    content: string;
}

export function SanadUstasi() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const contractId = searchParams.get('contractId');

    // Fetch contract details if contractId is present in URL
    const { data: contractDetails, isLoading: isContractLoading } = useQuery({
        queryKey: ['contract', contractId],
        queryFn: () => api.get(`/contracts/${contractId}`),
        enabled: !!contractId,
    });

    const { user } = useAuthStore();
    const [docType, setDocType] = useState("contract");
    const [msgs, setMsgs] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [hist, setHist] = useState<HistoryItem[]>([]);
    const [doc, setDoc] = useState<any>({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [done, setDone] = useState(false);
    const [userTemplate, setUserTemplate] = useState<string>("");
    const [useCustomTemplate, setUseCustomTemplate] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const bottomRef = useRef<HTMLDivElement>(null);
    const printAreaRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeDocType = DOCS.find(d => d.id === docType) || DOCS[0];

    // Initialize state when component mounts or contract data is loaded
    useEffect(() => {
        const savedTemplate = localStorage.getItem(`sanad_template_${user?.id}`);
        if (savedTemplate) {
            setUserTemplate(savedTemplate);
            setUseCustomTemplate(true);
            setMsgs([{
                from: "ai",
                text: "Son şablonunuz yüklüdür. Müqaviləni bu şablonla başlayaq yoxsa dəyişmək istəyirsiniz?",
                chips: ["Bəli, eyni şablonla", "Xeyr, yeni şablon yükləyim", "Şablonsuz davam edək"]
            }]);
            return;
        }

        let initialDoc: Record<string, any> = {};
        let initialMsg = `Salam! 👋 Mən **Sənəd Ustası**yam.\n\nYuxarıdan sənəd növünü seçin.\n\nBaşlayaq — **İcarəyə verənin adını** yazın:`;
        let initialChips = ["Fiziki şəxs", "Hüquqi şəxs"];

        if (contractId && contractDetails?.data) {
            const data = contractDetails.data;
            initialDoc = {
                contractId: data.id,
                landlord: data.organization?.name || "", // Assumes organization name is landlord
                tenant: data.tenant?.fullName || "",
                voen: data.tenant?.voen || "",
                phone: data.tenant?.phone || "",
                address: data.property?.address || "",
                area: data.property?.area || "",
                rent: data.monthlyRent || "",
                deposit: data.depositAmount || "",
                period: `${new Date(data.startDate).toLocaleDateString()} - ${new Date(data.endDate).toLocaleDateString()}`
            };
            initialMsg = `Müqavilə məlumatları yükləndi! 📝\n\nBu müqavilə üçün hansı sənədi hazırlayım?`;
            initialChips = ["Müqavilə", "Qəbul-Təhvil Aktı", "Borc Bildirişi", "Qəbz"];
        }

        setDoc(initialDoc);
        setMsgs([{ from: "ai", text: initialMsg, chips: initialChips }]);
        setHist([]);
        setDone(false);
    }, [contractId, isContractLoading, contractDetails, user?.id]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [msgs, loading]);

    const progressFields = ["landlord", "tenant", "address", "rent", "paydate", "period", "utilities"];
    const progressCount = progressFields.filter(k => doc[k]).length;
    const progressPercent = Math.round((progressCount / progressFields.length) * 100);

    function switchDocType(id: string) {
        const d = DOCS.find(x => x.id === id);
        if (!d) return;
        setDocType(id);

        let newMsg = `**${d.title}** hazırlayırıq.\nİcarəyə verənin adını yazın:`;
        let newChips = ["Fiziki şəxs", "Hüquqi şəxs"];
        if (contractId && contractDetails?.data) {
            newMsg = `**${d.title}** hazırlayırıq. Müqavilədən öncədən yüklənmiş məlumatları istifadə edirəm. Çatışmayan məlumatları davam edək. İcarə haqqı ödəniş tarixini qeyd edin (məs: hər ayın 5-i).`;
            newChips = ["Hər ayın 1-i", "Hər ayın 5-i", "Hər ayın 10-u"];
        }

        setMsgs([{ from: "ai", text: newMsg, chips: newChips }]);
        if (!contractId) {
            setDoc({});
            setHist([]);
            setDone(false);
        }
    }

    async function sendMessage(text?: string) {
        const messageText = text ?? input;
        if (!messageText.trim() || loading) return;
        setInput("");

        setMsgs(p => [...p, { from: "user", text: messageText }]);

        // Handle quick intercept options for Template state
        if (messageText === "Xeyr, yeni şablon yükləyim") {
            setUserTemplate("");
            setUseCustomTemplate(false);
            if (user?.id) localStorage.removeItem(`sanad_template_${user.id}`);
            if (fileInputRef.current) fileInputRef.current.click();
            return;
        } else if (messageText === "Şablonsuz davam edək" || messageText === "Bəli, eyni şablonla") {
            if (messageText === "Şablonsuz davam edək") {
                setUserTemplate("");
                setUseCustomTemplate(false);
                if (user?.id) localStorage.removeItem(`sanad_template_${user.id}`);
            }
            setMsgs(p => [...p, { from: "ai", text: "Əla! O zaman icarəyə verənin adını daxil edin:", chips: ["Fiziki şəxs", "Hüquqi şəxs"] }]);
            return;
        }

        const newHistory = [...hist, { role: "user" as const, content: messageText }];
        setHist(newHistory);
        setLoading(true);

        try {
            const apiKey = import.meta.env["VITE_ANTHROPIC_API_KEY"];
            if (!apiKey) {
                throw new Error("API key is missing");
            }

            let activeSystem = SYSTEM;
            if (userTemplate) {
                activeSystem += `\n\nİstifadəçinin öz şablonu:\n${userTemplate}\n\nBu şablonu əsas götür, strukturunu qoru, boş yerləri doldur.`;
            }

            const res = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey,
                    "anthropic-version": "2023-06-01",
                    "anthropic-dangerous-direct-browser-access": "true"
                },
                body: JSON.stringify({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 1000,
                    system: activeSystem + `\nSənəd Növü: ${activeDocType?.title || ""}\nMövcuD Məlumatlar: ${JSON.stringify(doc)}`,
                    messages: newHistory
                })
            });

            if (!res.ok) {
                const errData = await res.text();
                throw new Error(`API Error: ${res.status} ${errData}`);
            }

            const data = await res.json();
            const raw = data.content?.[0]?.text || "";

            const msgMatch = raw.match(/<msg>([\s\S]*?)<\/msg>/);
            const updMatch = raw.match(/<upd>([\s\S]*?)<\/upd>/);
            const chipsMatch = raw.match(/<chips>([\s\S]*?)<\/chips>/);

            const aiText = msgMatch ? msgMatch[1].trim() : raw.replace(/<upd>[\s\S]*?<\/upd>/g, '').replace(/<chips>[\s\S]*?<\/chips>/g, '');
            let upd = {};

            if (updMatch) {
                try {
                    upd = JSON.parse(updMatch[1]);
                } catch (e) {
                    console.error("Failed to parse AI update json", updMatch[1]);
                }
            }

            if ((upd as any)._done) {
                setDone(true);
            } else if (Object.keys(upd).length > 0) {
                setDoc((p: any) => ({ ...p, ...upd }));
            }

            let parsedChips: string[] = [];
            if (chipsMatch) {
                try {
                    parsedChips = JSON.parse(chipsMatch[1]);
                } catch (e) {
                    console.error("Failed to parse AI chips json", chipsMatch[1]);
                }
            }

            setMsgs(p => [...p, { from: "ai", text: aiText, chips: parsedChips }]);
            setHist(p => [...p, { role: "assistant", content: raw }]);

        } catch (e: any) {
            console.error("Chat error:", e);
            setMsgs(p => [...p, { from: "ai", text: `Xəta baş verdi: ${e.message}`, chips: [] }]);
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveDocument() {
        if (!doc.contractId) {
            alert("Müqavilə seçilməyib! Bu sənədi yadda saxlamaq üçün əvvəlcə onu bir müqaviləyə bağlamalısınız.");
            return;
        }

        setSaving(true);
        try {
            // Get raw HTML content without react wrappers for saving
            const content = printAreaRef.current?.innerHTML || "";

            await api.post('/documents/save', {
                contractId: doc.contractId,
                title: `${activeDocType?.label || 'Sənəd'} - ${doc.tenant || 'Sənəd'}`,
                type: docType.toUpperCase(),
                content: content
            });
            alert("Sənəd uğurla yadda saxlanıldı!");
            navigate(`/documents?contractId=${doc.contractId}`);
        } catch (error) {
            console.error("Failed to save doc", error);
            alert("Sənədi yadda saxlamaq mümkün olmadı.");
        } finally {
            setSaving(false);
        }
    }

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.name.endsWith('.doc') && !file.name.endsWith('.docx')) {
            alert(
                'Köhnə Word formatı (.doc) dəstəklənmir.\n' +
                'Zəhmət olmasa faylı Word-də açıb\n' +
                '"Farklı Kaydet" → ".docx" formatında saxlayın.'
            );
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        setLoading(true);
        let extractedText = "";

        try {
            if (file.type === "application/pdf") {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    const pageText = content.items.map((item: any) => item.str).join(" ");
                    extractedText += pageText + "\n===PAGE_BREAK===\n";
                }
            } else if (file.name.endsWith('.docx')) {
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                extractedText = result.value;
            } else {
                extractedText = await file.text();
            }

            setUserTemplate(extractedText);
            setUseCustomTemplate(true);
            if (user?.id) localStorage.setItem(`sanad_template_${user.id}`, extractedText);

            setMsgs([
                { from: "user", text: `📎 Şablon yükləndi: ${file.name}` },
                { from: "ai", text: "Şablonunuzu aldım! Hansı məlumatları doldurmaq lazımdır?", chips: ["Məlumatları daxil edək"] }
            ]);
            setDoc({});
            setHist([]);
            setDone(false);
        } catch (err) {
            console.error("File parse error", err);
            alert("Faylı oxumaq mümkün olmadı.");
        } finally {
            setLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

    const fallback = (v: any, p = "__________") => v || p;

    if (isContractLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#070B12] text-white">
                <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
                <span className="ml-3">Müqavilə yüklənir...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen font-sans bg-[#070B12] text-[#E8F0FE] overflow-hidden print-styles">
            {/* Top Navigation Bar (Not in print) */}
            <div className="no-print h-[60px] bg-[#0C1220] border-b border-[#192840] flex items-center px-6 gap-4 shrink-0 justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/documents')}
                        className="text-sm font-medium text-[#8899B0] hover:text-white transition-colors flex items-center gap-2"
                    >
                        ← Geri
                    </button>
                    <div className="w-px h-6 bg-[#192840]"></div>
                    <span className="text-xl font-extrabold text-[#C9A84C]">İcarə<span className="text-[#E8F0FE] font-light"> Pro</span></span>
                    <div className="flex items-center gap-1.5 bg-[#C9A84C]/10 border border-[#C9A84C]/20 rounded-full px-3 py-1 text-[10px] text-[#C9A84C] font-bold tracking-wide uppercase ml-2">
                        ✦ Sənəd Ustası Beta
                    </div>
                </div>

                <div className="flex gap-2 bg-[#131F30] p-1 rounded-lg border border-[#192840]">
                    {DOCS.map(d => (
                        <button
                            key={d.id}
                            onClick={() => switchDocType(d.id)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all flex items-center gap-2 ${docType === d.id
                                ? "bg-[#C9A84C]/15 border border-[#C9A84C]/40 text-[#C9A84C] shadow-sm"
                                : "border border-transparent text-[#8899B0] hover:text-white hover:bg-[#1A2840]"
                                }`}
                        >
                            <span className="text-sm">{d.icon}</span> {d.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".txt,.pdf,.docx,.doc"
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer border border-[#192840] text-white bg-[#1A2840] hover:bg-[#20324c] transition-colors"
                    >
                        {userTemplate ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Upload className="w-3.5 h-3.5" />}
                        {userTemplate ? "✓ Şablon yükləndi" : "📎 Şablon Yüklə"}
                    </button>

                    <button
                        onClick={() => {
                            setMsgs([{ from: "ai", text: "Yeni sənəd! İcarəyə verənin adını yazın:", chips: ["Fiziki şəxs", "Hüquqi şəxs"] }]);
                            setHist([]);
                            setDoc({});
                            setDone(false);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer border border-[#192840] text-[#8899B0] hover:text-white hover:bg-[#1A2840] transition-colors"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Sıfırla
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Left Panel: Chat (Not in print) */}
                <div className="no-print w-[420px] shrink-0 border-r border-[#192840] flex flex-col bg-[#0C1220]">
                    <div className="px-5 py-4 border-b border-[#192840] bg-[#131F30]">
                        <div className="flex items-center gap-2.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                            <b className="text-sm font-semibold tracking-wide text-white">AI Sənəd Ustası</b>
                        </div>
                        <div className="text-xs text-[#4A6080] mt-1.5 flex items-center gap-1.5">
                            {activeDocType?.title || "Sənəd"}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 custom-scrollbar">
                        {msgs.map((m, i) => (
                            <div key={i} className={`flex flex-col ${m.from === "user" ? "items-end" : "items-start"}`}>
                                <div className={`flex gap-3 max-w-[90%] ${m.from === "user" ? "flex-row-reverse" : "flex-row"} items-end`}>
                                    {m.from === "ai" && (
                                        <div className="w-8 h-8 rounded-lg bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center text-[#C9A84C] text-sm shrink-0 shadow-sm mb-1">
                                            ✦
                                        </div>
                                    )}
                                    <div className={`p-3.5 rounded-2xl text-[13px] leading-relaxed relative ${m.from === "ai"
                                        ? "bg-[#131F30] border border-[#192840] text-[#E8F0FE] rounded-bl-sm"
                                        : "bg-blue-500/10 border border-blue-500/20 text-blue-100 rounded-br-sm"
                                        }`}>
                                        {m.text.split("\n").map((line, j) => (
                                            <div key={j} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, "<b class='text-white font-semibold'>$1</b>") || "&nbsp;" }} />
                                        ))}
                                    </div>
                                </div>
                                {m.chips && m.chips.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2 ml-11">
                                        {m.chips.map((c, ci) => (
                                            <button
                                                key={ci}
                                                onClick={() => sendMessage(c)}
                                                className="px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border border-[#C9A84C]/30 bg-[#C9A84C]/10 text-[#C9A84C] hover:bg-[#C9A84C]/20 transition-colors"
                                            >
                                                {c}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {loading && (
                            <div className="flex gap-3 max-w-[90%] items-end">
                                <div className="w-8 h-8 rounded-lg bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center text-[#C9A84C] text-sm shrink-0 mb-1">
                                    ✦
                                </div>
                                <div className="px-4 py-3.5 bg-[#131F30] border border-[#192840] rounded-2xl rounded-bl-sm flex gap-1.5 items-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#4A6080] animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#4A6080] animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#4A6080] animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        )}

                        {done && (
                            <div className="text-center p-3 my-2 bg-[#10B981]/10 border border-[#10B981]/20 rounded-xl text-xs font-medium text-[#10B981] shadow-sm flex items-center justify-center gap-2">
                                ✅ Bütün məlumatlar toplanılıb. Sənəd hazırdır!
                            </div>
                        )}
                        <div ref={bottomRef} className="h-4" />
                    </div>

                    <div className="p-4 border-t border-[#192840] bg-[#0C1220]">
                        <div className="relative flex items-center">
                            <input
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && sendMessage()}
                                placeholder={done ? "Xülasə yaradıldı ✓" : "Bura yazın..."}
                                disabled={loading || done}
                                className="w-full bg-[#131F30] border border-[#192840] text-[#E8F0FE] rounded-xl pl-4 pr-12 py-3.5 text-[13px] placeholder:text-[#4A6080] focus:outline-none focus:border-[#C9A84C]/50 focus:ring-1 focus:ring-[#C9A84C]/50 transition-all disabled:opacity-50"
                            />
                            <button
                                onClick={() => sendMessage()}
                                disabled={loading || !input.trim() || done}
                                className="absolute right-2 w-8 h-8 rounded-lg bg-[#C9A84C] text-black disabled:bg-[#1C3050] disabled:text-[#4A6080] border-none cursor-pointer flex flex-col items-center justify-center transition-colors shadow-sm disabled:shadow-none p-0"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Document Preview */}
                <div className="flex-1 flex flex-col overflow-hidden bg-[#070B14]">
                    <div className="no-print px-6 py-3 border-b border-[#192840] bg-[#0C1220] flex items-center gap-6 shadow-sm z-10">
                        <span className="text-xs font-bold text-[#8899B0] uppercase tracking-wider">{activeDocType?.title || "Önizləmə"}</span>
                        <div className="flex-1" />

                        <div className="flex items-center gap-3">
                            <span className="text-[11px] font-medium text-[#4A6080]">{progressPercent}% Doldurulub</span>
                            <div className="w-24 h-1.5 bg-[#192840] rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-[#C9A84C] to-[#F0C96A] transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }} />
                            </div>
                        </div>

                        <div className="w-px h-6 bg-[#192840] mx-2"></div>

                        {done ? (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleSaveDocument}
                                    disabled={saving}
                                    className="px-4 py-2 rounded-lg text-xs font-bold bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 hover:bg-[#10B981]/20 transition-colors flex items-center gap-2"
                                >
                                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    {saving ? "Saxlanılır..." : "Sənədlərə Əlavə Et"}
                                </button>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => downloadWord(doc)}
                                        className="px-4 py-2 rounded-lg text-xs font-bold bg-[#2B579A] text-white hover:bg-[#1A365D] transition-colors shadow-sm flex items-center gap-2"
                                    >
                                        <FileText className="w-3.5 h-3.5" /> Word Yüklə
                                    </button>
                                    <button
                                        onClick={() => window.print()}
                                        className="px-4 py-2 rounded-lg text-xs font-bold bg-[#C9A84C] text-[#080C14] hover:bg-[#F0C96A] transition-colors shadow-sm flex items-center gap-2"
                                    >
                                        <Download className="w-3.5 h-3.5" /> PDF Yüklə
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <button
                                    disabled={progressPercent < 60}
                                    className="px-4 py-2 rounded-lg text-xs font-bold bg-[#1C3050] text-[#4A6080] cursor-not-allowed border-none flex items-center gap-2"
                                >
                                    <FileText className="w-3.5 h-3.5" /> Word Yüklə
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    disabled={progressPercent < 60}
                                    className="px-4 py-2 rounded-lg text-xs font-bold bg-[#1C3050] text-[#4A6080] cursor-not-allowed border-none flex items-center gap-2"
                                >
                                    <Download className="w-3.5 h-3.5" /> PDF Yüklə
                                </button>
                                <button
                                    onClick={() => setIsEditing(!isEditing)}
                                    className={`p-2 rounded-lg transition-colors shadow-sm flex items-center justify-center ${isEditing ? 'bg-[#10B981] text-white hover:bg-[#0e9f6e]' : 'bg-[#1A2840] text-[#8899B0] border border-[#192840] hover:text-white hover:bg-[#20324c]'}`}
                                    title={isEditing ? "Saxla" : "Düzəliş et"}
                                >
                                    {isEditing ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    className="p-2 rounded-lg bg-[#1A2840] text-[#8899B0] border border-[#192840] hover:text-white hover:bg-[#20324c] transition-colors shadow-sm flex items-center justify-center"
                                    title="Çap et"
                                >
                                    <Printer className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar flex flex-col items-center bg-[#070B14]">
                        <div id="document-preview" ref={printAreaRef} className="w-full flex flex-col items-center">
                            {useCustomTemplate ? (
                                splitIntoPages(userTemplate).map((pageContent, index) => (
                                    <div
                                        key={index}
                                        className={`print-content ${isEditing ? 'ring-2 ring-blue-500 rounded-md outline-none' : ''}`}
                                        contentEditable={isEditing}
                                        suppressContentEditableWarning={true}
                                        style={{
                                            background: 'white',
                                            width: '210mm',
                                            minHeight: '297mm',
                                            margin: '0 auto 24px auto',
                                            padding: '20mm',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                        }}
                                    >
                                        <pre className="whitespace-pre-wrap font-serif text-sm text-gray-800" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                            {pageContent}
                                        </pre>
                                    </div>
                                ))
                            ) : (
                                <div className={`print-content bg-white text-[#1a1a2e] w-full max-w-[700px] min-h-[900px] shadow-[0_8px_40px_rgba(0,0,0,0.5)] rounded-sm p-16 text-[13px] leading-relaxed relative print:shadow-none print:p-0 print:m-0 ${isEditing ? 'ring-2 ring-blue-500 outline-none' : ''}`} contentEditable={isEditing} suppressContentEditableWarning={true} style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[30deg] text-[100px] font-black tracking-widest text-[#C9A84C]/5 select-none pointer-events-none whitespace-nowrap z-0">
                                        İCARƏ PRO
                                    </div>

                                    <div className="relative z-10">
                                        <h1 className="text-lg font-bold text-center mb-1 text-black uppercase tracking-wider">{activeDocType?.title || "SƏNƏD"}</h1>
                                        <div className="text-center text-xs text-gray-500 mb-10 pb-4 border-b border-gray-200">
                                            Bakı şəhəri &nbsp;&nbsp;•&nbsp;&nbsp; {fallback(doc.date, "__________________")}
                                        </div>

                                        <div className="space-y-6">
                                            <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                                                <div>
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Tərəflər</div>
                                                    <div className="space-y-3 bg-gray-50/50 p-4 rounded border border-gray-100/50">
                                                        <div className="flex justify-between items-end border-b border-gray-100 pb-1">
                                                            <span className="text-gray-500 italic">İcarəyə verən:</span>
                                                            <span className={`font-semibold ${!doc.landlord ? 'text-gray-300' : 'text-black'}`}>{fallback(doc.landlord)}</span>
                                                        </div>
                                                        <div className="flex justify-between items-end border-b border-gray-100 pb-1">
                                                            <span className="text-gray-500 italic">İcarəçi:</span>
                                                            <span className={`font-semibold ${!doc.tenant ? 'text-gray-300' : 'text-black'}`}>{fallback(doc.tenant)}</span>
                                                        </div>
                                                        <div className="flex justify-between items-end border-b border-gray-100 pb-1">
                                                            <span className="text-gray-500 italic">VÖEN:</span>
                                                            <span className={`font-semibold ${!doc.voen ? 'text-gray-300' : 'text-black'}`}>{fallback(doc.voen, "(Tələb olunmur)")}</span>
                                                        </div>
                                                        <div className="flex justify-between items-end border-b border-gray-100 pb-1">
                                                            <span className="text-gray-500 italic">Əlaqə:</span>
                                                            <span className={`font-semibold ${!doc.phone ? 'text-gray-300' : 'text-black'}`}>{fallback(doc.phone, "(Daxil edilməyib)")}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Obyekt Və Maliyyə</div>
                                                    <div className="space-y-3 bg-gray-50/50 p-4 rounded border border-gray-100/50 h-full">
                                                        <div className="flex justify-between items-end border-b border-gray-100 pb-1">
                                                            <span className="text-gray-500 italic">Ünvan:</span>
                                                            <span className={`font-semibold text-right max-w-[150px] truncate ${!doc.address ? 'text-gray-300' : 'text-black'}`}>{fallback(doc.address)}</span>
                                                        </div>
                                                        <div className="flex justify-between items-end border-b border-gray-100 pb-1">
                                                            <span className="text-gray-500 italic">İcarə Haqqı:</span>
                                                            <span className={`font-semibold ${!doc.rent ? 'text-gray-300' : 'text-black'}`}>{doc.rent ? `₼ ${doc.rent}` : "__________"}</span>
                                                        </div>
                                                        <div className="flex justify-between items-end border-b border-gray-100 pb-1">
                                                            <span className="text-gray-500 italic">Depozit:</span>
                                                            <span className={`font-semibold ${!doc.deposit ? 'text-gray-300' : 'text-black'}`}>{doc.deposit ? `₼ ${doc.deposit}` : "(Yoxdur)"}</span>
                                                        </div>
                                                        <div className="flex justify-between items-end border-b border-gray-100 pb-1">
                                                            <span className="text-gray-500 italic">Ödəniş Tarixi:</span>
                                                            <span className={`font-semibold ${!doc.paydate ? 'text-gray-300' : 'text-black'}`}>{doc.paydate ? `Hər ayın ${doc.paydate}-i` : "__________"}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-8 pt-6 border-t border-gray-200">
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Ümumi Müddəalar</div>
                                                <div className="space-y-3 text-[12.5px] text-gray-800 text-justify">
                                                    <p><span className="font-bold mr-2 text-black">1.</span>İcarəçi obyekti (ünvanı: <span className="font-semibold">{fallback(doc.address, "__________")}</span>) müqavilədə göstərilən məqsəd üçün istifadə etməyi öhdəsinə götürür.</p>

                                                    <p><span className="font-bold mr-2 text-black">2.</span>İcarə haqqı olan <span className="font-semibold">₼ {fallback(doc.rent, "___")}</span> hər ayın <span className="font-semibold">{fallback(doc.paydate, "___")}</span> tarixinədək ödənilməlidir.</p>

                                                    <p><span className="font-bold mr-2 text-black">3.</span>Müqavilənin müddəti: <span className="font-semibold">{fallback(doc.period, "__________________")}</span> olaraq müəyyən edilir.</p>

                                                    <p><span className="font-bold mr-2 text-black">4.</span>Kommunal xərclər (işıq, su, qaz) <span className="font-semibold">{fallback(doc.utilities, "__________________")}</span> tərəfindən ödənilir.</p>

                                                    <p><span className="font-bold mr-2 text-black">5.</span>Müqaviləyə xitam verildikdə obyekt ilkin formasına qaytarılmalı və təhvil verilməlidir.</p>

                                                    {doc.extra && (
                                                        <p><span className="font-bold mr-2 text-black">6. Əlavə şərtlər:</span> <span className="text-black">{doc.extra}</span></p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-16 pt-10 flex justify-between">
                                                <div className="w-[40%]">
                                                    <div className="text-[9px] text-gray-400 uppercase tracking-widest mb-4">İcarəyə verən</div>
                                                    <div className="font-bold text-sm text-black mb-8 border-b border-dashed border-gray-300 pb-1">{fallback(doc.landlord, "____________________")}</div>
                                                    <div className="text-[10px] text-gray-500">İmza: _________________</div>
                                                </div>
                                                <div className="w-[40%] text-right">
                                                    <div className="text-[9px] text-gray-400 uppercase tracking-widest mb-4">İcarəçi</div>
                                                    <div className="font-bold text-sm text-black mb-8 border-b border-dashed border-gray-300 pb-1">{fallback(doc.tenant, "____________________")}</div>
                                                    <div className="text-[10px] text-gray-500">İmza: _________________</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #192840; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #C9A84C; }
                
                @media print {
                    body * { visibility: hidden; }
                    #document-preview, #document-preview * { visibility: visible; }
                    #document-preview { position: absolute; left: 0; top: 0; }
                    @page { margin: 0; size: A4 portrait; }
                    body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .no-print { display: none !important; }
                    .print-content { 
                        box-shadow: none !important; 
                        padding: 30mm 20mm !important; 
                        margin: 0 !important; 
                        width: 100% !important;
                        max-width: none !important;
                        height: 100% !important;
                        border: none !important;
                    }
                    .print-styles {
                        background: white !important;
                        display: block !important;
                    }
                }
            `}} />
        </div>
    );
}
