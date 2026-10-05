import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/AuthContext';

export default function useLogout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutConfirmationOpen, setLogoutConfirmationOpen] = useState(false);
  const pending = useRef(false);
  const requestLogout = () => { if (!pending.current) setLogoutConfirmationOpen(true); };
  const changeLogoutConfirmation = open => { if (!pending.current) setLogoutConfirmationOpen(open); };
  const handleLogout = async () => {
    if (pending.current) return;
    pending.current = true;
    setIsLoggingOut(true);
    try {
      await logout(false);
      navigate('/login', { replace: true });
    } catch {
      toast.error('Could not log out. Please try again.');
    } finally {
      pending.current = false;
      setIsLoggingOut(false);
      setLogoutConfirmationOpen(false);
    }
  };
  return { handleLogout, requestLogout, isLoggingOut, logoutConfirmationOpen, changeLogoutConfirmation };
}
