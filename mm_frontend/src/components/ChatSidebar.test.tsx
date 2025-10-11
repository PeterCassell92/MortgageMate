import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import '@testing-library/jest-dom';
import ChatSidebar from './ChatSidebar';
import { ChatService, ChatSummary } from '../services/chatService';

// Mock the ChatService
jest.mock('../services/chatService');
const mockChatService = ChatService as jest.MockedClass<typeof ChatService>;

// Mock error context
jest.mock('../contexts/ErrorContext', () => ({
  useError: () => ({ handleNetworkError: jest.fn() })
}));

// Mock useMediaQuery for responsive testing
let mockIsMobile = false;
jest.mock('@mui/material', () => ({
  ...jest.requireActual('@mui/material'),
  useMediaQuery: () => mockIsMobile
}));

describe('ChatSidebar', () => {
  const theme = createTheme();

  // Helper function to wrap component with theme
  const renderWithTheme = (ui: React.ReactElement) => {
    return render(
      <ThemeProvider theme={theme}>
        {ui}
      </ThemeProvider>
    );
  };

  // Sample chat data
  const mockChats: ChatSummary[] = [
    {
      numericalId: 1,
      title: 'Chat 1',
      updatedAt: new Date().toISOString(),
      lastViewed: new Date().toISOString()
    },
    {
      numericalId: 2,
      title: 'Chat 2',
      updatedAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      lastViewed: new Date(Date.now() - 86400000).toISOString()
    },
    {
      numericalId: 3,
      title: 'Chat 3',
      updatedAt: new Date(Date.now() - 604800000).toISOString(), // Week ago
      lastViewed: new Date(Date.now() - 604800000).toISOString()
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsMobile = false;

    // Default mock setup
    mockChatService.getInstance = jest.fn().mockReturnValue({
      getChatList: jest.fn().mockResolvedValue({
        success: true,
        data: { chats: mockChats }
      }),
      createNewChat: jest.fn(),
      deleteChat: jest.fn().mockResolvedValue({ success: true })
    });
  });

  describe('Initial Load', () => {
    it('should display loading state initially', () => {
      renderWithTheme(<ChatSidebar onChatSelect={jest.fn()} />);
      expect(screen.getByText('Loading chats...')).toBeInTheDocument();
    });

    it('should load and display chat list on mount', async () => {
      renderWithTheme(<ChatSidebar onChatSelect={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Chat 1')).toBeInTheDocument();
        expect(screen.getByText('Chat 2')).toBeInTheDocument();
        expect(screen.getByText('Chat 3')).toBeInTheDocument();
      });
    });

    it('should display empty state when no chats', async () => {
      mockChatService.getInstance = jest.fn().mockReturnValue({
        getChatList: jest.fn().mockResolvedValue({
          success: true,
          data: { chats: [] }
        })
      });

      renderWithTheme(<ChatSidebar onChatSelect={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('No chats yet. Create your first chat!')).toBeInTheDocument();
      });
    });

    it('should handle loading errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockChatService.getInstance = jest.fn().mockReturnValue({
        getChatList: jest.fn().mockRejectedValue(new Error('Connection failed'))
      });

      renderWithTheme(<ChatSidebar onChatSelect={jest.fn()} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading chats...')).not.toBeInTheDocument();
      });

      consoleError.mockRestore();
    });
  });

  describe('Chat Selection', () => {
    it('should highlight selected chat', async () => {
      renderWithTheme(
        <ChatSidebar onChatSelect={jest.fn()} currentChatId={2} />
      );

      await waitFor(() => {
        const chat2Button = screen.getByRole('button', { name: /Chat 2/i });
        expect(chat2Button.parentElement).toHaveClass('Mui-selected');
      });
    });

    it('should call onChatSelect when chat is clicked', async () => {
      const onChatSelect = jest.fn();
      renderWithTheme(<ChatSidebar onChatSelect={onChatSelect} />);

      await waitFor(() => screen.getByText('Chat 1'));

      const chatButton = screen.getByText('Chat 1');
      fireEvent.click(chatButton);

      expect(onChatSelect).toHaveBeenCalledWith(1);
    });

    it('should update selected chat when currentChatId changes', async () => {
      const { rerender } = renderWithTheme(
        <ThemeProvider theme={theme}>
          <ChatSidebar onChatSelect={jest.fn()} currentChatId={1} />
        </ThemeProvider>
      );

      await waitFor(() => screen.getByText('Chat 1'));

      let selectedButton = screen.getByRole('button', { name: /Chat 1/i });
      expect(selectedButton.parentElement).toHaveClass('Mui-selected');

      rerender(
        <ThemeProvider theme={theme}>
          <ChatSidebar onChatSelect={jest.fn()} currentChatId={2} />
        </ThemeProvider>
      );

      selectedButton = screen.getByRole('button', { name: /Chat 2/i });
      expect(selectedButton.parentElement).toHaveClass('Mui-selected');
    });
  });

  describe('New Chat Creation', () => {
    it('should create new chat when New Chat button clicked', async () => {
      const onChatSelect = jest.fn();
      mockChatService.getInstance = jest.fn().mockReturnValue({
        getChatList: jest.fn().mockResolvedValue({
          success: true,
          data: { chats: mockChats }
        }),
        createNewChat: jest.fn().mockResolvedValue({
          success: true,
          data: { numericalId: 4 }
        }),
        deleteChat: jest.fn()
      });

      renderWithTheme(<ChatSidebar onChatSelect={onChatSelect} />);

      await waitFor(() => screen.getByText('New Chat'));

      const newChatButton = screen.getByRole('button', { name: /New Chat/i });
      await userEvent.click(newChatButton);

      await waitFor(() => {
        expect(onChatSelect).toHaveBeenCalledWith(4);
      });
    });

    it('should reload chat list after creating new chat', async () => {
      const getChatListMock = jest.fn()
        .mockResolvedValueOnce({
          success: true,
          data: { chats: mockChats }
        })
        .mockResolvedValueOnce({
          success: true,
          data: { chats: [...mockChats, { numericalId: 4, title: 'Chat 4' }] }
        });

      mockChatService.getInstance = jest.fn().mockReturnValue({
        getChatList: getChatListMock,
        createNewChat: jest.fn().mockResolvedValue({
          success: true,
          data: { numericalId: 4 }
        }),
        deleteChat: jest.fn()
      });

      renderWithTheme(<ChatSidebar onChatSelect={jest.fn()} />);

      await waitFor(() => screen.getByText('New Chat'));

      const newChatButton = screen.getByRole('button', { name: /New Chat/i });
      await userEvent.click(newChatButton);

      await waitFor(() => {
        expect(getChatListMock).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Chat Deletion', () => {
    it('should delete chat when delete menu item clicked', async () => {
      const deleteChatMock = jest.fn().mockResolvedValue({ success: true });
      mockChatService.getInstance = jest.fn().mockReturnValue({
        getChatList: jest.fn().mockResolvedValue({
          success: true,
          data: { chats: mockChats }
        }),
        createNewChat: jest.fn(),
        deleteChat: deleteChatMock
      });

      renderWithTheme(<ChatSidebar onChatSelect={jest.fn()} />);

      await waitFor(() => screen.getByText('Chat 1'));

      // Find and click the more menu button for the first chat
      const moreButtons = screen.getAllByRole('button', { name: '' }).filter(
        button => button.querySelector('svg[data-testid="MoreVertIcon"]')
      );

      fireEvent.click(moreButtons[0]);

      // Click delete in the menu
      const deleteMenuItem = await screen.findByText('Delete Chat');
      fireEvent.click(deleteMenuItem);

      await waitFor(() => {
        expect(deleteChatMock).toHaveBeenCalledWith(1);
      });
    });

    it('should reload chat list after deletion', async () => {
      const getChatListMock = jest.fn()
        .mockResolvedValueOnce({
          success: true,
          data: { chats: mockChats }
        })
        .mockResolvedValueOnce({
          success: true,
          data: { chats: mockChats.filter(c => c.numericalId !== 1) }
        });

      mockChatService.getInstance = jest.fn().mockReturnValue({
        getChatList: getChatListMock,
        createNewChat: jest.fn(),
        deleteChat: jest.fn().mockResolvedValue({ success: true })
      });

      renderWithTheme(<ChatSidebar onChatSelect={jest.fn()} />);

      await waitFor(() => screen.getByText('Chat 1'));

      // Open menu and delete
      const moreButtons = screen.getAllByRole('button', { name: '' }).filter(
        button => button.querySelector('svg[data-testid="MoreVertIcon"]')
      );
      fireEvent.click(moreButtons[0]);

      const deleteMenuItem = await screen.findByText('Delete Chat');
      fireEvent.click(deleteMenuItem);

      await waitFor(() => {
        expect(getChatListMock).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Date Formatting', () => {
    it('should format dates correctly', async () => {
      renderWithTheme(<ChatSidebar onChatSelect={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Today')).toBeInTheDocument();
        expect(screen.getByText('Yesterday')).toBeInTheDocument();
        expect(screen.getByText('6 days ago')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Behavior', () => {
    beforeEach(() => {
      mockIsMobile = true;
    });

    it('should render as drawer on mobile', () => {
      renderWithTheme(
        <ChatSidebar
          onChatSelect={jest.fn()}
          mobileOpen={true}
          onMobileClose={jest.fn()}
        />
      );

      // Check for drawer-specific elements
      const drawer = document.querySelector('.MuiDrawer-root');
      expect(drawer).toBeInTheDocument();
    });

    it('should call onMobileClose when close button clicked', async () => {
      const onMobileClose = jest.fn();
      renderWithTheme(
        <ChatSidebar
          onChatSelect={jest.fn()}
          mobileOpen={true}
          onMobileClose={onMobileClose}
        />
      );

      await waitFor(() => screen.getByText('Chats'));

      const closeButton = screen.getByRole('button', { name: '' }).parentElement?.querySelector('[data-testid="CloseIcon"]')?.parentElement;
      if (closeButton) {
        fireEvent.click(closeButton);
        expect(onMobileClose).toHaveBeenCalled();
      }
    });

    it('should close drawer after chat selection on mobile', async () => {
      const onMobileClose = jest.fn();
      renderWithTheme(
        <ChatSidebar
          onChatSelect={jest.fn()}
          mobileOpen={true}
          onMobileClose={onMobileClose}
        />
      );

      await waitFor(() => screen.getByText('Chat 1'));

      fireEvent.click(screen.getByText('Chat 1'));
      expect(onMobileClose).toHaveBeenCalled();
    });
  });

  describe('useMemo for currentTitle', () => {
    it('should compute currentTitle correctly', async () => {
      const { rerender } = renderWithTheme(
        <ThemeProvider theme={theme}>
          <ChatSidebar onChatSelect={jest.fn()} currentChatId={2} />
        </ThemeProvider>
      );

      await waitFor(() => screen.getByText('Chat 2'));

      // Verify Chat 2 is selected
      const chat2Button = screen.getByRole('button', { name: /Chat 2/i });
      expect(chat2Button.parentElement).toHaveClass('Mui-selected');

      // Change to Chat 1
      rerender(
        <ThemeProvider theme={theme}>
          <ChatSidebar onChatSelect={jest.fn()} currentChatId={1} />
        </ThemeProvider>
      );

      const chat1Button = screen.getByRole('button', { name: /Chat 1/i });
      expect(chat1Button.parentElement).toHaveClass('Mui-selected');
    });

    it('should handle non-existent chat ID gracefully', async () => {
      renderWithTheme(
        <ChatSidebar onChatSelect={jest.fn()} currentChatId={999} />
      );

      await waitFor(() => screen.getByText('Chat 1'));

      // Should not crash, no chat should be selected
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        if (button.parentElement?.classList.contains('MuiListItemButton-root')) {
          expect(button.parentElement).not.toHaveClass('Mui-selected');
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during chat creation', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockChatService.getInstance = jest.fn().mockReturnValue({
        getChatList: jest.fn().mockResolvedValue({
          success: true,
          data: { chats: mockChats }
        }),
        createNewChat: jest.fn().mockRejectedValue(new Error('Connection failed')),
        deleteChat: jest.fn()
      });

      renderWithTheme(<ChatSidebar onChatSelect={jest.fn()} />);

      await waitFor(() => screen.getByText('New Chat'));

      const newChatButton = screen.getByRole('button', { name: /New Chat/i });
      await userEvent.click(newChatButton);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to create new chat:',
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });

    it('should handle errors during chat deletion', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockChatService.getInstance = jest.fn().mockReturnValue({
        getChatList: jest.fn().mockResolvedValue({
          success: true,
          data: { chats: mockChats }
        }),
        createNewChat: jest.fn(),
        deleteChat: jest.fn().mockRejectedValue(new Error('Delete failed'))
      });

      renderWithTheme(<ChatSidebar onChatSelect={jest.fn()} />);

      await waitFor(() => screen.getByText('Chat 1'));

      const moreButtons = screen.getAllByRole('button', { name: '' }).filter(
        button => button.querySelector('svg[data-testid="MoreVertIcon"]')
      );
      fireEvent.click(moreButtons[0]);

      const deleteMenuItem = await screen.findByText('Delete Chat');
      fireEvent.click(deleteMenuItem);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to delete chat:',
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });
  });
});