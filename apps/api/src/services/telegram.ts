import { Telegraf } from 'telegraf';

const botToken = process.env['TELEGRAM_BOT_TOKEN'];

// Ensure bot doesn't crash the server if token is missing
export const bot: Telegraf | null = botToken ? new Telegraf(botToken) : null;

export async function sendTelegramAlert(
    chatId: string,
    message: string
) {
    if (!bot) {
        console.warn('Telegram bot token not configured. Skipping alert.');
        return;
    }

    try {
        await bot.telegram.sendMessage(chatId, message, {
            parse_mode: 'HTML'
        });
    } catch (error) {
        console.error('Failed to send Telegram alert:', error);
    }
}

if (bot) {
    bot.start((ctx) => {
        ctx.reply(
            `Salam! İcarə Pro botuna xoş gəldiniz! 🏠\n\nChat ID-niz: <code>${ctx.chat.id}</code>\n\nBu ID-ni İcarə Pro parametrlərinə daxil edin.`,
            { parse_mode: 'HTML' }
        );
    });

    // Launch the bot without blocking the main process
    bot.launch().catch(err => console.error('Telegram bot launch error:', err));

    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
