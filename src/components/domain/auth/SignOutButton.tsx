import { getAuth } from "~/lib/firebase";

type Props = {};

export const SignOutButton = (props: Props) => {
  const handleClick = () => {
    const auth = getAuth();
    auth.signOut();
  };

  return (
    <button
      onClick={handleClick}
      type="button"
      className="btn btn-ghost "
    >
      Sign Out
    </button>
  );
};
