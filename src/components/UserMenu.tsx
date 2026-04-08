'use client'

import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { UserCircleIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'

interface UserMenuProps {
  displayName: string
  avatarUrl?: string | null
  signOutAction: () => Promise<void>
  isAdmin?: boolean
}

export default function UserMenu({ displayName, avatarUrl, signOutAction, isAdmin }: UserMenuProps) {
  return (
    <Menu>
      <MenuButton className='btn btn-ghost btn-sm gap-2'>
        {avatarUrl ? (
          <Image src={avatarUrl} alt={displayName} width={24} height={24} className='size-6 rounded-full' />
        ) : (
          <UserCircleIcon className='size-6' />
        )}
        <span className='hidden sm:inline'>{displayName}</span>
      </MenuButton>

      <MenuItems
        anchor='bottom end'
        className='z-50 mt-2 w-48 rounded-box bg-base-200 p-2 shadow-lg ring-1 ring-base-300'>
        <MenuItem>
          <Link
            href='/profile'
            className={clsx('btn btn-ghost btn-sm btn-block justify-start', 'data-[focus]:bg-base-300')}>
            Profile
          </Link>
        </MenuItem>

        {isAdmin && (
          <MenuItem>
            <Link
              href='/admin'
              className={clsx('btn btn-ghost btn-sm btn-block justify-start', 'data-[focus]:bg-base-300')}>
              Admin
            </Link>
          </MenuItem>
        )}

        <div className='divider my-1' />

        <MenuItem>
          <form action={signOutAction}>
            <button
              type='submit'
              className={clsx('btn btn-ghost btn-sm btn-block justify-start', 'data-[focus]:bg-base-300')}>
              Sign Out
            </button>
          </form>
        </MenuItem>
      </MenuItems>
    </Menu>
  )
}
