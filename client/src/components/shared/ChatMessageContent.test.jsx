import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import ChatMessageContent from './ChatMessageContent';

afterEach(cleanup);
const url = 'https://res.cloudinary.com/test/image/upload/v123/cakenmake/chat-attachments/conversation-1/111111111111111111111111/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.png';
it('displays Cloudinary attachments for their conversation', () => {
  render(<ChatMessageContent text={`Image: ${url}`} conversationId="conversation-1" />);
  expect(screen.getByRole('img')).toHaveAttribute('src', url);
});
it('does not embed attachments belonging to another conversation', () => {
  render(<ChatMessageContent text={`Image: ${url}`} conversationId="conversation-2" />);
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  expect(screen.getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer');
});
