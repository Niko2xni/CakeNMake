import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/AuthContext';

export default function useLogout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout(false);
      navigate('/login', { replace: true });
    } catch {
      toast.error('Could not log out. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };
  return { handleLogout, isLoggingOut };
}
