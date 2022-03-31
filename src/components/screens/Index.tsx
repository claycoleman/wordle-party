import { Dialog } from '@headlessui/react';
import { useRef, useState } from 'react';
import { SignInButton } from '~/components/domain/auth/SignInButton';
import { SignOutButton } from '~/components/domain/auth/SignOutButton';
import { Head } from '~/components/shared/Head';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getAuth } from '~/lib/firebase';
import { CreateGameButton } from '../domain/auth/CreateGameButton';
import { JoinGameButton } from '../domain/auth/JoinGameButton';

function Index() {
  const [user, loading, error] = useAuthState(getAuth());

  return (
    <>
      <Head title="Home" />
      <div className="hero min-h-screen">
        <div className="text-center hero-content">
          <div>
            <h1 className="text-3xl font-bold">Welcome to Wordle Party!</h1>
            <p className="mt-4 text-lg">
              Compete with your friends to see who guesses the word first (aka, in the fewest guesses).
            </p>
            <div className="mt-4 grid gap-2">
              {loading ? null : user == null ? (
                <SignInButton />
              ) : (
                <>
                  <CreateGameButton user={user} />
                  <JoinGameButton user={user} />
                  <SignOutButton />
                </>
              )}
              {error != null && <p>{error.message}</p>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Index;
