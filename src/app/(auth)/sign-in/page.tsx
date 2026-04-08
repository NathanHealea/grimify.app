'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { AuthState, signIn } from '../actions';

export default function SignInPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signIn, null);

  return (
    <div className='card w-full max-w-sm bg-base-200 shadow-xl'>
      <div className='card-body'>
        <h2 className='card-title'>Sign In</h2>

        {state?.error && (
          <div role='alert' className='alert alert-error'>
            <span>{state.error}</span>
          </div>
        )}

        <form action={formAction} className='flex flex-col gap-4'>
          <label className='form-control w-full'>
            <div className='label'>
              <span className='label-text'>Email</span>
            </div>
            <input
              type='email'
              name='email'
              placeholder='you@example.com'
              className='input input-bordered w-full'
              required
            />
          </label>

          <label className='form-control w-full'>
            <div className='label'>
              <span className='label-text'>Password</span>
            </div>
            <input
              type='password'
              name='password'
              placeholder='••••••••'
              className='input input-bordered w-full'
              required
            />
          </label>

          <button type='submit' className='btn btn-primary w-full' disabled={pending}>
            {pending ? <span className='loading loading-spinner' /> : 'Sign In'}
          </button>
        </form>

        <p className='text-center text-sm'>
          Don&apos;t have an account?{' '}
          <Link href='/sign-up' className='link link-primary'>
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
