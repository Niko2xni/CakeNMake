import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Cake, Send, User } from 'lucide-react';
import CustomScrollbar from '@/components/shared/CustomScrollbar';

const BAKERY_NAME = 'Mamshie Bakery';

const seedConversations = [
  {
    id: 1,
    customerName: 'Maria Santos',
    lastMessage: 'Thank you! See you on Saturday.',
    lastTime: '10:20 AM',
    unread: 0,
    status: 'confirmed',
    messages: [
      { id: 1, sender: 'bakery', text: 'Hi Maria! Your reservation has been confirmed. 🎂 We\'ll have your cake ready by 2:00 PM Saturday.', time: '9:50 AM' },
      { id: 2, sender: 'customer', text: 'That\'s great! Can we confirm the design is still ube with mango filling?', time: '10:00 AM' },
      { id: 3, sender: 'bakery', text: 'Yes, confirmed — ube cake, mango filling, whipped cream frosting, and candy flowers on top.', time: '10:10 AM' },
      { id: 4, sender: 'customer', text: 'Thank you! See you on Saturday.', time: '10:20 AM' },
    ],
  },
  {
    id: 2,
    customerName: 'Jose Reyes',
    lastMessage: 'Can I change the pickup time?',
    lastTime: '9:05 AM',
    unread: 1,
    status: 'in_production',
    messages: [
      { id: 1, sender: 'bakery', text: 'Hi Jose! Your cake is currently in production. Pickup is confirmed for Friday at 2:00 PM.', time: '8:00 AM' },
      { id: 2, sender: 'customer', text: 'Can I change the pickup time?', time: '9:05 AM' },
    ],
  },
  {
    id: 3,
    customerName: 'Ana Cruz',
    lastMessage: 'How many tiers does it have?',
    lastTime: 'Yesterday',
    unread: 0,
    status: 'completed',
    messages: [
      { id: 1, sender: 'customer', text: 'How many tiers does it have?', time: 'Yesterday' },
      { id: 2, sender: 'bakery', text: 'Your cake has two tiers — 8x5 base and 6x5 top, chocolate flavor with strawberry frosting.', time: 'Yesterday' },
      { id: 3, sender: 'customer', text: 'Perfect, thanks!', time: 'Yesterday' },
    ],
  },
];

const STATUS_META = {
  pending_payment: { label: 'Awaiting Payment', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_production: { label: 'In Production', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  completed: { label: 'Completed', color: 'bg-green-50 text-green-700 border-green-200' },
};

export default function BakeryChat() {
  const [conversations, setConversations] = useState(seedConversations);
  const [activeId, setActiveId] = useState(null);
  const [inputText, setInputText] = useState('');
  const bottomRef = useRef(null);

  const active = conversations.find((c) => c.id === activeId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [active?.messages?.length]);

  function selectConversation(id) {
    setActiveId(id);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c))
    );
  }

  function sendMessage() {
    const text = inputText.trim();
    if (!text || !activeId) return;
    const newMsg = {
      id: Date.now(),
      sender: 'bakery',
      text,
      time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    };
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? { ...c, messages: [...c.messages, newMsg], lastMessage: text, lastTime: newMsg.time }
          : c
      )
    );
    setInputText('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
  }

  return (
    <div className={`cn-bakery-chat flex h-full gap-4 ${active ? 'has-active-chat' : ''}`}>
      {/* Inbox list */}
      <div className="cn-bakery-chat-list w-72 flex-shrink-0 rounded-2xl border border-pink-100 shadow-xl bg-white flex flex-col overflow-hidden">
        <header className="flex-shrink-0 border-b border-pink-100 px-4 py-3">
          <h1 className="font-bold text-gray-900">Customer Chats</h1>
          <p className="text-xs text-gray-500">Post-reservation messages</p>
        </header>

        <CustomScrollbar className="flex-1">
          {conversations.map((c) => {
            const meta = STATUS_META[c.status] || STATUS_META.confirmed;
            return (
              <button
                key={c.id}
                onClick={() => selectConversation(c.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-pink-50 ${
                  activeId === c.id ? 'bg-pink-50/60' : 'hover:bg-pink-50/40'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.customerName}</p>
                    <p className="text-[10px] text-gray-400 flex-shrink-0 ml-1">{c.lastTime}</p>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{c.lastMessage}</p>
                  <span className={`inline-block mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${meta.color}`}>
                    {meta.label}
                  </span>
                </div>
                {c.unread > 0 && (
                  <span className="w-5 h-5 rounded-full bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {c.unread}
                  </span>
                )}
              </button>
            );
          })}
        </CustomScrollbar>
      </div>

      {/* Thread */}
      <div className="cn-bakery-chat-thread flex-1 min-w-0 rounded-2xl border border-pink-100 shadow-xl bg-white flex flex-col overflow-hidden">
        {!active ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center px-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 flex items-center justify-center">
                <Cake className="w-8 h-8 text-white" />
              </div>
              <p className="text-sm text-gray-500 max-w-xs">
                Select a conversation from the left to start messaging.
              </p>
            </div>
          </div>
        ) : (
          <>
            <header className="flex-shrink-0 border-b border-pink-100 px-6 py-3 flex items-center gap-3">
              <button type="button" className="cn-bakery-chat-back" aria-label="Back to conversations" onClick={() => setActiveId(null)}>
                <ArrowLeft />
              </button>
              <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{active.customerName}</p>
                <p className="text-xs text-gray-500">{STATUS_META[active.status]?.label || active.status}</p>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-4 bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              <div className="space-y-2">
                {active.messages.map((m) => {
                  const isBakery = m.sender === 'bakery';
                  return (
                    <div key={m.id} className={`flex ${isBakery ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[60%] px-4 py-2 rounded-2xl text-sm ${
                        isBakery
                          ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white'
                          : 'bg-white text-gray-800 shadow-sm border border-pink-100'
                      }`}>
                        {m.text}
                        <p className={`text-[10px] mt-1 ${isBakery ? 'text-white/70 text-right' : 'text-gray-400'}`}>
                          {m.time}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            </div>

            <div className="flex-shrink-0 border-t border-pink-100 bg-white/95 px-4 py-3 flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${active.customerName}`}
                className="flex-1 px-4 py-2.5 rounded-full bg-pink-50/70 border border-pink-100 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
              />
              <button
                onClick={sendMessage}
                disabled={!inputText.trim()}
                aria-label="Send"
                className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white flex items-center justify-center hover:from-pink-600 hover:to-rose-600 transition-colors disabled:opacity-40"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
