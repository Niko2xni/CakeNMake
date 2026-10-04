import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import BakeryChat from './BakeryChat';
import BakeryChatOverview from './BakeryChatOverview';

export default function BakeryChatsSection() {
  const [params] = useSearchParams();
  const messages = params.get('tab') === 'messages';
  return <div className="cn-bakery-chats-section h-full min-h-0 flex flex-col gap-3">
    <nav aria-label="Chat sections" className="flex shrink-0 gap-2 rounded-xl bg-white border border-pink-100 p-2">
      <Link to="/bakery/chats" aria-current={!messages ? 'page' : undefined} className={`px-4 py-2 rounded-lg text-sm font-medium ${!messages ? 'bg-pink-600 text-white' : 'text-gray-600'}`}>Overview</Link>
      <Link to="/bakery/chats?tab=messages" aria-current={messages ? 'page' : undefined} className={`px-4 py-2 rounded-lg text-sm font-medium ${messages ? 'bg-pink-600 text-white' : 'text-gray-600'}`}>Messages</Link>
    </nav>
    <div className="flex-1 min-h-0">{messages ? <BakeryChat /> : <BakeryChatOverview />}</div>
  </div>;
}
