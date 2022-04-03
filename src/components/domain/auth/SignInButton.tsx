import { getAuth } from "~/lib/firebase";
import { signInAnonymously } from "firebase/auth";
import { useState } from "react";

const INPUT_ID = "wp-name-input";

export const SignInButton = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    const name = (document.getElementById(INPUT_ID) as HTMLInputElement).value.trim();
    if (name.length === 0) {
      // pass
    }

    setLoading(true);
    const res = await signInAnonymously(getAuth());
    console.log(res);
  };

  return (
    <>
      <input id={INPUT_ID} className="input input-bordered" placeholder="Enter your name!" />
      <button onClick={handleClick} type="button" className={`btn btn-primary  min-w-60 ${loading && "loading"}`}>
        {loading ? "Signing you in..." : "Sign In"}
      </button>
    </>
  );
};
