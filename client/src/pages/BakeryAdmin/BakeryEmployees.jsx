import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Trash2, Shield, ShieldCheck, Mail, CheckCircle, 
  AlertTriangle, RefreshCw, X, AlertCircle
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { employeeApi } from '@/services/api';

const BakeryEmployees = () => {
  const { account } = useAuth();
  const isAdmin = account?.role === 'bakery_admin' || account?.role === 'platform_admin';

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Add employee modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('bakery_staff');
  const [submitting, setSubmitting] = useState(false);

  // Revoke confirmation modal state
  const [employeeToRevoke, setEmployeeToRevoke] = useState(null);
  const [revoking, setRevoking] = useState(false);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await employeeApi.getEmployees();
      setEmployees(data.employees || []);
    } catch (err) {
      setError(err?.message || 'Failed to load bakery employees.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchEmployees();
    }
  }, [isAdmin]);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    try {
      setSubmitting(true);
      setError('');
      const res = await employeeApi.addEmployee(newEmail.trim(), newRole);
      setSuccessMessage(res.message || 'Employee added successfully!');
      setIsAddModalOpen(false);
      setNewEmail('');
      setNewRole('bakery_staff');
      fetchEmployees();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setError(err?.message || 'Failed to add employee.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeEmployee = async () => {
    if (!employeeToRevoke) return;

    try {
      setRevoking(true);
      setError('');
      const res = await employeeApi.removeEmployee(employeeToRevoke._id);
      setSuccessMessage(res.message || 'Employee access removed.');
      setEmployeeToRevoke(null);
      fetchEmployees();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setError(err?.message || 'Failed to revoke employee access.');
    } finally {
      setRevoking(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-200">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold">Access Restricted</h2>
          <p className="mt-2 text-sm text-red-600">
            Employee account moderation and access control is reserved for Bakery Administrators.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-pink-100 text-pink-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bakery Employee Management</h1>
              <p className="text-sm text-gray-500">
                Grant or revoke staff and manager access to your bakery workspace
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchEmployees}
            disabled={loading}
            className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition"
            title="Refresh employees"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              setError('');
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-medium rounded-xl shadow-sm transition"
          >
            <UserPlus className="w-5 h-5" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-3 p-4 bg-green-50 text-green-800 rounded-xl border border-green-200">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 text-red-800 rounded-xl border border-red-200">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-pink-50 text-pink-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{employees.length}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Staff & Admins</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {employees.filter(e => e.role === 'bakery_staff').length}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Bakery Staff Members</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {employees.filter(e => e.role === 'bakery_admin' || e.role === 'platform_admin').length}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Bakery Admins</div>
          </div>
        </div>
      </div>

      {/* Role Breakdown Reference Card */}
      <div className="bg-gradient-to-r from-pink-50 to-white p-5 rounded-2xl border border-pink-100 text-xs sm:text-sm text-gray-700 space-y-2">
        <div className="font-bold text-pink-800 flex items-center gap-2">
          <Shield className="w-4 h-4 text-pink-600" />
          Role Authority Matrix
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div className="bg-white/80 p-3 rounded-xl border border-pink-100">
            <span className="font-semibold text-gray-900">Bakery Staff (Employee):</span>
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-gray-600">
              <li>Order & Reservation Management</li>
              <li>Customer Chat & Communication</li>
              <li>3D Blueprint Inspection</li>
              <li>Cake Template Management</li>
              <li>Account Moderation (Flags & Reviews)</li>
              <li className="text-amber-700 font-medium">Read-only live pricing (no rate changes)</li>
            </ul>
          </div>
          <div className="bg-white/80 p-3 rounded-xl border border-pink-100">
            <span className="font-semibold text-gray-900">Bakery Admin (Owner / Platform Admin):</span>
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-gray-600">
              <li>Everything Bakery Staff can do</li>
              <li className="text-pink-700 font-semibold">Full Price & Rate Control (Drafts, Schedules)</li>
              <li className="text-pink-700 font-semibold">Financial & Billing Overview</li>
              <li className="text-pink-700 font-semibold">Store Profile Management</li>
              <li className="text-pink-700 font-semibold">Employee Email Access Grant & Revocation</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Employee List Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-800 text-lg">Active Bakery Accounts</h2>
          <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
            {employees.length} Members
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-pink-500" />
            <p className="text-sm">Loading staff directory...</p>
          </div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Users className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            <p className="text-base font-medium text-gray-600">No employee accounts found</p>
            <p className="text-xs text-gray-400 mt-1">Use "Add Employee" above to grant staff access by email.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">User</th>
                  <th className="py-3.5 px-6">Email</th>
                  <th className="py-3.5 px-6">Role</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {employees.map((emp) => {
                  const isCurrentSelf = String(account?._id) === String(emp._id);
                  const isStaff = emp.role === 'bakery_staff';
                  return (
                    <tr key={emp._id} className="hover:bg-pink-50/20 transition">
                      <td className="py-4 px-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 font-bold flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {emp.photoURL ? (
                            <img src={emp.photoURL} alt={emp.displayName} className="w-full h-full object-cover" />
                          ) : (
                            (emp.displayName?.[0] || emp.email?.[0] || 'U').toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 flex items-center gap-2">
                            <span>{emp.displayName || 'No Name'}</span>
                            {isCurrentSelf && (
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">ID: {emp._id.slice(-6)}</div>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span>{emp.email}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isStaff
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {isStaff ? <Shield className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                          {isStaff ? 'Bakery Staff' : 'Bakery Admin'}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          {emp.status || 'Active'}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        {isCurrentSelf ? (
                          <span className="text-xs text-gray-400 italic">Current Session</span>
                        ) : (
                          <button
                            onClick={() => setEmployeeToRevoke(emp)}
                            className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-semibold hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition"
                            title="Revoke employee access"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Revoke Access</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-pink-100 text-pink-600 rounded-lg">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">Grant Employee Access</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Employee Email Address
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="employee@cakenmake.com"
                    className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  The user must already have a registered CakeNMake customer account with this email.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Select Role & Permissions
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`cursor-pointer p-3 rounded-xl border flex flex-col items-start gap-1 transition ${
                      newRole === 'bakery_staff'
                        ? 'border-pink-500 bg-pink-50/50 ring-2 ring-pink-500/20'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="bakery_staff"
                      checked={newRole === 'bakery_staff'}
                      onChange={() => setNewRole('bakery_staff')}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-1.5 font-bold text-gray-900 text-sm">
                      <Shield className="w-4 h-4 text-blue-600" />
                      Staff
                    </div>
                    <span className="text-[11px] text-gray-500 leading-tight">
                      Orders, chats, templates, blueprints, read-only pricing.
                    </span>
                  </label>

                  <label
                    className={`cursor-pointer p-3 rounded-xl border flex flex-col items-start gap-1 transition ${
                      newRole === 'bakery_admin'
                        ? 'border-pink-500 bg-pink-50/50 ring-2 ring-pink-500/20'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="bakery_admin"
                      checked={newRole === 'bakery_admin'}
                      onChange={() => setNewRole('bakery_admin')}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-1.5 font-bold text-gray-900 text-sm">
                      <ShieldCheck className="w-4 h-4 text-purple-600" />
                      Admin
                    </div>
                    <span className="text-[11px] text-gray-500 leading-tight">
                      Full authority: rates, billing, profile & employee moderation.
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-semibold bg-pink-600 hover:bg-pink-700 text-white rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Granting Access...' : 'Confirm & Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revoke Confirmation Modal */}
      {employeeToRevoke && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 bg-red-100 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">Revoke Employee Access?</h3>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              Are you sure you want to revoke bakery access for{' '}
              <strong className="text-gray-900">{employeeToRevoke.displayName || employeeToRevoke.email}</strong>?
              They will be converted back to a regular customer account and will no longer have access to the bakery dashboard.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setEmployeeToRevoke(null)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevokeEmployee}
                disabled={revoking}
                className="px-5 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {revoking ? 'Revoking...' : 'Yes, Revoke Access'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BakeryEmployees;
