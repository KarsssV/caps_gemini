import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/auth-context";

type AccountSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function AccountSettingsModal({ isOpen, onClose }: AccountSettingsModalProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  
  function handleLogout(){
    logout();
    router.push("/login");
  } 

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close account settings"
        className="fixed inset-0 z-40 cursor-default bg-transparent"
        onClick={onClose}
      />

      <div className="fixed bottom-24 left-8 z-50 w-54 rounded-lg border border-white/15 bg-[#286541] p-3 text-white shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
        <div className="mb-2 flex justify-end">
          <button type="button" onClick={onClose} className="text-xl leading-none text-white/90 hover:text-white">
            x
          </button>
        </div>

        <div className="mx-auto h-18 w-18 rounded-full bg-white/25" />

        <div className="mt-3 text-center">
          <p className="text-base font-semibold tracking-wide">{user?.username}</p>
          <p className="text-sm text-white/80">{user?.email}</p>
        </div>

        <div className="mt-3 space-y-2">
          <button
            type="button"
            className="h-8 w-full rounded-md border border-white/20 bg-white/20 text-sm text-white/90 transition hover:bg-white/30"
          >
            Edit Profile
          </button>
          <button
            type="button"
            className="h-8 w-full rounded-md border border-white/20 bg-white/20 text-sm font-medium text-white transition hover:bg-white/30"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>
    </>
  );
}
