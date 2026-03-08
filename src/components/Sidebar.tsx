"use client";

import { CloseButton, Dialog, DialogPanel } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useSyncExternalStore } from "react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

const DESKTOP_MQ = "(min-width: 768px)";

function subscribeToMediaQuery(callback: () => void) {
  const mq = window.matchMedia(DESKTOP_MQ);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getIsDesktop() {
  return window.matchMedia(DESKTOP_MQ).matches;
}

export function useIsDesktop() {
  return useSyncExternalStore(subscribeToMediaQuery, getIsDesktop, () => false);
}

export default function Sidebar({ isOpen, onClose, children, title = 'Settings' }: SidebarProps) {
  const isDesktop = useIsDesktop();

  // Desktop: side-by-side flex panel
  if (isDesktop) {
    return (
      <aside
        className={`flex-shrink-0 overflow-hidden border-r border-base-300 bg-base-200 transition-all duration-300 ${isOpen ? "w-80" : "w-0"}`}
      >
        <div className="flex h-full w-80 flex-col">
          <div className="flex-1 overflow-y-auto p-4">{children}</div>
        </div>
      </aside>
    );
  }

  // Mobile: HeadlessUI Dialog overlay
  return (
    <Dialog open={isOpen} onClose={onClose} className="md:hidden">
      <DialogPanel className="fixed inset-0 z-50 flex flex-col bg-base-200 transition duration-200 ease-out data-[closed]:opacity-0">
        <div className="flex items-center border-b border-base-300 px-4 py-3">
          <CloseButton className="btn btn-ghost btn-sm" aria-label="Close menu">
            <XMarkIcon className="size-5" />
          </CloseButton>
          <span className="ml-2 text-sm font-semibold">{title}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4">{children}</div>

        <div className="border-t border-base-300 p-4">
          <button className="btn btn-primary w-full" onClick={onClose}>
            Apply
          </button>
        </div>
      </DialogPanel>
    </Dialog>
  );
}
