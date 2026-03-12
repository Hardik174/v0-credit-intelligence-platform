'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';
import {
  LayoutDashboard,
  Building2,
  FilePlus2,
  FileStack,
  TableProperties,
  Blocks,
  Newspaper,
  ShieldAlert,
  FileText,
  Bot,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  UserPlus,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Entities', href: '/entities', icon: Building2 },
  { label: 'New Assessment', href: '/new-assessment', icon: FilePlus2 },
  { label: 'Onboarding', href: '/onboarding', icon: UserPlus },
  { label: 'Analysis Results', href: '/results', icon: BarChart3 },
  { label: 'Documents', href: '/documents', icon: FileStack },
  { label: 'Extraction Review', href: '/extraction', icon: TableProperties },
  { label: 'Schema Builder', href: '/schema-builder', icon: Blocks },
  { label: 'Research Insights', href: '/research', icon: Newspaper },
  { label: 'Risk Engine', href: '/risk-engine', icon: ShieldAlert },
  { label: 'CAM Report', href: '/cam-report', icon: FileText },
  { label: 'AI Assistant', href: '/ai-assistant', icon: Bot },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200 flex flex-col sidebar-transition',
          sidebarOpen ? 'w-64' : 'w-[68px]'
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-white" />
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden">
                <h1 className="text-sm font-bold text-gray-900 whitespace-nowrap">
                  Credit Intelligence
                </h1>
                <p className="text-[10px] text-gray-500 whitespace-nowrap">Platform</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;

            const linkContent = (
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 flex-shrink-0',
                    isActive ? 'text-blue-600' : 'text-gray-400'
                  )}
                />
                {sidebarOpen && <span className="whitespace-nowrap">{item.label}</span>}
              </Link>
            );

            if (!sidebarOpen) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" className="ml-2">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <div key={item.href}>{linkContent}</div>;
          })}
        </nav>

        {/* Collapse Button */}
        <div className="p-3 border-t border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="w-full justify-center"
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
