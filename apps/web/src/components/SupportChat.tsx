import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, MoreHorizontal } from 'lucide-react';

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
- Başlanğıc: 29 AZN/ay - 10 obyektə qədər
- Üstün: 69 AZN/ay - 50 obyektə qədər  
- Peşəkar: 149 AZN/ay - limitsiz obyekt
- Fərdi 
- Bütün planlarda 14 günlük pulsuz sınaq dövrü var

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
            const apiKey = import.meta.env['VITE_ANTHROPIC_API_KEY'];
            if (!apiKey) {
                throw new Error('API key is missing');
            }

            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true',
                },
                body: JSON.stringify({
                    model: 'claude-haiku-4-5-20251001',
                    max_tokens: 500,
                    temperature: 0.7,
                    system: systemPrompt,
                    messages: newMessages.map(m => ({ role: m.role, content: m.content })),
                }),
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`API error: ${response.status} ${errText}`);
            }

            const data = await response.json();
            const aiResponseContent = data.content?.[0]?.text || '';

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
            <div
                className="fixed bottom-6 right-6 z-50 flex items-center justify-center cursor-pointer"
                style={{
                    width: '60px',
                    height: '60px',
                    animation: 'float 3s ease-in-out infinite'
                }}
            >
                <style>
                    {`
                    @keyframes float {
                        0% { transform: translateY(0px); }
                        50% { transform: translateY(-12px); }
                        100% { transform: translateY(0px); }
                    }
                    `}
                </style>
                <div className="absolute inset-0 bg-purple-500 rounded-full animate-ping opacity-75 duration-1000"></div>
                <button
                    onClick={() => setIsOpen(true)}
                    className="relative w-full h-full bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-colors flex items-center justify-center z-10"
                >
                    <MessageCircle className="w-8 h-8" />
                </button>
            </div>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-800 to-purple-600 text-white p-4 flex justify-between items-center z-10">
                <div className="flex flex-col">
                    <span className="font-bold text-lg">İcarə Pro Dəstək</span>
                    <span className="text-xs text-purple-200 flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-green-400"></span> Online
                    </span>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="text-purple-200 hover:text-white transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 bg-gray-50 overflow-y-auto p-4 flex flex-col gap-4">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`max-w-[85%] p-3 rounded-2xl text-[14px] leading-relaxed ${message.role === 'user'
                            ? 'bg-purple-600 text-white rounded-br-sm self-end'
                            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm self-start shadow-sm'
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
                    <div className="bg-white text-gray-500 border border-gray-200 p-3 rounded-2xl rounded-bl-sm self-start shadow-sm flex gap-1 items-center">
                        <MoreHorizontal className="w-5 h-5 animate-pulse text-purple-500" />
                    </div>
                )}

                {/* Quick Replies - Only show if it's the first message from AI and we have no other messages */}
                {messages.length === 1 && !isLoading && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {quickReplies.map((reply, i) => (
                            <button
                                key={i}
                                onClick={() => handleSend(reply)}
                                className="text-[13px] bg-white border border-purple-200 text-purple-700 px-3 py-1.5 rounded-full hover:bg-purple-50 transition-colors text-left"
                            >
                                {reply}
                            </button>
                        ))}
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-white border-t border-gray-200">
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
                        className="flex-1 bg-gray-100 rounded-full px-4 text-[14px] text-gray-900 outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-gray-400"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center shrink-0 disabled:opacity-50 hover:bg-purple-700 transition-colors"
                    >
                        <Send className="w-5 h-5 ml-[-2px] mt-[1px]" />
                    </button>
                </form>
            </div>
        </div>
    );
}
