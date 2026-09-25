import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useSiteContent } from "@/lib/site-content";
import { RegistrationModal } from "@/components/camp/RegistrationModal";

/**
 * Camp registration is opened from several places — the /programs banner and
 * the site-wide announcement bar — but there is only ever one modal, and no
 * route, so nothing breaks when no camp is running.
 */

type Ctx = { open: () => void; canRegister: boolean };

const CampRegistrationContext = createContext<Ctx>({ open: () => {}, canRegister: false });

export function useCampRegistration(): Ctx {
  return useContext(CampRegistrationContext);
}

export function CampRegistrationProvider({ children }: { children: ReactNode }) {
  const camp = useSiteContent().campWindow;
  const [open, setOpen] = useState(false);

  const canRegister = !!camp?.is_open && camp.registration_mode === "built_in";

  const value = useMemo<Ctx>(() => ({ open: () => setOpen(true), canRegister }), [canRegister]);

  const close = useCallback(() => setOpen(false), []);

  return (
    <CampRegistrationContext.Provider value={value}>
      {children}
      {canRegister && open ? <RegistrationModal onClose={close} /> : null}
    </CampRegistrationContext.Provider>
  );
}
