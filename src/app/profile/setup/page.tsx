import { getAuthUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ProfileSetupForm from './profile-form';

export default async function ProfileSetupPage() {
  const auth = await getAuthUser();

  if (!auth) {
    redirect('/sign-in');
  }

  let suggestedName = '';
  let nameAlreadyTaken = false;

  const meta = auth.user.user_metadata;
  suggestedName = meta?.full_name ?? meta?.name ?? meta?.custom_username ?? '';

  if (suggestedName) {
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .ilike('display_name', suggestedName.trim())
      .single();

    nameAlreadyTaken = !!existing;
  }

  return (
    <div className='flex min-h-screen items-center justify-center'>
      <ProfileSetupForm suggestedName={suggestedName} nameAlreadyTaken={nameAlreadyTaken} />
    </div>
  );
}
