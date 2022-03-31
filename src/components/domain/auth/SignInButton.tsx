import { getAuth } from '~/lib/firebase';
import { useSignInWithGoogle } from 'react-firebase-hooks/auth';

export const SignInButton = () => {
  const [signInWithGoogle, , loading] = useSignInWithGoogle(getAuth());
  const handleClick = () => {
    signInWithGoogle();
  };

  return (
    <button
      onClick={handleClick}
      type="button"
      className={`btn btn-primary  min-w-60 ${loading && 'loading'}`}
    >
      {loading ? 'Signing you in...' : 'Sign In With Google'}
    </button>
  );
};
