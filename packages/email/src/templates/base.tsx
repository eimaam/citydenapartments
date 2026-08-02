import {
  Html, Head, Preview, Body, Container, Section,
  Text, Hr, Font,
} from '@react-email/components';

interface BaseProps {
  preview: string;
  children: React.ReactNode;
}

const gold = '#d4af37';
const surface = '#fbf9f9';
const cardBg = '#ffffff';
const textDark = '#1b1c1c';
const textMuted = '#7f7663';
const borderColor = '#e4e2e2';

export function BaseEmail({ preview, children }: BaseProps) {
  return (
    <Html>
      <Head>
        <Font fontFamily="Inter" fallbackFontFamily="sans-serif" webFont={{ url: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2', format: 'woff2' }} />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: surface, margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>

          {/* Brand header */}
          <Section style={{ textAlign: 'center', paddingBottom: 24 }}>
            <table cellPadding={0} cellSpacing={0} style={{ margin: '0 auto 8px' }}>
              <tr>
                <td style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: `${gold}18`, textAlign: 'center', verticalAlign: 'middle' }}>
                  <span style={{ fontSize: 22, lineHeight: '48px' }}>🏢</span>
                </td>
              </tr>
            </table>
            <Text style={{ fontSize: 18, fontWeight: 700, color: textDark, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
              City Den Apartments
            </Text>
          </Section>

          {/* Card */}
          <Section style={{ backgroundColor: cardBg, borderRadius: 12, padding: 32, border: `1px solid ${borderColor}` }}>
            {children}
          </Section>

          {/* Footer */}
          <Hr style={{ borderColor: borderColor, margin: '24px 0 16px' }} />
          <Text style={{ fontSize: 12, color: textMuted, textAlign: 'center', margin: 0, lineHeight: 1.6 }}>
            City Den Apartments &mdash; Management System
            <br />
            This is an automated message. Please do not reply directly.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
