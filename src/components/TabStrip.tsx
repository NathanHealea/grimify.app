'use client';

export type TabId = 'filters' | 'paints';

interface TabStripProps {
  activeTab: TabId | null;
  onTabClick: (tab: TabId) => void;
  ownedCount: number;
}

const tabs: { id: TabId; label: string }[] = [
  { id: 'filters', label: 'Filters' },
  { id: 'paints', label: 'Paints' },
];

export default function TabStrip({ activeTab, onTabClick, ownedCount }: TabStripProps) {
  return (
    <div className='flex flex-col border-r border-base-300 bg-base-200'>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`relative flex h-28 w-8 items-center justify-center border-b border-base-300 text-xs font-semibold uppercase tracking-wider transition-colors md:w-10 ${
            activeTab === tab.id ? 'bg-base-100 text-base-content' : 'text-base-content/40 hover:text-base-content/70'
          }`}
          onClick={() => onTabClick(tab.id)}
          aria-label={`${tab.label} panel`}>
          <span style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}>{tab.label}</span>
          {tab.id === 'paints' && ownedCount > 0 && (
            <span className='absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-success text-[8px] font-bold text-success-content'>
              {ownedCount > 99 ? '99' : ownedCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
