import {
  Section, Text, Row, Column, Hr,
} from '@react-email/components';
import { BaseEmail } from './base';

interface RoomLine {
  roomNumber: string;
  roomType: string;
  nights: number;
  pricePerNight: number;
  total: number;
}

interface BookingReceiptProps {
  guestName: string;
  guestEmail?: string;
  guestPhone: string;
  bookingReference: string;
  branchName: string;
  checkInDate: string;
  checkOutDate: string;
  rooms: RoomLine[];
  numberOfGuests: number;
  subtotal: number;
  discount: number;
  discountPercentage: number;
  vatAmount: number;
  serviceChargeAmount: number;
  totalPaid: number;
  paymentMethod: string;
  paymentReference?: string;
  bookingStatus: string;
  bookingDate: string;
}

const gold = '#d4af37';
const textDark = '#1b1c1c';
const textMuted = '#7f7663';
const borderColor = '#e4e2e2';

const label = { fontSize: 12, color: textMuted, margin: 0, lineHeight: 1.6 };
const value = { fontSize: 14, fontWeight: 600, color: textDark, margin: 0, lineHeight: 1.6 };
const sectionTitle = { fontSize: 11, fontWeight: 700, color: textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: '0 0 12px' };
const divider = { borderColor, margin: '20px 0' };
const col = { verticalAlign: 'top' as const };

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatN(n: number) { return `₦${n.toLocaleString()}`; }

const methodLabel: Record<string, string> = {
  cash: 'Cash', pos_card: 'POS / Card', bank_transfer: 'Bank Transfer',
};

const statusLabel: Record<string, string> = {
  reserved: 'Reserved', confirmed: 'Confirmed', checked_in: 'Checked In', checked_out: 'Checked Out', cancelled: 'Cancelled',
};

export function BookingReceiptEmail(props: BookingReceiptProps) {
  return (
    <BaseEmail preview={`Booking Confirmed — #${props.bookingReference}`}>
      {/* Header */}
      <Section style={{ textAlign: 'center', marginBottom: 24 }}>
        <Text style={{ fontSize: 10, color: gold, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0 }}>
          Booking Confirmed
        </Text>
        <Text style={{ fontSize: 20, fontWeight: 700, color: textDark, margin: '4px 0 0', letterSpacing: '-0.02em' }}>
          #{props.bookingReference}
        </Text>
      </Section>

      {/* Guest Details */}
      <Section style={{ marginBottom: 8 }}>
        <Text style={sectionTitle}>Guest Details</Text>
        <Row>
          <Column style={col}>
            <Text style={label}>Name</Text>
            <Text style={value}>{props.guestName}</Text>
          </Column>
          <Column style={col}>
            <Text style={label}>Phone</Text>
            <Text style={value}>{props.guestPhone}</Text>
          </Column>
        </Row>
        {props.guestEmail && (
          <Row>
            <Column style={col}>
              <Text style={label}>Email</Text>
              <Text style={value}>{props.guestEmail}</Text>
            </Column>
            <Column style={col} />
          </Row>
        )}
      </Section>

      <Hr style={divider} />

      {/* Booking Details */}
      <Section style={{ marginBottom: 8 }}>
        <Text style={sectionTitle}>Booking Details</Text>
        <Row>
          <Column style={col}>
            <Text style={label}>Branch</Text>
            <Text style={value}>{props.branchName}</Text>
          </Column>
          <Column style={col}>
            <Text style={label}>Status</Text>
            <Text style={{ ...value, color: '#10b981' }}>{statusLabel[props.bookingStatus] || props.bookingStatus}</Text>
          </Column>
        </Row>
        <Row>
          <Column style={col}>
            <Text style={label}>Check-In</Text>
            <Text style={value}>{formatDate(props.checkInDate)}</Text>
          </Column>
          <Column style={col}>
            <Text style={label}>Check-Out</Text>
            <Text style={value}>{formatDate(props.checkOutDate)}</Text>
          </Column>
        </Row>
        <Row>
          <Column style={col}>
            <Text style={label}>Guests</Text>
            <Text style={value}>{props.numberOfGuests}</Text>
          </Column>
          <Column style={col}>
            <Text style={label}>Booked On</Text>
            <Text style={value}>{formatDate(props.bookingDate)}</Text>
          </Column>
        </Row>
      </Section>

      <Hr style={divider} />

      {/* Rooms */}
      <Section style={{ marginBottom: 8 }}>
        <Text style={sectionTitle}>Rooms</Text>
        {props.rooms.map((r, i) => (
          <Row key={i} style={{ marginBottom: 8, padding: '8px 0', borderBottom: i < props.rooms.length - 1 ? `1px solid #f3f4f6` : 'none' }}>
            <Column style={col}>
              <Text style={{ fontSize: 14, fontWeight: 600, color: textDark, margin: 0 }}>Room {r.roomNumber}</Text>
              <Text style={{ fontSize: 12, color: textMuted, margin: 0 }}>{r.roomType}</Text>
            </Column>
            <Column style={{ ...col, textAlign: 'right' }}>
              <Text style={{ fontSize: 14, fontWeight: 600, color: textDark, margin: 0 }}>{formatN(r.total)}</Text>
              <Text style={{ fontSize: 11, color: textMuted, margin: 0 }}>{formatN(r.pricePerNight)} × {r.nights} night{r.nights > 1 ? 's' : ''}</Text>
            </Column>
          </Row>
        ))}
      </Section>

      <Hr style={divider} />

      {/* Charges */}
      <Section>
        <Text style={sectionTitle}>Payment Summary</Text>

        <Row style={{ marginBottom: 4 }}>
          <Column style={col}><Text style={label}>Room Charges</Text></Column>
          <Column style={{ ...col, textAlign: 'right' }}><Text style={value}>{formatN(props.subtotal)}</Text></Column>
        </Row>

        {props.discount > 0 && (
          <Row style={{ marginBottom: 4 }}>
            <Column style={col}><Text style={label}>Discount ({props.discountPercentage}%)</Text></Column>
            <Column style={{ ...col, textAlign: 'right' }}><Text style={{ ...value, color: '#10b981' }}>-{formatN(props.discount)}</Text></Column>
          </Row>
        )}

        {props.vatAmount > 0 && (
          <Row style={{ marginBottom: 4 }}>
            <Column style={col}><Text style={label}>VAT (7.5%)</Text></Column>
            <Column style={{ ...col, textAlign: 'right' }}><Text style={value}>{formatN(props.vatAmount)}</Text></Column>
          </Row>
        )}

        {props.serviceChargeAmount > 0 && (
          <Row style={{ marginBottom: 4 }}>
            <Column style={col}><Text style={label}>Service Charge (10%)</Text></Column>
            <Column style={{ ...col, textAlign: 'right' }}><Text style={value}>{formatN(props.serviceChargeAmount)}</Text></Column>
          </Row>
        )}

        <Hr style={{ borderColor, margin: '12px 0' }} />

        <Row>
          <Column style={col}><Text style={{ fontSize: 16, fontWeight: 700, color: textDark, margin: 0 }}>Total Paid</Text></Column>
          <Column style={{ ...col, textAlign: 'right' }}><Text style={{ fontSize: 18, fontWeight: 800, color: gold, margin: 0 }}>{formatN(props.totalPaid)}</Text></Column>
        </Row>

        <Row style={{ marginTop: 8 }}>
          <Column style={col}><Text style={label}>Payment Method</Text></Column>
          <Column style={{ ...col, textAlign: 'right' }}><Text style={value}>{methodLabel[props.paymentMethod] || props.paymentMethod}</Text></Column>
        </Row>

        {props.paymentReference && (
          <Row>
            <Column style={col}><Text style={label}>Payment Ref</Text></Column>
            <Column style={{ ...col, textAlign: 'right' }}><Text style={{ ...value, fontSize: 12 }}>{props.paymentReference}</Text></Column>
          </Row>
        )}
      </Section>

      {/* Thank you */}
      <Section style={{ textAlign: 'center', marginTop: 28, padding: '20px 0 0' }}>
        <Text style={{ fontSize: 13, color: textMuted, margin: 0, lineHeight: 1.6 }}>
          Thank you for choosing <strong style={{ color: textDark }}>City Den Apartments</strong>.
          <br />We look forward to your stay!
        </Text>
      </Section>
    </BaseEmail>
  );
}
