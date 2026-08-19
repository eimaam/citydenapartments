import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RestaurantOrder } from './schemas/restaurant-order.schema';
import { MenuItem } from '../restaurant-menu/schemas/menu-item.schema';
import { DeliveryLocation } from '../restaurant-delivery/schemas/delivery-location.schema';
import { Branch } from '../branches/branch.schema';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import {
  RestaurantOrderStatus,
  RestaurantPaymentStatus,
  RestaurantDeliveryType,
  RestaurantPaymentMethod,
} from '@citydenapartments/shared';
import type {
  RestaurantOrderStatusType,
  RestaurantDeliveryTypeType,
  RestaurantPaymentMethodType,
  RestaurantPaymentStatusType,
} from '@citydenapartments/shared';

@Injectable()
export class RestaurantOrdersService {
  private readonly logger = new Logger(RestaurantOrdersService.name);

  constructor(
    @InjectModel(RestaurantOrder.name) private orderModel: Model<RestaurantOrder>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItem>,
    @InjectModel(DeliveryLocation.name) private locationModel: Model<DeliveryLocation>,
    @InjectModel(Branch.name) private branchModel: Model<Branch>,
    private readonly telegramBotService: TelegramBotService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ── Unique Readable Order Number Generator ─────────────────────
  private async generateOrderNumber(branchCode = 'ABJ'): Promise<string> {
    const code = (branchCode || 'ABJ').toUpperCase();
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const count = await this.orderModel.countDocuments();
    const seq = (count + 1).toString().slice(-3).padStart(3, '0');
    return `CD-${code}-${seq}${suffix}`;
  }

  // ── Place Order (Public Guest) ──────────────────────────────────
  async placeOrder(dto: {
    branchId: string;
    customer: { name: string; phone: string; email?: string };
    isGuestLodged: boolean;
    roomNumber?: string;
    deliveryType: RestaurantDeliveryTypeType;
    deliveryLocation?: {
      zoneId?: string;
      zoneName?: string;
      address?: string;
      notes?: string;
    };
    orderNotes?: string;
    items: Array<{
      menuItemId: string;
      selectedSize?: { name: string; price: number };
      selectedOptions?: Array<{ groupName: string; optionName: string; extraPrice: number }>;
      quantity: number;
      specialInstructions?: string;
    }>;
    paymentMethod: RestaurantPaymentMethodType;
  }) {
    if (!dto.branchId) throw new BadRequestException('Branch is required');
    if (!dto.items || dto.items.length === 0) throw new BadRequestException('Order must contain at least one item');
    if (!dto.customer?.name || !dto.customer?.phone) throw new BadRequestException('Customer name and phone number are required');

    // Phone number sanitization: strictly 11 digits starting with 0, convert to +234...
    let rawPhone = dto.customer.phone.trim().replace(/[\s-]/g, '');
    if (rawPhone.startsWith('0') && rawPhone.length === 11) {
      dto.customer.phone = `+234${rawPhone.slice(1)}`;
    } else if (rawPhone.startsWith('234') && rawPhone.length === 13) {
      dto.customer.phone = `+${rawPhone}`;
    } else if (rawPhone.startsWith('+234') && rawPhone.length === 14) {
      dto.customer.phone = rawPhone;
    } else {
      throw new BadRequestException('Phone number must be strictly 11 digits starting with 0 (e.g. 08012345678)');
    }

    const branch = await this.branchModel.findById(dto.branchId).lean();
    if (!branch) throw new NotFoundException('Branch not found');

    // 1. Validate Delivery Type & Delivery Fee
    let calculatedDeliveryFee = 0;
    let finalDeliveryType = dto.deliveryType;

    if (dto.isGuestLodged) {
      if (!dto.roomNumber?.trim()) throw new BadRequestException('Please enter your Room Number');
      finalDeliveryType = RestaurantDeliveryType.InRoom;
      calculatedDeliveryFee = 0; // In-house room delivery is free
    } else if (finalDeliveryType === RestaurantDeliveryType.HomeDelivery) {
      if (!dto.deliveryLocation?.zoneId) {
        throw new BadRequestException('Please select a delivery location');
      }
      const zone = await this.locationModel.findById(dto.deliveryLocation.zoneId).lean();
      if (!zone || !zone.isActive) {
        throw new BadRequestException('Selected delivery location is not available');
      }
      calculatedDeliveryFee = zone.deliveryFee || 0;
      dto.deliveryLocation.zoneName = zone.zoneName;
    } else {
      finalDeliveryType = RestaurantDeliveryType.Pickup;
      calculatedDeliveryFee = 0;
    }

    // 2. Validate Items, Calculate Unit Prices and Subtotal
    let subtotal = 0;
    const validatedItems: any[] = [];

    for (const itemDto of dto.items) {
      const menuItem = await this.menuItemModel.findById(itemDto.menuItemId).lean();
      if (!menuItem) {
        throw new BadRequestException(`Menu item with ID ${itemDto.menuItemId} was not found`);
      }
      if (!menuItem.isAvailable) {
        throw new BadRequestException(`"${menuItem.name}" is currently out of stock`);
      }

      // Determine unit price based on size or base price
      let unitPrice = menuItem.basePrice || 0;
      let selectedSizeData: any = undefined;

      if (menuItem.hasSizes && menuItem.sizes && menuItem.sizes.length > 0) {
        if (!itemDto.selectedSize?.name) {
          throw new BadRequestException(`Please select a portion size for "${menuItem.name}"`);
        }
        const matchedSize = menuItem.sizes.find(
          (s) => s.name.toLowerCase() === itemDto.selectedSize?.name.toLowerCase(),
        );
        if (!matchedSize) {
          throw new BadRequestException(`Invalid size "${itemDto.selectedSize?.name}" for "${menuItem.name}"`);
        }
        unitPrice = matchedSize.price;
        selectedSizeData = { name: matchedSize.name, price: matchedSize.price };
      }

      // Calculate Option Add-on Prices
      let extraOptionsPrice = 0;
      const validatedOptions: any[] = [];

      if (itemDto.selectedOptions && itemDto.selectedOptions.length > 0) {
        for (const opt of itemDto.selectedOptions) {
          extraOptionsPrice += opt.extraPrice || 0;
          validatedOptions.push({
            groupName: opt.groupName,
            optionName: opt.optionName,
            extraPrice: opt.extraPrice || 0,
          });
        }
      }

      const totalItemUnitPrice = unitPrice + extraOptionsPrice;
      const qty = Math.max(1, Number(itemDto.quantity) || 1);
      const lineTotal = totalItemUnitPrice * qty;

      subtotal += lineTotal;

      validatedItems.push({
        menuItemId: menuItem._id,
        name: menuItem.name,
        image: menuItem.images?.[0] || '',
        selectedSize: selectedSizeData,
        selectedOptions: validatedOptions,
        unitPrice: totalItemUnitPrice,
        quantity: qty,
        specialInstructions: itemDto.specialInstructions?.trim() || '',
        lineTotal,
      });
    }

    const totalAmount = subtotal + calculatedDeliveryFee;
    const orderNumber = await this.generateOrderNumber(branch.code || 'CDA');

    const newOrder = new this.orderModel({
      orderNumber,
      branchId: new Types.ObjectId(dto.branchId),
      customer: {
        name: dto.customer.name.trim(),
        phone: dto.customer.phone.trim(),
        email: dto.customer.email?.trim() || '',
      },
      isGuestLodged: dto.isGuestLodged,
      roomNumber: dto.roomNumber?.trim() || '',
      deliveryType: finalDeliveryType,
      deliveryLocation: dto.deliveryLocation,
      orderNotes: dto.orderNotes?.trim() || '',
      items: validatedItems,
      subtotal,
      deliveryFee: calculatedDeliveryFee,
      totalAmount,
      orderStatus: RestaurantOrderStatus.Received,
      paymentMethod: dto.paymentMethod || RestaurantPaymentMethod.PayOnDelivery,
      paymentStatus: RestaurantPaymentStatus.Pending,
      timeline: [
        {
          status: RestaurantOrderStatus.Received,
          timestamp: new Date(),
          updatedBy: 'Guest Web Order',
          notes: 'Order placed successfully by guest via digital menu',
        },
      ],
    });

    const savedOrder = await newOrder.save();

    // 3. Trigger Telegraf Sound Alert to Staff Telegram Channel
    try {
      const telegramMsgId = await this.telegramBotService.sendOrderAlert(savedOrder, branch.name);
      if (telegramMsgId) {
        savedOrder.telegramMessageId = telegramMsgId;
        await savedOrder.save();
      }
    } catch (err: any) {
      this.logger.error(`Telegram alert error: ${err.message}`);
    }

    return savedOrder;
  }

  // ── Track Order by Order Number (Public) ────────────────────────
  async trackOrder(orderNumber: string) {
    const order = await this.orderModel
      .findOne({ orderNumber: orderNumber.trim().toUpperCase() })
      .populate('branchId', 'name code address policies')
      .lean();

    if (!order) throw new NotFoundException(`Order with reference "${orderNumber}" not found`);
    return order;
  }

  // ── Track Orders by Phone Number (Public) ───────────────────────
  async trackOrdersByPhone(phone: string) {
    const raw = phone.trim().replace(/[\s-]/g, '');
    const variants = [raw];
    if (raw.startsWith('0')) {
      variants.push(`+234${raw.slice(1)}`);
      variants.push(`234${raw.slice(1)}`);
    } else if (raw.startsWith('+234')) {
      variants.push(`0${raw.slice(4)}`);
      variants.push(raw.slice(1));
    } else if (raw.startsWith('234')) {
      variants.push(`0${raw.slice(3)}`);
      variants.push(`+${raw}`);
    }

    return this.orderModel
      .find({ 'customer.phone': { $in: variants } })
      .populate('branchId', 'name code address')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
  }

  // ── Staff & Admin Orders Query ──────────────────────────────────
  async getOrders(query: {
    branchId: string;
    orderStatus?: string;
    deliveryType?: string;
    paymentStatus?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const filter: any = { branchId: new Types.ObjectId(query.branchId) };

    if (query.orderStatus && query.orderStatus !== 'all') {
      filter.orderStatus = query.orderStatus;
    }

    if (query.deliveryType && query.deliveryType !== 'all') {
      filter.deliveryType = query.deliveryType;
    }

    if (query.paymentStatus && query.paymentStatus !== 'all') {
      filter.paymentStatus = query.paymentStatus;
    }

    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (query.search && query.search.trim()) {
      const regex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { orderNumber: regex },
        { 'customer.name': regex },
        { 'customer.phone': regex },
        { roomNumber: regex },
      ];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .populate('branchId', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.orderModel.countDocuments(filter),
    ]);

    return {
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOrderById(id: string) {
    const order = await this.orderModel.findById(id).populate('branchId', 'name code address').lean();
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  // ── Update Order Status (Staff Action) ──────────────────────────
  async updateOrderStatus(
    id: string,
    status: RestaurantOrderStatusType,
    actorName: string,
    notes?: string,
    user?: any,
  ) {
    const order = await this.orderModel.findById(id).populate('branchId', 'name code');
    if (!order) throw new NotFoundException('Order not found');

    const previousStatus = order.orderStatus;
    order.orderStatus = status;
    order.timeline.push({
      status,
      timestamp: new Date(),
      updatedBy: actorName,
      notes: notes || `Order status updated to ${status}`,
    });

    if (status === RestaurantOrderStatus.Completed && order.paymentStatus === RestaurantPaymentStatus.Pending) {
      // If completed and was cash/POS, mark as settled
      order.paymentStatus = RestaurantPaymentStatus.Settled;
    }

    const saved = await order.save();

    this.logger.log(
      `[AUDIT] 📋 Order #${saved.orderNumber} status changed from "${previousStatus.toUpperCase()}" ➔ "${status.toUpperCase()}" by ${actorName}`
    );

    if (user?._id || user?.sub) {
      await this.auditLogService.log({
        entityType: 'RestaurantOrder',
        entityId: id,
        action: 'RESTAURANT_ORDER_STATUS_CHANGED',
        description: `Order #${saved.orderNumber} status changed from ${previousStatus.toUpperCase()} to ${status.toUpperCase()} by ${actorName}`,
        performedBy: user._id || user.sub,
        branchId: order.branchId ? (order.branchId as any)._id?.toString() : undefined,
        details: {
          orderNumber: saved.orderNumber,
          previousStatus,
          newStatus: status,
          notes,
          customer: saved.customer,
          totalAmount: saved.totalAmount,
        },
      });
    }

    // Update Telegram notification thread
    if (order.telegramMessageId) {
      const branchName = (order.branchId as any)?.name || 'City Den';
      this.telegramBotService.updateOrderNotification(order.telegramMessageId, saved, branchName, actorName);
    }

    return saved;
  }

  // ── Update Payment Status ───────────────────────────────────────
  async updatePaymentStatus(
    id: string,
    paymentStatus: RestaurantPaymentStatusType,
    paymentMethod?: RestaurantPaymentMethodType,
    actorName?: string,
    user?: any,
  ) {
    const order = await this.orderModel.findById(id);
    if (!order) throw new NotFoundException('Order not found');

    const previousPaymentStatus = order.paymentStatus;
    order.paymentStatus = paymentStatus;
    if (paymentMethod) order.paymentMethod = paymentMethod;

    order.timeline.push({
      status: order.orderStatus,
      timestamp: new Date(),
      updatedBy: actorName || 'Staff',
      notes: `Payment status changed to ${paymentStatus} (${paymentMethod || order.paymentMethod})`,
    });

    const saved = await order.save();

    this.logger.log(
      `[AUDIT] 💳 Order #${saved.orderNumber} payment status changed from "${previousPaymentStatus.toUpperCase()}" ➔ "${paymentStatus.toUpperCase()}" by ${actorName || 'Staff'}`
    );

    if (user?._id || user?.sub) {
      await this.auditLogService.log({
        entityType: 'RestaurantOrder',
        entityId: id,
        action: 'RESTAURANT_ORDER_PAYMENT_UPDATED',
        description: `Order #${saved.orderNumber} payment marked as ${paymentStatus.toUpperCase()} (${paymentMethod || saved.paymentMethod}) by ${actorName || 'Staff'}`,
        performedBy: user._id || user.sub,
        branchId: saved.branchId?.toString(),
        details: {
          orderNumber: saved.orderNumber,
          previousPaymentStatus,
          newPaymentStatus: paymentStatus,
          paymentMethod: paymentMethod || saved.paymentMethod,
          totalAmount: saved.totalAmount,
        },
      });
    }

    return saved;
  }

  // ── Restaurant Analytics ────────────────────────────────────────
  async getAnalytics(branchId: string, startDate?: string, endDate?: string) {
    const matchFilter: any = { branchId: new Types.ObjectId(branchId) };

    if (startDate || endDate) {
      matchFilter.createdAt = {};
      if (startDate) matchFilter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchFilter.createdAt.$lte = end;
      }
    }

    const [summary, topItems, statusCounts] = await Promise.all([
      // Total Revenue & Orders
      this.orderModel.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: {
                $cond: [{ $ne: ['$orderStatus', RestaurantOrderStatus.Cancelled] }, '$totalAmount', 0],
              },
            },
            totalOrders: { $sum: 1 },
            completedOrders: {
              $sum: { $cond: [{ $eq: ['$orderStatus', RestaurantOrderStatus.Completed] }, 1, 0] },
            },
            inRoomOrders: {
              $sum: { $cond: [{ $eq: ['$deliveryType', RestaurantDeliveryType.InRoom] }, 1, 0] },
            },
            homeDeliveryOrders: {
              $sum: { $cond: [{ $eq: ['$deliveryType', RestaurantDeliveryType.HomeDelivery] }, 1, 0] },
            },
          },
        },
      ]),

      // Top Selling Dishes
      this.orderModel.aggregate([
        { $match: { ...matchFilter, orderStatus: { $ne: RestaurantOrderStatus.Cancelled } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.name',
            totalQuantity: { $sum: '$items.quantity' },
            totalSales: { $sum: '$items.lineTotal' },
          },
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 },
      ]),

      // Status breakdown
      this.orderModel.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      overall: summary[0] || {
        totalRevenue: 0,
        totalOrders: 0,
        completedOrders: 0,
        inRoomOrders: 0,
        homeDeliveryOrders: 0,
      },
      topItems,
      statusCounts: statusCounts.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
    };
  }
}
