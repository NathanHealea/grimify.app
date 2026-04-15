'use client'

import { SearchIcon, X } from 'lucide-react';
import type { ChangeEvent, ComponentProps } from 'react';
import { useCallback, useState } from 'react';

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';

/**
 * A search input with a leading search icon and a clear button.
 *
 * Wraps {@link InputGroupInput} inside an {@link InputGroup} for a
 * consistent grouped-input look. Manages its own value state internally
 * and forwards `onChange` events to the caller when the value changes
 * or is cleared.
 *
 * @param props.placeholder - Placeholder text shown when the input is empty.
 * @param props - All remaining props are forwarded to the underlying `<input>`.
 */
export default function SearchInput({
  placeholder = 'Search paints by name, brand, or type...',
  onChange,
  value,
  defaultValue,
  ...rest
}: ComponentProps<'input'>) {
  const [searchValue, setSearchValue] = useState(value?.toString() ?? defaultValue?.toString() ?? '')

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setSearchValue(e.target.value)
      onChange?.(e)
    },
    [onChange]
  )

  const handleClear = useCallback(() => {
    setSearchValue('')
    if (onChange) {
      const syntheticEvent = {
        ...new Event('input', { bubbles: true }),
        target: { value: '' },
      } as unknown as ChangeEvent<HTMLInputElement>
      onChange(syntheticEvent)
    }
  }, [onChange])

  return (
    <InputGroup>
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput placeholder={placeholder} {...rest} value={searchValue} onChange={handleChange} />
      {searchValue && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton aria-label="Clear" title="Clear" size="icon-xs" onClick={handleClear}>
            <X />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  )
}
