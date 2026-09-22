import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
import { useAppUpdate } from '@/hooks/useAppUpdate';

export function UpdateBanner() {
  const { updateAvailable, latestVersion, applyUpdate, dismissUpdate } = useAppUpdate();

  return (
    <AnimatePresence>
      {updateAvailable && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center bg-aryx-accent px-4 py-2 text-sm text-white shadow-lg"
        >
          <div className="flex items-center gap-3 max-w-xl">
            <RefreshCw className="w-4 h-4 flex-shrink-0 animate-spin-slow" />
            <span>
              A new version{latestVersion ? ` (v${latestVersion})` : ''} is available.
            </span>
            <button
              onClick={applyUpdate}
              className="px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 font-medium transition-colors whitespace-nowrap"
            >
              Refresh Now
            </button>
          </div>
          <button
            onClick={dismissUpdate}
            className="ml-4 p-1 rounded-lg hover:bg-white/20 transition-colors"
            aria-label="Dismiss update notification"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
