import { useState, useEffect } from 'react';
import { Notification } from '@/types/cam';

const mockNotifications: Notification[] = [
  {
    id: 'n1',
    type: 'document',
    title: 'Document Pending Review',
    message: 'Annual Report for Tata Steel requires classification approval.',
    read: false,
    createdAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'n2',
    type: 'extraction',
    title: 'Extraction Error',
    message: 'Low confidence fields detected in ALM Report extraction.',
    read: false,
    createdAt: '2024-01-15T09:45:00Z',
  },
  {
    id: 'n3',
    type: 'research',
    title: 'Research Alert',
    message: 'Negative sentiment detected: Chinese steel dumping article.',
    read: false,
    createdAt: '2024-01-14T16:00:00Z',
  },
  {
    id: 'n4',
    type: 'risk',
    title: 'Risk Score Updated',
    message: 'Risk score for Adani Green Energy changed from 52 to 45.',
    read: true,
    createdAt: '2024-01-14T12:00:00Z',
  },
  {
    id: 'n5',
    type: 'document',
    title: 'Documents Uploaded',
    message: 'Reliance Industries uploaded 3 new documents.',
    read: true,
    createdAt: '2024-01-13T14:30:00Z',
  },
];

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 400));
      setNotifications(mockNotifications);
      setIsLoading(false);
    };
    fetchNotifications();
  }, []);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, isLoading, markAsRead, unreadCount };
}
