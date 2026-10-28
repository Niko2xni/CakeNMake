import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import BakeryChat from './BakeryChat';
import BakeryChatOverview from './BakeryChatOverview';
import BakeryTeamChat from './BakeryTeamChat';

export default function BakeryChatsSection() {
  const [params] = useSearchParams();
  const tab = params.get('tab') || 'overview';
  const isMessages = tab === 'messages';
  const isTeam = tab === 'team';
  const isOverview = !isMessages && !isTeam;

  return (
    <div className="cn-bakery-chats-section h-full min-h-0 flex flex-col gap-2">
      <nav aria-label="Chat sections" className="flex shrink-0 gap-2 rounded-xl bg-white border border-pink-100 p-2">
        <Link
          to="/bakery/chats"
          aria-current={isOverview ? 'page' : undefined}
          className={`min-h-11 flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium ${
            isOverview ? 'bg-pink-600 text-white' : 'text-gray-600 hover:bg-pink-50'
          }`}
        >
          Overview
        </Link>
        <Link
          to="/bakery/chats?tab=messages"
          aria-current={isMessages ? 'page' : undefined}
          className={`min-h-11 flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium ${
            isMessages ? 'bg-pink-600 text-white' : 'text-gray-600 hover:bg-pink-50'
          }`}
        >
          Messages
        </Link>
        <Link
          to="/bakery/chats?tab=team"
          aria-current={isTeam ? 'page' : undefined}
          className={`min-h-11 flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium ${
            isTeam ? 'bg-pink-600 text-white' : 'text-gray-600 hover:bg-pink-50'
          }`}
        >
          Team Chat
        </Link>
      </nav>
      <div className="flex-1 min-h-0">
        {isMessages ? <BakeryChat /> : isTeam ? <BakeryTeamChat /> : <BakeryChatOverview />}
      </div>
    </div>
  );
}
