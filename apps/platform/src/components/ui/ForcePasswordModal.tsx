import { useState } from 'react';
import { Modal, Button, Input,PasswordInput } from '@citydenapartments/shared';
import { useAuth } from '../../contexts/auth';

export function ForcePasswordModal() {
  const { user, changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!user || user.passwordChangedAt) return null;

  const handleSubmit = async () => {
    setError('');
    if (newPwd.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (newPwd !== confirm) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      await changePassword(current, newPwd);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal 
    isOpen onClose={() => {}} showCloseButton={false} width={420} title="Update Your Password" subTitle="Your account uses a temporary password. Please set a new one before continuing."
    onOk={handleSubmit}
    okText="Update Password"
    loading={loading}
    >
      <div className="space-y-4">
        {error && (
          <div className="px-3 py-2 rounded text-sm bg-error-container text-on-error-container">{error}</div>
        )}
        <PasswordInput size="md" type="password" placeholder="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        <PasswordInput size="md" type="password" placeholder="New password (min 6 chars)" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
        <PasswordInput size="md" type="password" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
    </Modal>
  );
}
