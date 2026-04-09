'use client';

import { useActionState, useRef } from 'react';
import { type ProfileSetupState, setupProfile } from './actions';

type ProfileFormProps = {
  suggestedName?: string;
  nameAlreadyTaken?: boolean;
};

export default function ProfileSetupForm({ suggestedName, nameAlreadyTaken }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState<ProfileSetupState, FormData>(setupProfile, null);
  const displayNameRef = useRef<HTMLInputElement>(null);

  const fieldError = state?.errors?.display_name;

  return (
    <div className='card w-full max-w-md bg-base-200 shadow-xl'>
      <div className='card-body gap-4'>
        <h1 className='card-title text-2xl'>Set Up Your Profile</h1>
        <p className='text-base-content/70'>Choose a display name to get started. You can change it later.</p>

        {nameAlreadyTaken && (
          <div role='alert' className='alert alert-warning'>
            <span>The display name &quot;{suggestedName}&quot; is already taken. Please choose a different one.</span>
          </div>
        )}

        {state?.error && (
          <div role='alert' className='alert alert-error'>
            <span>{state.error}</span>
          </div>
        )}

        <form action={formAction} className='flex flex-col gap-4'>
          <fieldset className='fieldset'>
            <label className='label' htmlFor='display_name'>
              Display Name
            </label>
            <input
              ref={displayNameRef}
              id='display_name'
              name='display_name'
              type='text'
              placeholder='Your display name'
              defaultValue={suggestedName}
              className={`input input-bordered w-full ${fieldError ? 'input-error' : ''}`}
              required
              minLength={2}
              maxLength={50}
            />
            {fieldError && <p className='label text-error'>{fieldError}</p>}
          </fieldset>

          <button type='submit' className='btn btn-primary w-full' disabled={pending}>
            {pending ? <span className='loading loading-spinner loading-sm' /> : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
