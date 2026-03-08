'use client';

import { CloseButton, Dialog, DialogPanel } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

import { useIsDesktop } from '@/hooks/useIsDesktop';

import type { TabId } from './TabStrip';

interface SidePanelProps {
  isOpen: boolean;
  activeTab: TabId | null;
  onClose: () => void;
  onTabChange: (tab: TabId) => void;
  children: React.ReactNode;
}

export default function SidePanel({ isOpen, activeTab, onClose, onTabChange, children }: SidePanelProps) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <aside
        className={`flex-shrink-0 overflow-hidden border-r border-base-300 bg-base-200 transition-all duration-300 ${isOpen ? 'w-80' : 'w-0'}`}>
        <div className='flex h-full w-80 flex-col'>
          <div className='flex-1 overflow-y-auto p-4'>{children}</div>
        </div>
      </aside>
    );
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className='md:hidden'>
      <DialogPanel className='fixed inset-0 z-50 flex flex-col bg-base-200 transition duration-200 ease-out data-[closed]:opacity-0'>
        <div className='flex items-center gap-2 border-b border-base-300 px-4 py-3'>
          <CloseButton className='btn btn-ghost btn-sm' aria-label='Close menu'>
            <XMarkIcon className='size-5' />
          </CloseButton>
          <div className='flex gap-1'>
            <button
              className={`btn btn-sm ${activeTab === 'filters' ? 'btn-active' : 'btn-ghost'}`}
              onClick={() => onTabChange('filters')}>
              Filters
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'paints' ? 'btn-active' : 'btn-ghost'}`}
              onClick={() => onTabChange('paints')}>
              My Paints
            </button>
          </div>
        </div>

        <div className='flex-1 overflow-y-auto p-4'>{children}</div>

        <div className='border-t border-base-300 p-4'>
          <button className='btn btn-primary w-full' onClick={onClose}>
            Apply
          </button>
        </div>
      </DialogPanel>
    </Dialog>
  );
}
