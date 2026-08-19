import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Telegraf, Markup } from 'telegraf';
import { AppConfig } from '../../config/app.config';
import { RestaurantOrderStatus, RestaurantDeliveryType } from '@citydenapartments/shared';

@Injectable()
export class TelegramBotService implements OnModuleInit {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot: Telegraf | null = null;
  private isReady = false;

  async onModuleInit() {
    this.initializeBot();
  }

  private initializeBot() {
    const token = AppConfig.TELEGRAM_BOT_TOKEN;
    if (!token || !AppConfig.TELEGRAM_ENABLED) {
      this.logger.warn('Telegram Bot Token not configured or disabled. Telegram notifications will be logged to console.');
      return;
    }

    try {
      this.bot = new Telegraf(token);

      // Handle Telegram Bot commands
      this.bot.command('start', (ctx) => {
        const chatId = ctx.chat.id;
        ctx.reply(`👋 Welcome to City Den Restaurant Bot!\n\nThis Chat ID is: <code>${chatId}</code>\nSet this in your environment as TELEGRAM_STAFF_CHAT_ID to receive real-time order alerts.`, {
          parse_mode: 'HTML',
        });
      });

      this.bot.command('chatid', (ctx) => {
        ctx.reply(`Your Telegram Chat ID is: <code>${ctx.chat.id}</code>`, { parse_mode: 'HTML' });
      });

      // Launch bot asynchronously in background
      this.bot.launch().then(() => {
        this.isReady = true;
        this.logger.log('Telegram Bot successfully launched and listening for staff commands.');
      }).catch((err) => {
        this.logger.error(`Failed to launch Telegram Bot: ${err.message}`);
      });
    } catch (error: any) {
      this.logger.error(`Error initializing Telegraf: ${error.message}`);
    }
  }

  private getTargetChatId(): string | undefined {
    return (
      AppConfig.TELEGRAM_STAFF_CHAT_ID ||
      (AppConfig as any).TELEGRAM_CHAT_ID ||
      process.env.TELEGRAM_CHAT_ID ||
      process.env.TELEGRAM_STAFF_CHAT_ID
    );
  }

  async sendOrderAlert(order: any, branchName: string): Promise<number | undefined> {
    const chatId = this.getTargetChatId();
    if (!this.bot || !chatId) {
      this.logger.log(`[TELEGRAM MOCK ALERT] New Order #${order.orderNumber} placed for ${branchName}. Total: ₦${order.totalAmount?.toLocaleString()}`);
      return undefined;
    }

    try {
      const itemsList = order.items
        .map((item: any) => {
          let line = `• <b>${item.quantity}x ${item.name}</b>`;
          if (item.selectedSize?.name) line += ` (<i>${item.selectedSize.name}</i>)`;
          if (item.selectedOptions && item.selectedOptions.length > 0) {
            const opts = item.selectedOptions.map((o: any) => o.optionName).join(', ');
            line += `\n   ↳ <i>Options: ${opts}</i>`;
          }
          if (item.specialInstructions) {
            line += `\n   ↳ ⚠️ <i>Note: "${item.specialInstructions}"</i>`;
          }
          line += ` — ₦${(item.lineTotal || 0).toLocaleString()}`;
          return line;
        })
        .join('\n');

      let deliveryInfo = '';
      if (order.deliveryType === RestaurantDeliveryType.InRoom) {
        deliveryInfo = `🚪 <b>Room Delivery:</b> Room ${order.roomNumber || 'N/A'}`;
      } else if (order.deliveryType === RestaurantDeliveryType.Pickup) {
        deliveryInfo = `🥡 <b>Restaurant Pickup</b>`;
      } else {
        deliveryInfo = `🛵 <b>Home Delivery:</b> ${order.deliveryLocation?.zoneName || ''} - ${order.deliveryLocation?.address || ''}`;
      }

      const orderNotes = order.orderNotes ? `\n📝 <b>Order Instructions:</b> ${order.orderNotes}` : '';

      const message = `
🔔 <b>NEW RESTAURANT ORDER #${order.orderNumber}</b>
🏢 <b>Branch:</b> ${branchName}
${deliveryInfo}
👤 <b>Guest:</b> ${order.customer?.name || 'Guest'} (${order.customer?.phone || 'No phone'})
${orderNotes}

🍽️ <b>Items Ordered:</b>
${itemsList}

────────────────────────
💵 <b>Subtotal:</b> ₦${(order.subtotal || 0).toLocaleString()}
🚚 <b>Delivery Fee:</b> ₦${(order.deliveryFee || 0).toLocaleString()}
💰 <b>TOTAL: ₦${(order.totalAmount || 0).toLocaleString()}</b>
💳 <b>Payment:</b> ${order.paymentMethod?.toUpperCase()} (${order.paymentStatus?.toUpperCase()})
⏳ <b>Status:</b> <b>${order.orderStatus?.toUpperCase()}</b>
`;

      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('👨‍🍳 Start Preparing', `status:${order._id}:preparing`),
          Markup.button.callback('🛵 Dispatched', `status:${order._id}:out_for_delivery`),
        ],
        [
          Markup.button.callback('✅ Completed', `status:${order._id}:completed`),
        ],
      ]);

      const sentMsg = await this.bot.telegram.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        ...keyboard,
      });

      return sentMsg.message_id;
    } catch (err: any) {
      this.logger.error(`Failed to send Telegram order alert: ${err.message}`);
      return undefined;
    }
  }

  async updateOrderNotification(messageId: number, order: any, branchName: string, updatedByText: string) {
    const chatId = this.getTargetChatId();
    if (!this.bot || !chatId || !messageId) return;

    try {
      const statusEmoji: Record<string, string> = {
        [RestaurantOrderStatus.Received]: '📥',
        [RestaurantOrderStatus.Confirmed]: '👍',
        [RestaurantOrderStatus.Preparing]: '👨‍🍳',
        [RestaurantOrderStatus.OutForDelivery]: '🛵',
        [RestaurantOrderStatus.Completed]: '✅',
        [RestaurantOrderStatus.Cancelled]: '❌',
      };
      const emoji = statusEmoji[order.orderStatus as string] || '🔔';

      const updateSummary = `\n\n⚡ <b>Update:</b> ${emoji} Status changed to <b>${order.orderStatus?.toUpperCase()}</b> (${updatedByText})`;

      await this.bot.telegram.sendMessage(chatId, `📌 <b>Order #${order.orderNumber} Update</b>${updateSummary}`, {
        parse_mode: 'HTML',
        reply_parameters: { message_id: messageId },
      });
    } catch (err: any) {
      this.logger.error(`Failed to update Telegram message: ${err.message}`);
    }
  }
}
