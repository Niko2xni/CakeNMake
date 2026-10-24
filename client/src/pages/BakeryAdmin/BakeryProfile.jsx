import React, { useState } from 'react';
import { Store, Clock, MapPin, Mail, Check, Pencil, Lock } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const initialProfile = {
  name: 'AH TINAPS BAKESHOP',
  email: 'ahtinapsbakeshop@example.com',
  address: 'Metro Manila, Philippines',
  hoursOfOperation: 'Monday – Saturday, 8:00 AM – 6:00 PM',
  description: 'Specializing in personalized 3D custom cakes and pastries for any occasion.',
};

export default function BakeryProfile() {
  const [profile, setProfile] = useState(initialProfile);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialProfile);
  const [saved, setSaved] = useState(false);

  function startEdit() {
    setDraft(profile);
    setEditing(true);
    setSaved(false);
  }

  function saveEdit() {
    setProfile(draft);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function cancelEdit() {
    setEditing(false);
    setDraft(profile);
  }

  const fields = [
    { key: 'name', label: 'Bakery Name', icon: Store },
    { key: 'email', label: 'Contact Email', icon: Mail },
    { key: 'address', label: 'Address', icon: MapPin },
    { key: 'hoursOfOperation', label: 'Hours of Operation', icon: Clock },
    { key: 'description', label: 'Description', icon: Store, multiline: true },
  ];

  const { account } = useAuth();
  const isAdmin = account?.role === 'bakery_admin' || account?.role === 'platform_admin';

  return (
    <div className="h-full rounded-2xl border border-pink-100 shadow-xl bg-white flex flex-col overflow-hidden">
      <header className="flex-shrink-0 border-b border-pink-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Branch Profile</h1>
          <p className="text-sm text-gray-500">Information displayed to customers</p>
        </div>
        {!isAdmin ? (
          <div className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-gray-500">
            <Lock className="w-3.5 h-3.5" />
            Read-Only (Bakery Staff)
          </div>
        ) : !editing ? (
          <button
            onClick={startEdit}
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full border border-pink-200 text-pink-600 hover:bg-pink-50 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Edit Profile
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={cancelEdit}
              className="text-sm px-4 py-2 rounded-full border border-pink-100 text-gray-600 hover:bg-pink-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveEdit}
              className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full bg-pink-500 text-white hover:bg-pink-600 transition-colors"
            >
              <Check className="w-4 h-4" />
              Save
            </button>
          </div>
        )}
      </header>

      {saved && (
        <div className="flex-shrink-0 px-6 py-2 bg-green-50 border-b border-green-100">
          <p className="text-sm text-green-700 flex items-center gap-1.5">
            <Check className="w-4 h-4" />
            Profile saved successfully.
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        <div className="flex items-center gap-4 pb-5 border-b border-pink-100">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 flex items-center justify-center flex-shrink-0">
            <Store className="w-9 h-9 text-white" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{profile.name}</p>
            <p className="text-sm text-gray-500">{profile.address}</p>
            <span className="inline-flex items-center gap-1 mt-1 text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Single location · Active
            </span>
          </div>
        </div>

        {fields.map(({ key, label, icon: Icon, multiline }) => (
          <div key={key}>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5">
              <Icon className="w-3.5 h-3.5 text-pink-400" />
              {label}
            </label>
            {editing ? (
              multiline ? (
                <textarea
                  value={draft[key]}
                  onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-pink-200 text-sm text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 resize-none"
                />
              ) : (
                <input
                  type="text"
                  value={draft[key]}
                  onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-pink-200 text-sm text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                />
              )
            ) : (
              <p className="text-sm text-gray-800 bg-pink-50/40 rounded-xl px-4 py-2.5">{profile[key]}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
