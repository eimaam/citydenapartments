import {
  Section, Text, Row, Column, Hr,
} from '@react-email/components';
import { BaseEmail } from './base';

interface AccountCreatedProps {
  name: string;
  email: string;
  password: string;
  role: string;
  loginUrl: string;
  createdBy?: string;
}

const gold = '#d4af37';
const textDark = '#1b1c1c';
const textMuted = '#7f7663';
const borderColor = '#e4e2e2';

const label = { fontSize: 12, color: textMuted, margin: 0, lineHeight: 1.6 };
const value = { fontSize: 14, fontWeight: 600, color: textDark, margin: 0, lineHeight: 1.6 };

export function AccountCreatedEmail(props: AccountCreatedProps) {
  return (
    <BaseEmail preview={`Your City Den Apartments account has been created`}>
      <Section style={{ textAlign: 'center', marginBottom: 24 }}>
        <Text style={{ fontSize: 10, color: gold, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0 }}>
          Account Created
        </Text>
        <Text style={{ fontSize: 20, fontWeight: 700, color: textDark, margin: '4px 0 0' }}>
          Welcome, {props.name}!
        </Text>
      </Section>

      <Text style={{ fontSize: 14, color: '#4d4635', lineHeight: 1.6, margin: '0 0 20px' }}>
        Your staff account for <strong style={{ color: textDark }}>City Den Apartments</strong> has been created.
        Use the credentials below to sign in.
      </Text>

      <Section style={{ backgroundColor: '#f5f3f3', borderRadius: 8, padding: 20, marginBottom: 20 }}>
        <Row style={{ marginBottom: 12 }}>
          <Column><Text style={label}>Email</Text></Column>
          <Column style={{ textAlign: 'right' }}><Text style={value}>{props.email}</Text></Column>
        </Row>
        <Row style={{ marginBottom: 12 }}>
          <Column><Text style={label}>Password</Text></Column>
          <Column style={{ textAlign: 'right' }}>
            <Text style={{ fontSize: 16, fontWeight: 700, color: gold, fontFamily: 'monospace', margin: 0, letterSpacing: '0.05em' }}>
              {props.password}
            </Text>
          </Column>
        </Row>
        <Row>
          <Column><Text style={label}>Role</Text></Column>
          <Column style={{ textAlign: 'right' }}><Text style={value}>{props.role}</Text></Column>
        </Row>
      </Section>

      {props.createdBy && (
        <Text style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 16px', lineHeight: 1.5 }}>
          Account created by {props.createdBy}.
        </Text>
      )}

      {/* Login button */}
      <Section style={{ textAlign: 'center', marginBottom: 20 }}>
        <a
          href={props.loginUrl}
          style={{
            display: 'inline-block',
            padding: '12px 32px',
            backgroundColor: gold,
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none',
            borderRadius: 8,
          }}
        >
          Sign In
        </a>
      </Section>

      <Hr style={{ borderColor, margin: '20px 0 16px' }} />

      <Text style={{ fontSize: 12, color: textMuted, margin: 0, lineHeight: 1.6 }}>
        For security, you will be asked to change your password on first sign-in.
        If you didn&apos;t expect this email, please contact your system administrator.
      </Text>
    </BaseEmail>
  );
}
