import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/auth';
import { Button } from '@citydenapartments/shared';
import { Input, PasswordInput } from '@citydenapartments/shared';
import { Mail, Lock, Building2 } from 'lucide-react';

const URBAN_IMAGE = 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=80';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh bg-surface">
      <div className="hidden lg:flex w-[42%] relative overflow-hidden bg-inverse-surface">
        <div className="absolute inset-0">
          <img src={URBAN_IMAGE} alt="" className="w-full h-full object-cover opacity-60" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/90 via-inverse-surface/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-inverse-surface/80 to-transparent" />

        <div className="relative flex flex-col justify-between w-full p-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-on-primary" />
            </div>
            <span className="text-sm font-bold tracking-[0.2em] uppercase text-inverse-on-surface opacity-70">
              City Den
            </span>
          </div>

          <div>
            <h1 className="font-serif text-5xl leading-tight text-inverse-on-surface mb-6">
              Urban<br />Sanctuary
            </h1>
            <p className="text-lg leading-relaxed text-inverse-on-surface opacity-60 max-w-sm">
              Premium residential management redefined. Elevate your living experience.
            </p>
          </div>

          <div className="flex gap-2">
            <span className="w-8 h-px bg-primary opacity-60 self-center" />
            <span className="text-xs tracking-[0.2em] uppercase text-inverse-on-surface opacity-40">
              Admin Portal v1
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-surface-container-lowest">
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded bg-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-on-primary" />
            </div>
            <span className="text-sm font-bold tracking-[0.2em] uppercase text-on-surface-variant">
              City Den
            </span>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-px bg-primary" />
              <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">
                City Den Management
              </span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl text-on-surface mb-2">Admin Portal</h2>
            <p className="text-sm text-on-surface-variant">
              Enter your credentials to access the secure network.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div className="px-4 py-3 rounded bg-error-container text-on-error-container text-sm">
                {error}
              </div>
            )}

            <Input
              size="lg"
              type="email"
              placeholder="Email Address"
              prefix={<Mail size={16} className="text-outline" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="relative">
              <PasswordInput
                size="lg"
                type="password"
                placeholder="Password"
                prefix={<Lock size={16} className="text-outline" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="flex justify-end mt-1.5">
                <button type="button" className="text-xs text-outline hover:text-primary transition-colors cursor-pointer bg-transparent border-none">
                  Forgot?
                </button>
              </div>
            </div>

            <Button variant="default" size="lg" htmlType="submit" loading={loading} fullWidth className="mt-2">
              Authenticate
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
