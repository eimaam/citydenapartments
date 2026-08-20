import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Telegraf, Markup } from 'telegraf';
import { AppConfig } from '../../config/app.config';
import {
  RestaurantOrderStatus,
  RestaurantPaymentStatus,
  RestaurantDeliveryType,
  RestaurantOrderStatusType,
} from '@citydenapartments/shared';
import { RestaurantOrder } from '../restaurant-orders/schemas/restaurant-order.schema';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class TelegramBotService implements OnModuleInit {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot: Telegraf | null = null;
  private isReady = false;

  constructor(
    @InjectModel(RestaurantOrder.name) private orderModel: Model<RestaurantOrder>,
    private readonly auditLogService: AuditLogService,
  ) {}

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

      this.bot.catch((err: any) => {
        this.logger.error(`Telegraf bot runtime error: ${err.message || err}`);
      });

      // Handle Telegram Bot commands
      this.bot.command('start', (ctx) => {
        const chatId = ctx.chat.id;
        ctx.reply(
          `👋 Welcome to City Den Restaurant Bot!\n\nThis Chat ID is: <code>${chatId}</code>\nSet this in your environment as TELEGRAM_STAFF_CHAT_ID to receive real-time order alerts.`,
          {
            parse_mode: 'HTML',
          },
        );
      });

      this.bot.command('chatid', (ctx) => {
        ctx.reply(`Your Telegram Chat ID is: <code>${ctx.chat.id}</code>`, { parse_mode: 'HTML' });
      });

      // Handle inline button callbacks for order status updates
      this.bot.action(/^status:(.+):(.+)$/, async (ctx) => {
        try {
          const match = ctx.match;
          const orderId = match[1];
          const targetStatus = match[2] as RestaurantOrderStatusType;
          const fromUser = ctx.from;
          const actorName = fromUser.username
            ? `@${fromUser.username}`
            : `${fromUser.first_name || ''} ${fromUser.last_name || ''}`.trim() || 'Telegram Staff';

          // Acknowledge immediately to dismiss the Telegram client loading spinner
          const readableStatus = targetStatus.replace(/_/g, ' ').toUpperCase();
          await ctx.answerCbQuery(`⚡ Status: ${readableStatus}`);

          const order = await this.orderModel.findById(orderId).populate('branchId', 'name code');
          if (!order) {
            await ctx.answerCbQuery('❌ Order not found').catch(() => {});
            return;
          }

          const previousStatus = order.orderStatus;
          order.orderStatus = targetStatus;
          order.timeline.push({
            status: targetStatus,
            timestamp: new Date(),
            updatedBy: `Telegram (${actorName})`,
            notes: `Status updated via Telegram bot action button by ${actorName}`,
          });

          if (targetStatus === RestaurantOrderStatus.Completed && order.paymentStatus === RestaurantPaymentStatus.Pending) {
            order.paymentStatus = RestaurantPaymentStatus.Settled;
          }

          const savedOrder = await order.save();

          this.logger.log(
            `[AUDIT] 📋 Order #${savedOrder.orderNumber} status changed from "${previousStatus.toUpperCase()}" ➔ "${targetStatus.toUpperCase()}" via Telegram by ${actorName}`
          );

          await this.auditLogService.log({
            entityType: 'RestaurantOrder',
            entityId: orderId,
            action: 'RESTAURANT_ORDER_STATUS_CHANGED',
            description: `Order #${savedOrder.orderNumber} status changed from ${previousStatus.toUpperCase()} to ${targetStatus.toUpperCase()} via Telegram by ${actorName}`,
            performedBy: `telegram:${fromUser.id}`,
            branchId: order.branchId ? (order.branchId as any)._id?.toString() : undefined,
            details: {
              orderNumber: savedOrder.orderNumber,
              previousStatus,
              newStatus: targetStatus,
              actorName,
              telegramUserId: fromUser.id,
            },
          });

          // Update inline keyboard on the clicked message
          const newKeyboard = this.getOrderKeyboard(orderId, targetStatus);
          await ctx.editMessageReplyMarkup(newKeyboard.reply_markup).catch(() => {});

          // Send update thread notification
          const targetMessageId = ctx.callbackQuery?.message?.message_id || order.telegramMessageId;
          if (targetMessageId) {
            const branchName = (order.branchId as any)?.name || 'City Den';
            await this.updateOrderNotification(
              targetMessageId,
              savedOrder,
              branchName,
              `Telegram (${actorName})`,
            );
          }
        } catch (error: any) {
          this.logger.error(`Error processing Telegram button click: ${error.message}`);
          await ctx.answerCbQuery(`❌ Error: ${error.message || 'Could not update order'}`).catch(() => {});
        }
      });

      // Fallback callback query handler to ensure no callback is left unanswered
      this.bot.on('callback_query', async (ctx, next) => {
        try {
          await ctx.answerCbQuery().catch(() => {});
        } catch {}
        return next();
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

  private getOrderKeyboard(orderId: string, status?: string) {
    if (status === RestaurantOrderStatus.Completed || status === RestaurantOrderStatus.Cancelled) {
      return Markup.inlineKeyboard([]);
    }

    if (status === RestaurantOrderStatus.Preparing) {
      return Markup.inlineKeyboard([
        [
          Markup.button.callback('🛵 Dispatched', `status:${orderId}:${RestaurantOrderStatus.OutForDelivery}`),
          Markup.button.callback('✅ Completed', `status:${orderId}:${RestaurantOrderStatus.Completed}`),
        ],
      ]);
    }

    if (status === RestaurantOrderStatus.OutForDelivery) {
      return Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Completed', `status:${orderId}:${RestaurantOrderStatus.Completed}`),
        ],
      ]);
    }

    // Default for Received / Confirmed or initial state
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('👨‍🍳 Start Preparing', `status:${orderId}:${RestaurantOrderStatus.Preparing}`),
        Markup.button.callback('🛵 Dispatched', `status:${orderId}:${RestaurantOrderStatus.OutForDelivery}`),
      ],
      [
        Markup.button.callback('✅ Completed', `status:${orderId}:${RestaurantOrderStatus.Completed}`),
      ],
    ]);
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

      const keyboard = this.getOrderKeyboard(order._id.toString(), order.orderStatus);

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

  async updateOrderNotification(messageId: number | undefined, order: any, branchName: string, updatedByText: string) {
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

      // Update original message's action buttons to reflect the new status
      const updatedKeyboard = this.getOrderKeyboard(order._id.toString(), order.orderStatus);
      await this.bot.telegram
        .editMessageReplyMarkup(chatId, messageId, undefined, updatedKeyboard.reply_markup)
        .catch(() => {});
    } catch (err: any) {
      this.logger.error(`Failed to update Telegram message: ${err.message}`);
    }
  }
}

