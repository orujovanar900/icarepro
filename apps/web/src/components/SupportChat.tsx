import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, MoreHorizontal } from 'lucide-react';
import { api } from '@/lib/api';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export function SupportChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: 'Salam! 👋 Mən Mamed, İcarə Pro-nun dəstək assistentiyəm.\nSizə necə kömək edə bilərəm?',
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const quickReplies = [
        'Qiymətlər haqqında məlumat',
        'Necə başlamaq olar?',
        'Texniki problem',
        'İstifadə Qaydaları',
    ];

    const systemPrompt = `Sən İcarə Pro-nun dəstək assistentisən. Adın "Mamed"dir.

İcarə Pro haqqında bilməli olduğun hər şey:

MƏHSUL:
İcarə Pro - Azərbaycan bazarı üçün hazırlanmış professional əmlak idarəetmə sistemidir.
Sayt: icarepro.pages.dev

ƏSAS FUNKSİYALAR:
- Müqavilə idarəetməsi (yaratmaq, izləmək, yeniləmək)
- Obyekt idarəetməsi (foto, sənəd, status)
- Kirayəçi bazası və tarixçəsi
- Mədaxil və borcların izlənməsi
- Sənəd Ustası AI - müqavilə yaratmaq üçün AI köməkçi
- Maliyyə hesabatları (PDF, Excel)
- Vergi hesablaması (Azərbaycan qanunvericiliyinə uyğun)
- Email bildirişlər

ABUNƏ PLANLAR:
- Bürünc: 29 AZN/ay - 5 obyektə qədər
- Gümüş: 69 AZN/ay - 20 obyektə qədər  
- Qızıl: 149 AZN/ay - 50 obyektə qədər
- İndividual 
- Bütün planlarda 14 günlük Pulsuz sınaq dövrü var

DƏSTƏK:
- Email: support@icare.pro.az
- İş saatları: Bazar ertəsi - Cümə, 09:00 - 18:00

CAVAB VERMƏLİ OLDUĞUN MÖVZULAR:
✅ İcarə Pro-nun funksiyaları haqqında suallar
✅ Qiymətlər və planlar haqqında
✅ Texniki problemlər (login, xəta mesajları)
✅ Müqavilə, hesabat, vergi sualları (proqramla bağlı)
✅ Necə istifadə etmək olar

CAVAB VERMƏMƏLİ OLDUĞUN MÖVZULAR:
❌ Azərbaycan qanunvericiliyi haqqında ümumi hüquqi məsləhət
❌ Digər proqramlar, rəqiblər haqqında
❌ Şəxsi məsləhətlər
❌ Əmlak alqı-satqısı
❌ Bu mövzularda deyərsən: "Bu mənim səlahiyyətimdə deyil. Əlavə yardım üçün kuratorunuza müraciət edin."

KURATOR YÖNLƏNDIRMƏSI:
Əgər istifadəçi:
- "insan ilə danışmaq istəyirəm" yazsa
- "zəng etmək istəyirəm" yazsa  
- Texniki problem həll olunmursa
- 3 mesajdan sonra hələ də kömək lazımdırsa
Deyin: "Sizi canlı dəstəyə yönləndirirəm 👨‍💼\nKuratorunuz: ${import.meta.env['VITE_SUPPORT_PHONE'] || "+994 XX XXX XX XX"}\nİş saatları: 09:00 - 18:00"

DİL:
- Həmişə Azərbaycan dilində cavab ver
- Qısa və aydın ol (max 3-4 cümlə)
- Dostcasına amma peşəkar ton
- Emoji istifadə et (az, yerli yerində)`;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading, isOpen]);

    const handleSend = async (text: string) => {
        if (!text.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: text.trim() };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const res = await api.post('/ai/chat', {
                messages: newMessages.map(m => ({ role: m.role, content: m.content })),
                systemPrompt,
            });
            const aiResponseContent: string = res.data?.content || '';

            setMessages((prev) => [...prev, { role: 'assistant', content: aiResponseContent }]);
        } catch (error: any) {
            console.error('Chat error:', error);
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: `Bağışlayın, xəta baş verdi: ${error.message}` },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <>
                <style>
                    {`
                    @keyframes floatBtn {
                        0%   { transform: translateY(0px); }
                        50%  { transform: translateY(-8px); }
                        100% { transform: translateY(0px); }
                    }
                    @keyframes ripple1 {
                        0%   { transform: scale(1);   opacity: 0.7; }
                        100% { transform: scale(2.6); opacity: 0; }
                    }
                    @media (max-width: 767px) {
                        .support-chat-btn { bottom: 80px !important; }
                        .support-chat-btn button { width: 44px !important; height: 44px !important; }
                    }
                    `}
                </style>
                <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 999 }} className="support-chat-btn">
                    {/* Ripple rings */}
                    <span style={{
                        position: 'absolute', inset: 0, borderRadius: '50%',
                        background: 'rgba(201, 168, 76, 0.4)',
                        animation: 'ripple1 2.4s ease-out infinite',
                    }} />
                    <span style={{
                        position: 'absolute', inset: 0, borderRadius: '50%',
                        background: 'rgba(201, 168, 76, 0.25)',
                        animation: 'ripple1 2.4s ease-out infinite 0.8s',
                    }} />
                    <span style={{
                        position: 'absolute', inset: 0, borderRadius: '50%',
                        background: 'rgba(201, 168, 76, 0.12)',
                        animation: 'ripple1 2.4s ease-out infinite 1.6s',
                    }} />
                    <button
                        onClick={() => setIsOpen(true)}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                            e.currentTarget.style.boxShadow = '0 6px 32px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                            e.currentTarget.style.boxShadow = '0 4px 24px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                        style={{
                            position: 'relative', zIndex: 1,
                            width: 48, height: 48,
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.15)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            animation: 'floatBtn 3s ease-in-out infinite',
                        }}
                    >
                        <MessageCircle style={{ width: 20, height: 20, color: '#1A1A2E' }} />
                    </button>
                </div>
            </>
        );
    }

    return (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-7rem)] bg-[var(--color-surface)] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-[var(--color-border)]">
            {/* Header */}
            <div className="text-white p-4 flex justify-between items-center z-10" style={{ background: 'linear-gradient(135deg, #1A1A2E, #2a2a4e)' }}>
                <div className="flex flex-col">
                    <span className="font-bold text-lg">İcarə Pro Dəstək</span>
                    <span className="text-xs text-gray-300 flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-green-400"></span> Online
                    </span>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-300 hover:text-white transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 bg-[var(--color-card)] overflow-y-auto p-4 flex flex-col gap-4">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`max-w-[85%] p-3 rounded-2xl text-[14px] leading-relaxed ${message.role === 'user'
                            ? 'bg-[#1A1A2E] text-white rounded-br-sm self-end'
                            : 'bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] rounded-bl-sm self-start shadow-sm'
                            }`}
                    >
                        {message.content.split('\n').map((line, i) => (
                            <p key={i} className="min-h-[1em]">
                                {line}
                            </p>
                        ))}
                    </div>
                ))}

                {isLoading && (
                    <div className="bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)] p-3 rounded-2xl rounded-bl-sm self-start shadow-sm flex gap-1 items-center">
                        <MoreHorizontal className="w-5 h-5 animate-pulse text-[#C9A84C]" />
                    </div>
                )}

                {/* Quick Replies - Only show if it's the first message from AI and we have no other messages */}
                {messages.length === 1 && !isLoading && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {quickReplies.map((reply, i) => (
                            <button
                                key={i}
                                onClick={() => handleSend(reply)}
                                className="text-[13px] bg-[var(--color-surface)] border border-[#C9A84C]/30 text-[#1A1A2E] px-3 py-1.5 rounded-full hover:bg-[#C9A84C]/10 transition-colors text-left"
                            >
                                {reply}
                            </button>
                        ))}
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSend(input);
                    }}
                    className="flex gap-2"
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Mesajınızı yazın..."
                        className="flex-1 bg-[var(--color-card)] rounded-full px-4 text-[14px] text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[#C9A84C]/50 transition-all placeholder:text-[var(--color-muted)]"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="w-10 h-10 bg-[#1A1A2E] text-white rounded-full flex items-center justify-center shrink-0 disabled:opacity-50 hover:bg-[#2a2a4e] transition-colors"
                    >
                        <Send className="w-5 h-5 ml-[-2px] mt-[1px]" />
                    </button>
                </form>
            </div>
        </div>
    );
}
