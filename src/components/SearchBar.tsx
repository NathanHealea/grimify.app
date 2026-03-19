'use client'

import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface SearchBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onClear: () => void
}

export default function SearchBar({ searchQuery, onSearchChange, onClear }: SearchBarProps) {
  return (
    <label className='input input-sm w-full'>
      <MagnifyingGlassIcon className='size-4 opacity-50' />
      <input
        type='text'
        placeholder='Search paints...'
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      {searchQuery && (
        <button className='btn btn-circle btn-ghost btn-xs' onClick={onClear} aria-label='Clear search'>
          <XMarkIcon className='size-3' />
        </button>
      )}
    </label>
  )
}
