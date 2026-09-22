import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle,
  User,
  Mail,
  Shield,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { CosPage, CosPageHero } from '../cos/CosPage';
import { NotificationSettings } from '../notifications';
import { SourceHealth } from '../cos/SourceHealth';
import { MFAEnrollment } from '../security/MFAEnrollment';
import { getMFAFactors, unenrollMFA } from '../../lib/security';

export default function Settings() {
  const navigate = useNavigate();
  const { profile, user, isDemoMode, signOut, updateProfileName } = useAuth();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mfaOpen, setMfaOpen] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(true);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaBusy, setMfaBusy] = useState(false);
  const [name, setName] = useState(profile?.full_name || profile?.display_name || '');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState<string | null>(null);

  const backPath = '/home';

  const refreshMfa = async () => {
    const factors = await getMFAFactors();
    const verified = factors.find((factor) => factor.status === 'verified');
    setMfaEnabled(Boolean(verified));
    setMfaFactorId(verified?.id || null);
    setMfaLoading(false);
  };

  useEffect(() => {
    void refreshMfa();
  }, []);

  useEffect(() => {
    setName(profile?.full_name || profile?.display_name || '');
  }, [profile?.full_name, profile?.display_name]);

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    return errors;
  };

  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) return { strength: 1, label: 'Weak', color: 'bg-red-500' };
    if (strength <= 4) return { strength: 2, label: 'Medium', color: 'bg-yellow-500' };
    return { strength: 3, label: 'Strong', color: 'bg-green-500' };
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (isDemoMode) {
      setError('Password cannot be changed in demo mode');
      return;
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    // Validate password strength
    const validationErrors = validatePassword(newPassword);
    if (validationErrors.length > 0) {
      setError(validationErrors[0]);
      return;
    }

    setIsLoading(true);

    try {
      // First, re-authenticate with current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });

      if (signInError) {
        throw new Error('Current password is incorrect');
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(newPassword);

  return (
    <CosPage>
      <div className="cos-page w-full">
        <CosPageHero
          eyebrow="Account"
          title="Settings."
          lede="Manage your profile and security."
          actions={
            <button
              type="button"
              onClick={() => navigate(backPath)}
              className="group inline-flex min-h-11 items-center gap-3 rounded-full bg-aryx-ink/[0.04] py-2.5 pl-5 pr-1.5 text-sm font-medium text-aryx-ink ring-1 ring-aryx-line transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
            >
              Back to Command
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-aryx-ink/5 text-xs">←</span>
            </button>
          }
        />

        {/* Profile Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-gray-400" />
            Profile Information
          </h2>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setNameError(null);
              setNameSuccess(null);
              if (isDemoMode) {
                setNameError('Profile cannot be changed in demo mode');
                return;
              }
              setSavingName(true);
              try {
                await updateProfileName(name);
                setNameSuccess('Name updated.');
              } catch (err) {
                setNameError(err instanceof Error ? err.message : 'Could not update name');
              } finally {
                setSavingName(false);
              }
            }}
          >
            <div className="flex items-center gap-3 p-3 sm:p-4 bg-gray-50 rounded-xl">
              <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                <p className="text-gray-900 font-medium text-sm sm:text-base truncate">
                  {user?.email || profile?.email || 'Not set'}
                </p>
                <p className="text-xs text-gray-400 mt-1">Sign-in email is managed by your login, not here.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 sm:p-4 bg-gray-50 rounded-xl">
              <User className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <label className="min-w-0 flex-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Name</p>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isDemoMode || savingName}
                  maxLength={80}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 disabled:opacity-50"
                />
              </label>
            </div>
            <div className="flex items-center gap-3 p-3 sm:p-4 bg-gray-50 rounded-xl">
              <Shield className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Role</p>
                <p className="text-gray-900 font-medium text-sm sm:text-base capitalize">
                  {profile?.role || 'Staff'}
                </p>
                <p className="text-xs text-gray-400 mt-1">Role is assigned by an owner. It cannot be changed here.</p>
              </div>
            </div>
            {nameError && (
              <p className="text-sm text-red-600">{nameError}</p>
            )}
            {nameSuccess && (
              <p className="text-sm text-emerald-700">{nameSuccess}</p>
            )}
            <button
              type="submit"
              disabled={isDemoMode || savingName || !name.trim()}
              className="rounded-xl bg-aryx-accent px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {savingName ? 'Saving…' : 'Save name'}
            </button>
          </form>
        </div>

        <SourceHealth />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-400" />
            Two-factor authentication
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Optional authenticator app. Login does not require it.
          </p>
          {mfaLoading ? (
            <p className="text-sm text-gray-500">Checking status…</p>
          ) : mfaEnabled ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-green-700">Authenticator is enabled on this account.</p>
              <button
                type="button"
                disabled={isDemoMode || mfaBusy || !mfaFactorId}
                onClick={async () => {
                  if (!mfaFactorId) return;
                  setMfaBusy(true);
                  const result = await unenrollMFA(mfaFactorId);
                  setMfaBusy(false);
                  if (result.success) {
                    await refreshMfa();
                    setSuccess('Two-factor authentication turned off');
                  } else {
                    setError(result.error || 'Could not turn off two-factor authentication');
                  }
                }}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 disabled:opacity-50"
              >
                {mfaBusy ? 'Turning off…' : 'Turn off'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={isDemoMode}
              onClick={() => setMfaOpen(true)}
              className="rounded-xl bg-aryx-accent px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Set up authenticator
            </button>
          )}
        </div>

        <MFAEnrollment
          isOpen={mfaOpen}
          onClose={() => setMfaOpen(false)}
          onSuccess={() => {
            void refreshMfa();
            setSuccess('Two-factor authentication enabled');
          }}
        />

        {/* Password Change Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-gray-400" />
            Change Password
          </h2>

          {isDemoMode && (
            <div className="mb-4 p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-800 font-medium text-sm">Demo Mode Active</p>
                <p className="text-amber-700 text-xs sm:text-sm">Password changes are disabled in demo mode.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-green-700 text-sm">{success}</p>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-5">
            {/* Current Password */}
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isDemoMode || isLoading}
                  className="
                    w-full px-4 py-3.5 pr-14 
                    border border-gray-200 rounded-xl 
                    focus:ring-2 focus:ring-sky-500 focus:border-transparent 
                    transition-all 
                    disabled:bg-gray-100 disabled:cursor-not-allowed
                    text-base min-h-[52px]
                  "
                  placeholder="Enter your current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="
                    absolute right-3 top-1/2 -translate-y-1/2 
                    p-2 rounded-lg
                    text-gray-400 hover:text-gray-600 hover:bg-gray-100
                    transition-colors touch-manipulation
                    min-h-[40px] min-w-[40px]
                    flex items-center justify-center
                  "
                >
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isDemoMode || isLoading}
                  className="
                    w-full px-4 py-3.5 pr-14 
                    border border-gray-200 rounded-xl 
                    focus:ring-2 focus:ring-sky-500 focus:border-transparent 
                    transition-all 
                    disabled:bg-gray-100 disabled:cursor-not-allowed
                    text-base min-h-[52px]
                  "
                  placeholder="Enter your new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="
                    absolute right-3 top-1/2 -translate-y-1/2 
                    p-2 rounded-lg
                    text-gray-400 hover:text-gray-600 hover:bg-gray-100
                    transition-colors touch-manipulation
                    min-h-[40px] min-w-[40px]
                    flex items-center justify-center
                  "
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${passwordStrength.color}`}
                        style={{ width: `${(passwordStrength.strength / 3) * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${
                      passwordStrength.strength === 1 ? 'text-red-500' :
                      passwordStrength.strength === 2 ? 'text-yellow-500' : 'text-green-500'
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <ul className="text-xs text-gray-500 space-y-1.5 mt-2">
                    <li className={`flex items-center gap-1.5 ${newPassword.length >= 8 ? 'text-green-600' : ''}`}>
                      <span className="w-4">{newPassword.length >= 8 ? '✓' : '○'}</span>
                      At least 8 characters
                    </li>
                    <li className={`flex items-center gap-1.5 ${/[A-Z]/.test(newPassword) ? 'text-green-600' : ''}`}>
                      <span className="w-4">{/[A-Z]/.test(newPassword) ? '✓' : '○'}</span>
                      One uppercase letter
                    </li>
                    <li className={`flex items-center gap-1.5 ${/[a-z]/.test(newPassword) ? 'text-green-600' : ''}`}>
                      <span className="w-4">{/[a-z]/.test(newPassword) ? '✓' : '○'}</span>
                      One lowercase letter
                    </li>
                    <li className={`flex items-center gap-1.5 ${/[0-9]/.test(newPassword) ? 'text-green-600' : ''}`}>
                      <span className="w-4">{/[0-9]/.test(newPassword) ? '✓' : '○'}</span>
                      One number
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isDemoMode || isLoading}
                  className={`
                    w-full px-4 py-3.5 pr-14 
                    border rounded-xl 
                    focus:ring-2 focus:ring-sky-500 focus:border-transparent 
                    transition-all 
                    disabled:bg-gray-100 disabled:cursor-not-allowed
                    text-base min-h-[52px]
                    ${confirmPassword && newPassword !== confirmPassword 
                      ? 'border-red-300 bg-red-50' 
                      : confirmPassword && newPassword === confirmPassword 
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-200'
                    }
                  `}
                  placeholder="Confirm your new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="
                    absolute right-3 top-1/2 -translate-y-1/2 
                    p-2 rounded-lg
                    text-gray-400 hover:text-gray-600 hover:bg-gray-100
                    transition-colors touch-manipulation
                    min-h-[40px] min-w-[40px]
                    flex items-center justify-center
                  "
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="mt-2 text-sm text-red-500">Passwords do not match</p>
              )}
              {confirmPassword && newPassword === confirmPassword && (
                <p className="mt-2 text-sm text-green-500 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Passwords match
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isDemoMode || isLoading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              className="
                w-full py-4 px-4 
                bg-aryx-accent
                text-white font-semibold rounded-xl 
                shadow-lg hover:shadow-xl 
                focus:ring-2 focus:ring-aryx-accent focus:ring-offset-2 
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg
                active:scale-[0.98]
                min-h-[52px]
                touch-manipulation
                text-sm sm:text-base
              "
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Updating Password...
                </span>
              ) : (
                'Update Password'
              )}
            </button>
          </form>
        </div>

        {/* Security Tips */}
        <div className="mt-4 sm:mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Security Tips</h3>
          <ul className="text-xs sm:text-sm text-blue-700 space-y-1.5">
            <li>• Use a unique password that you don't use for other accounts</li>
            <li>• Never share your password with anyone</li>
            <li>• Consider using a password manager</li>
            <li>• Change your password periodically for better security</li>
          </ul>
        </div>

        {/* Notification Settings */}
        <NotificationSettings className="mt-4 sm:mt-6" />

        {/* Sign Out Section */}
        <div className="mt-4 sm:mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <LogOut className="w-5 h-5 text-gray-400" />
            Sign Out
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Sign out of your account on this device. You will need to sign in again to access the dashboard.
          </p>
          <button
            onClick={async () => {
              try {
                await signOut();
                // signOut now handles the redirect internally
              } catch (error) {
                console.error('Error signing out:', error);
                // Fallback navigation if signOut fails
                window.location.href = '/login';
              }
            }}
            className="
              w-full py-4 px-4 
              bg-gradient-to-r from-red-500 to-red-600 
              text-white font-semibold rounded-xl 
              shadow-lg hover:shadow-xl 
              hover:from-red-600 hover:to-red-700 
              focus:ring-2 focus:ring-red-500 focus:ring-offset-2 
              transition-all duration-200
              active:scale-[0.98]
              min-h-[52px]
              touch-manipulation
              text-sm sm:text-base
              flex items-center justify-center gap-2
            "
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>
    </CosPage>
  );
}
